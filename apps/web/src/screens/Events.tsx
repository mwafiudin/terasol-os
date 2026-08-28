import { useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Field, Icon, ICONS, InputRupiah, PageHead, Paginasi, usePaginasi,
} from '../components/ui';
import { api, type Recap as RecapData } from '../lib/api';
import { PARAM_LABEL, ROLE_LABEL, bisaTerimaPeserta, fmtTanggal, pct, rp, statusTampil } from '../lib/domain';
import {
  localEvents, muatRekan, pullEvents, rekanTersimpan, saveLocalEvent, ubahLocalEvent,
  type Rekan,
} from '../lib/events';
import { useApp } from '../lib/store';
import { isOnline, refreshPending, syncNow } from '../lib/sync';
import type { EventRow } from '../lib/types';

type Nav = (screen: string) => void;

/* ============================ Daftar event ============================ */

export function Events({ go, onOpenRecap, onOpenPeserta, reloadKey }: {
  go: Nav;
  onOpenRecap: (ev: EventRow) => void;
  onOpenPeserta: (ev: EventRow) => void;
  reloadKey: number;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);

  const load = useCallback(async () => {
    try { await pullEvents(); } catch { /* offline */ }
    setEvents(await localEvents());
  }, []);
  useEffect(() => { void load(); }, [load, reloadKey]);

  // Daftar event menumpuk seiring waktu dan tidak pernah menyusut sendiri —
  // event lama diarsipkan, bukan dihapus.
  const halaman = usePaginasi(events, 10);

  return (
    <div className="page page-home">
      <div className="events-head">
        <b>Event</b>
        <Button size="sm" variant="secondary" icon={ICONS.plus} onClick={() => go('eventForm')}>
          Buat event
        </Button>
      </div>

      {events.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.calPlus} size={26} /></div>
          <b>Belum ada event</b>
          <p>Buat event dulu agar petugas punya wadah untuk mencatat peserta.</p>
        </div>
      )}

      {halaman.potong.map((ev) => {
        const st = statusTampil(ev);
        const badge = <Badge tone={st.tone} dot={st.hariIni}>{st.label}</Badge>;
        // Event yang masih menerima peserta dibuka ke daftar pesertanya — itu
        // tempat kerja petugas. Event yang sudah berakhir langsung ke rekapnya.
        const berlangsung = bisaTerimaPeserta(ev.status);
        return (
          <button key={ev.clientId} className="card event-card"
            onClick={() => (berlangsung ? onOpenPeserta(ev) : ev.serverId ? onOpenRecap(ev) : onOpenPeserta(ev))}>
            <div className="top">
              {badge}
              <span>{ev.tipe === 'berbayar' ? `Berbayar · ${rp(ev.hargaPaket)}` : 'Gratis'}</span>
            </div>
            <span className="name">{ev.nama}</span>
            <span className="meta">
              {fmtTanggal(ev.tanggal)} · {ev.lokasi}
              {ev.synced === 0 ? ' · menunggu sync' : ` · ${ev.peserta} peserta`}
              {berlangsung ? ' · lihat peserta' : ' · lihat rekap'}
            </span>
          </button>
        );
      })}

      <Paginasi {...halaman} satuan="event" onPindah={halaman.setHal} />
    </div>
  );
}

/* ============================ Buat event ============================ */

/**
 * Membuat ATAU menyunting event.
 *
 * Satu form untuk keduanya, bukan dua yang harus dijaga tetap serupa: isian,
 * pemeriksaan, dan pemilih petugasnya persis sama, dan yang berbeda hanya ke
 * mana hasilnya ditulis.
 */
export function EventForm({ go, onSaved, awal }: {
  go: Nav; onSaved: () => void; awal?: EventRow | null;
}) {
  const { key, say } = useApp();
  const [f, setF] = useState({
    nama: awal?.nama ?? '',
    lokasi: awal?.lokasi ?? '',
    tanggal: awal?.tanggal ?? new Date().toISOString().slice(0, 10),
    tipe: (awal?.tipe ?? 'gratis') as 'gratis' | 'berbayar',
    hargaPaket: awal?.hargaPaket ? String(awal.hargaPaket) : '',
  });
  const [rekan, setRekan] = useState<Rekan[]>(rekanTersimpan);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set(awal?.petugasIds ?? []));
  const [busy, setBusy] = useState(false);

  useEffect(() => { void muatRekan().then(setRekan); }, []);

  async function simpan() {
    if (!f.nama || !f.lokasi) { say('Lengkapi nama event dan lokasi.'); return; }
    const harga = Number(f.hargaPaket.replace(/\D/g, '')) || 0;
    if (f.tipe === 'berbayar' && harga <= 0) { say('Event berbayar harus punya harga paket.'); return; }

    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const ids = [...terpilih];
      // Nama ikut disimpan sebagai teks agar event tetap terbaca utuh saat
      // offline, sebelum penugasan sempat dikirim ke server.
      const namaPetugas = rekan.filter((r) => terpilih.has(r.id)).map((r) => r.nama).join(', ');

      if (awal) {
        await ubahLocalEvent(awal.clientId, {
          nama: f.nama, lokasi: f.lokasi, tanggal: f.tanggal,
          tipe: f.tipe, hargaPaket: harga,
          petugas: namaPetugas || null, petugasIds: ids,
        });
        say('Perubahan event tersimpan dan masuk antrean sync.');
      } else {
        await saveLocalEvent({
          clientId: crypto.randomUUID(),
          nama: f.nama, lokasi: f.lokasi, tanggal: f.tanggal,
          tipe: f.tipe, hargaPaket: harga,
          petugas: namaPetugas || null, petugasIds: ids,
          status: f.tanggal > today ? 'planned' : 'active',
        });
        say('Event tersimpan dan masuk antrean sync.');
      }
      await refreshPending();
      void syncNow(key, { silent: true }).catch(() => {});
      onSaved();
      go('events');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHead title={awal ? 'Ubah event' : 'Buat event'} onBack={() => go(awal ? 'events' : 'home')}
        right={<Badge tone="accent">Koordinator</Badge>} />

      <Field label="Nama event" htmlFor="e-nama">
        <input id="e-nama" className="input" value={f.nama}
          onChange={(e) => setF({ ...f, nama: e.target.value })}
          placeholder="cth. Screening Bazar RW 04" />
      </Field>
      <Field label="Lokasi" htmlFor="e-lokasi">
        <input id="e-lokasi" className="input" value={f.lokasi}
          onChange={(e) => setF({ ...f, lokasi: e.target.value })}
          placeholder="cth. Balai RW 04, Menteng" />
      </Field>
      <Field label="Tanggal" htmlFor="e-tanggal">
        <input id="e-tanggal" className="input" type="date" value={f.tanggal}
          onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
      </Field>

      <div className="field">
        <label>Jenis</label>
        <div className="pill-row">
          <button className={`pill-choice ${f.tipe === 'gratis' ? 'on' : ''}`}
            onClick={() => setF({ ...f, tipe: 'gratis' })}>Gratis</button>
          <button className={`pill-choice ${f.tipe === 'berbayar' ? 'on' : ''}`}
            onClick={() => setF({ ...f, tipe: 'berbayar' })}>Berbayar</button>
        </div>
      </div>

      {f.tipe === 'berbayar' && (
        <Field label="Harga paket" htmlFor="e-harga">
          <InputRupiah id="e-harga" value={f.hargaPaket}
            onChange={(v) => setF({ ...f, hargaPaket: v })} placeholder="35.000" />
        </Field>
      )}

      <div className="field">
        <label>Petugas yang ditugaskan</label>
        {rekan.length === 0 ? (
          <small className="field-bantu">
            Daftar petugas belum bisa dimuat. Event tetap bisa disimpan, dan
            penugasan dapat dilengkapi nanti setelah ada koneksi.
          </small>
        ) : (
          <div className="pilih-orang">
            {rekan.map((r) => (
              <label key={r.id} className={`orang ${terpilih.has(r.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={terpilih.has(r.id)}
                  onChange={() => setTerpilih((s) => {
                    const n = new Set(s);
                    if (n.has(r.id)) n.delete(r.id); else n.add(r.id);
                    return n;
                  })} />
                <span className="orang-nama">{r.nama}</span>
                <span className="orang-role">{ROLE_LABEL[r.role] ?? r.role}</span>
              </label>
            ))}
          </div>
        )}
        <small className="field-bantu">
          Petugas yang dipilih di sini terhubung ke akunnya, sehingga setiap
          hasil pengukuran bisa ditelusuri ke orang yang benar-benar mengukur.
        </small>
      </div>

      <Button size="lg" full icon={ICONS.check} disabled={busy} onClick={() => void simpan()}>
        Simpan event
      </Button>
      <span className="hint">
        Event dibuat saat offline ikut antrean sync. Event yang sudah punya
        peserta hanya bisa diarsipkan.
      </span>
    </div>
  );
}

/* ============================== Rekap ============================== */

export function Recap({ go, event, onArchived, onOpenPeserta }: {
  go: Nav; event: EventRow; onArchived: () => void; onOpenPeserta: () => void;
}) {
  const { say, user } = useApp();
  const [data, setData] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [konfirmArsip, setKonfirmArsip] = useState(false);
  const [busy, setBusy] = useState(false);
  const koordinator = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  async function arsipkan() {
    if (!event.serverId) return;
    setBusy(true);
    try {
      await api.archiveEvent(event.serverId);
      say(`Event "${event.nama}" diarsipkan. Data pesertanya tetap tersimpan.`);
      onArchived();
      go('events');
    } catch {
      say('Gagal mengarsipkan event. Periksa koneksi.');
    } finally {
      setBusy(false);
      setKonfirmArsip(false);
    }
  }

  useEffect(() => {
    if (!event.serverId) { setError('Event ini belum tersinkron ke server.'); return; }
    if (!isOnline()) { setError('Rekap dihitung di server — butuh koneksi.'); return; }
    api.recap(event.serverId).then(setData).catch(() => setError('Gagal memuat rekap.'));
  }, [event.serverId]);

  async function unduh() {
    if (!event.serverId) return;
    try {
      const blob = await api.exportCsv(event.serverId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-rekap.csv`;
      a.click();
      URL.revokeObjectURL(url);
      say('CSV terunduh.');
    } catch {
      say('Gagal mengunduh CSV.');
    }
  }

  return (
    <div className="page">
      <PageHead title="Rekap event" onBack={() => go('events')} right={<Badge tone="accent">Koordinator</Badge>} />

      <div className="recap-sub">
        <b>{event.nama}</b>
        <span>
          {fmtTanggal(event.tanggal)} · {event.tipe === 'berbayar' ? `Berbayar ${rp(event.hargaPaket)}` : 'Gratis'}
          {event.petugas ? ` · ${event.petugas}` : ''}
        </span>
      </div>

      {error && <div className="range-warn">{error}</div>}
      {!data && !error && <div className="hint">Memuat rekap…</div>}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><b>{data.peserta}</b><span>Peserta</span></div>
            <div className="stat-card"><b>{data.berminat}</b><span>Berminat</span></div>
            <div className="stat-card"><b>{data.membeli}</b><span>Membeli</span></div>
            <div className="stat-card"><b>{pct(data.rasioKonversi)}</b><span>Rasio konversi</span></div>
          </div>

          <div className="card sales-card">
            <svg className="deco" viewBox="0 0 150 150" fill="none" aria-hidden="true">
              <circle cx="75" cy="75" r="55" stroke="rgba(18,84,90,.08)" strokeWidth="7"
                strokeLinecap="round" strokeDasharray="300 45" transform="rotate(-50 75 75)" />
              <circle cx="38" cy="104" r="5" fill="rgba(204,156,72,.45)" />
            </svg>
            <div className="rule" />
            <span className="lbl">Pendapatan total</span>
            <span className="amount">{rp(data.pendapatanTotal)}</span>
            <div className="breakdown">
              <div className="breakdown-row">
                <span>Penjualan produk</span>
                <span>{rp(data.penjualan)}</span>
              </div>
              <div className="breakdown-sub">
                {data.membeli} transaksi
                {data.membeli > 0 && ` · rata-rata ${rp(data.rataRataTransaksi)}`}
              </div>
              {data.event.tipe === 'berbayar' && (
                <>
                  <div className="breakdown-row">
                    <span>Biaya screening</span>
                    <span>{rp(data.pendapatanEvent)}</span>
                  </div>
                  <div className="breakdown-sub">
                    {data.peserta + data.tallyAnonim} peserta dilayani × {rp(data.event.hargaPaket)}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card consumable-card">
            <b>Parameter &amp; consumable terpakai</b>
            {data.consumable.filter((c) => c.jumlah > 0).map((c) => (
              <div className="consumable-row" key={c.param}>
                <span>
                  {PARAM_LABEL[c.param]} — {c.jumlah}{c.pakaiStrip ? ' strip' : ' peserta'}
                </span>
                {!c.pakaiStrip
                  ? <span className="muted">—</span>
                  : c.hargaSatuan === null
                    ? <span className="belum">harga belum diatur</span>
                    : <span>{rp(c.biaya ?? 0)}</span>}
              </div>
            ))}
            <div className="consumable-sep" />
            <div className="consumable-total">
              <span>Estimasi total</span><span>{rp(data.estimasiConsumable)}</span>
            </div>

            {data.hargaBelumDiatur.length > 0 && (
              <div className="belum-note">
                Estimasi ini belum lengkap: harga{' '}
                {data.hargaBelumDiatur.map((p) => PARAM_LABEL[p].toLowerCase()).join(', ')}
                {' '}belum diatur. Isi di Pengaturan → Biaya agar hitungannya benar.
              </div>
            )}

            <small>
              Persetujuan: {data.consentSetuju} setuju · {data.tallyAnonim} tally anonim
              {data.perluDitinjau > 0 && ` · ${data.perluDitinjau} record menunggu peninjauan`}
            </small>
          </div>

          <Button variant="secondary" full icon={ICONS.users} onClick={onOpenPeserta}>
            Lihat daftar peserta
          </Button>

          <Button variant="secondary" full icon={ICONS.download} onClick={() => void unduh()}>
            Unduh CSV
          </Button>

          {/* US-01 — event yang sudah punya peserta tidak bisa dihapus, hanya diarsipkan. */}
          {koordinator && event.status !== 'archived' && (
            konfirmArsip
              ? (
                <div className="dedup-card">
                  <b>Arsipkan "{event.nama}"?</b>
                  <p>
                    Event hilang dari daftar aktif, tapi {data.peserta} record peserta
                    dan rekapnya tetap tersimpan. Event yang sudah punya peserta memang
                    tidak bisa dihapus — hanya diarsipkan.
                  </p>
                  <div className="row">
                    <Button variant="secondary" size="sm" onClick={() => setKonfirmArsip(false)}>
                      Batal
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void arsipkan()}>
                      Ya, arsipkan
                    </Button>
                  </div>
                </div>
              )
              : (
                <Button variant="ghost" full icon={ICONS.archive}
                  onClick={() => setKonfirmArsip(true)}>
                  Arsipkan event
                </Button>
              )
          )}
        </>
      )}
    </div>
  );
}
