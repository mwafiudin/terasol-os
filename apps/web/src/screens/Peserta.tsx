import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, PageHead } from '../components/ui';
import { api, type ParticipantDetail } from '../lib/api';
import { readParticipant } from '../lib/db';
import { CONV_LABEL, PARAM_LABEL, PARAMS, dec, fmtTanggal, fmtWaktu, imtOf, num, rp } from '../lib/domain';
import { db } from '../lib/db';
import { pesertaEvent, rekapSementara, type PesertaRingkas, type RekapSementara } from '../lib/pesertaEvent';
import { useApp } from '../lib/store';
import { isOnline } from '../lib/sync';
import type { ConvStatus, EventRow, ParamKey } from '../lib/types';

type Nav = (screen: string) => void;

/* ===================== Daftar peserta sebuah event ===================== */

export function EventPeserta({ go, event, onBuka, onTambah, reloadKey }: {
  go: Nav;
  event: EventRow;
  onBuka: (p: PesertaRingkas) => void;
  onTambah: () => void;
  reloadKey: number;
}) {
  const { key } = useApp();
  const [daftar, setDaftar] = useState<PesertaRingkas[] | null>(null);
  const [rekap, setRekap] = useState<RekapSementara | null>(null);

  const muat = useCallback(async () => {
    const d = await pesertaEvent(key, event);
    setDaftar(d);
    setRekap(await rekapSementara(event, d));
  }, [key, event]);

  useEffect(() => { void muat(); }, [muat, reloadKey]);

  const berlangsung = event.status === 'active';

  return (
    <div className="page">
      <PageHead title={event.nama} onBack={() => go('events')}
        right={berlangsung
          ? <Badge tone="success" dot>Berlangsung</Badge>
          : <Badge tone="sage">Selesai</Badge>} />

      <span className="recap-sub">
        <span>
          {fmtTanggal(event.tanggal)} · {event.lokasi} ·{' '}
          {event.tipe === 'berbayar' ? rp(event.hargaPaket) : 'Gratis'}
        </span>
      </span>

      {/* Rekap sementara — dihitung di perangkat supaya tetap tampil saat
          offline, termasuk peserta yang belum sempat terkirim. */}
      {rekap && (
        <div className="card consumable-card">
          <b>Rekap sementara</b>
          <div className="stat-grid">
            <div className="stat-card"><b>{rekap.peserta}</b><span>Peserta</span></div>
            <div className="stat-card"><b>{rekap.berminat}</b><span>Berminat</span></div>
            <div className="stat-card"><b>{rekap.tallyAnonim}</b><span>Tally anonim</span></div>
            <div className="stat-card"><b>{rekap.belumSync}</b><span>Belum tersync</span></div>
          </div>

          {rekap.paramTerpakai.length > 0 && (
            <>
              <div className="consumable-sep" />
              {rekap.paramTerpakai.map((p) => (
                <div className="consumable-row" key={p.param}>
                  <span>{PARAM_LABEL[p.param]}</span>
                  <span>{p.jumlah} peserta</span>
                </div>
              ))}
              <div className="consumable-total">
                <span>Estimasi consumable</span>
                {rekap.estimasiConsumable === null
                  ? <span className="belum">harga belum diatur</span>
                  : <span>{rp(rekap.estimasiConsumable)}</span>}
              </div>
            </>
          )}

          {rekap.perluDitinjau > 0 && (
            <div className="belum-note">
              {rekap.perluDitinjau} record menunggu peninjauan dan belum ikut
              dihitung. Selesaikan dari Beranda → record perlu ditinjau.
            </div>
          )}
          <small>
            Angka sementara dari perangkat ini. Rekap resmi dihitung server
            setelah semua data tersinkron.
          </small>
        </div>
      )}

      {berlangsung && (
        <Button size="lg" full icon={ICONS.userPlus} onClick={onTambah}>
          Tambah peserta baru
        </Button>
      )}

      <span className="section-title">
        Daftar peserta{daftar ? ` (${daftar.length})` : ''}
      </span>

      {daftar === null && <span className="hint">Memuat…</span>}

      {daftar?.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.users} size={26} /></div>
          <b>Belum ada peserta</b>
          <p>
            {berlangsung
              ? 'Ketuk "Tambah peserta baru" untuk mulai mencatat.'
              : 'Event ini selesai tanpa peserta tercatat.'}
          </p>
        </div>
      )}

      {daftar?.map((p) => {
        const conv = CONV_LABEL[p.convStatus ?? 'baru']!;
        return (
          <button key={p.clientId} className="card peserta-card" onClick={() => onBuka(p)}>
            <div className="peserta-atas">
              <span className="peserta-nama">
                {p.nama}{p.usia ? `, ${p.usia} th` : ''}
              </span>
              {p.belumSync && <Badge tone="warning">Antre</Badge>}
              {p.needsReview && <Badge tone="danger">Ditinjau</Badge>}
            </div>
            <span className="peserta-meta">
              {p.imt != null ? `IMT ${dec(p.imt)}` : 'IMT belum ada'}
              {' · '}{p.paramsDiambil.length} dari {PARAMS.length} parameter
            </span>
            {p.berminat && <Badge tone={conv.tone}>{conv.label}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ======================== Rekap satu peserta ======================== */

type DetailLokal = {
  nama: string; gender: 'P' | 'L'; usia: string; hp: string;
  consent: { granted: boolean; versiTeks: string; ts: string } | null;
  nilai: Partial<Record<ParamKey, string>>;
  imt: { nilai: number; kategori: string } | null;
  measuredAt: string | null;
  belumSync: boolean;
};

export function PesertaDetail({ go, peserta, onUbah }: {
  go: Nav; peserta: PesertaRingkas; onUbah: () => void;
}) {
  const { key, user, say } = useApp();
  const [server, setServer] = useState<ParticipantDetail | null>(null);
  const [lokal, setLokal] = useState<DetailLokal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [beliBuka, setBeliBuka] = useState(false);
  const [nilai, setNilai] = useState('');
  const [produk, setProduk] = useState('');
  const koordinator = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  const muat = useCallback(async () => {
    setError(null);
    // Peserta yang belum tersinkron hanya ada di perangkat ini.
    if (peserta.serverId && isOnline()) {
      try { setServer(await api.participantDetail(peserta.serverId)); return; }
      catch { setError('Gagal memuat dari server — menampilkan data perangkat.'); }
    }
    const baris = await db.participants.get(peserta.clientId);
    if (!baris) { setError('Data peserta tidak ada di perangkat ini.'); return; }
    const view = await readParticipant(key, baris);
    if (!view.secret) { setError('Identitas sudah dibersihkan dari perangkat sesuai retensi.'); return; }
    const s = view.secret;
    setLokal({
      nama: s.nama, gender: s.gender, usia: s.usia, hp: s.hp,
      consent: s.consent,
      nilai: s.screening?.values ?? {},
      imt: imtOf(s.screening?.values ?? {}),
      measuredAt: s.screening?.measuredAt ?? null,
      belumSync: baris.synced === 0,
    });
  }, [peserta, key]);

  useEffect(() => { void muat(); }, [muat]);

  async function setStatus(status: ConvStatus, nilaiTransaksi = 0, produkNama: string | null = null) {
    if (!peserta.serverId) { say('Peserta ini belum tersinkron — sync dulu.'); return; }
    setBusy(true);
    try {
      await api.setConversion(peserta.serverId, { status, nilaiTransaksi, produk: produkNama });
      say(status === 'membeli' ? 'Konversi tercatat.' : 'Status diperbarui.');
      setBeliBuka(false);
      onUbah();
      await muat();
    } catch {
      say('Gagal memperbarui status. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  const nama = server?.nama ?? lokal?.nama ?? peserta.nama;
  const usia = server ? String(server.usia) : lokal?.usia ?? peserta.usia;
  const gender = server?.gender ?? lokal?.gender ?? peserta.gender;
  const hp = server?.hp ?? lokal?.hp ?? peserta.hp;
  const consent = server?.consent ?? lokal?.consent ?? null;
  const conv = server?.conversion ?? null;
  const status = conv?.status ?? peserta.convStatus ?? 'baru';
  const label = CONV_LABEL[status]!;

  // Nilai pengukuran: dari server bila ada, kalau tidak dari perangkat.
  const barisNilai = PARAMS.map((p) => {
    let v: string | null = null;
    if (server?.screening) {
      const s = server.screening;
      const peta: Record<ParamKey, number | null> = {
        tinggi: s.tinggi, berat: s.berat, sistolik: s.sistolik, diastolik: s.diastolik,
        gula: s.gula, kolesterol: s.kolesterol, asam_urat: s.asamUrat,
      };
      v = peta[p.k] == null ? null : dec(peta[p.k]!);
    } else if (lokal) {
      const raw = lokal.nilai[p.k];
      v = raw ? String(raw) : null;
    }
    return { ...p, nilai: v };
  });

  const imtNilai = server?.screening?.imt ?? lokal?.imt?.nilai ?? null;
  const imtKategori = imtNilai == null ? null
    : imtNilai < 18.5 ? 'Kurang' : imtNilai < 25 ? 'Normal' : imtNilai < 30 ? 'Berlebih' : 'Obesitas';

  return (
    <div className="page">
      <PageHead title={nama} onBack={() => go('eventPeserta')}
        right={peserta.belumSync ? <Badge tone="warning">Antre</Badge> : undefined} />

      <span className="recap-sub">
        <span>
          {usia ? `${usia} th · ` : ''}{gender === 'P' ? 'Perempuan' : 'Laki-laki'}
          {hp ? ` · ${hp}` : ''}
        </span>
      </span>

      {error && <div className="belum-note">{error}</div>}

      <div className="card consumable-card">
        <b>Persetujuan</b>
        {consent ? (
          <>
            <div className="consumable-row">
              <span>Status</span>
              <span className={consent.granted ? '' : 'belum'}>
                {consent.granted ? 'Setuju' : 'Menolak'}
              </span>
            </div>
            <div className="consumable-row"><span>Versi teks</span><span>{consent.versiTeks}</span></div>
            <div className="consumable-row"><span>Direkam</span><span>{fmtWaktu(consent.ts)}</span></div>
          </>
        ) : <small>Belum ada record persetujuan.</small>}
      </div>

      <div className="card consumable-card">
        <b>Hasil pengukuran</b>
        {barisNilai.map((p) => (
          <div className="consumable-row" key={p.k}>
            <span>{p.label}</span>
            {p.nilai
              ? <span>{p.nilai} {p.unit}</span>
              : <span className="muted">tidak diambil</span>}
          </div>
        ))}
        <div className="consumable-sep" />
        <div className="consumable-total">
          <span>IMT</span>
          {imtNilai == null
            ? <span className="muted">belum bisa dihitung</span>
            : <span>{dec(imtNilai)} — {imtKategori}</span>}
        </div>
        {(server?.screening?.measuredAt ?? lokal?.measuredAt) && (
          <small>Diukur {fmtWaktu(server?.screening?.measuredAt ?? lokal?.measuredAt)}</small>
        )}
        {server?.screening?.outOfRange && (
          <div className="belum-note">
            Ada nilai di luar rentang wajar yang dikonfirmasi petugas saat pencatatan.
          </div>
        )}
      </div>

      <div className="card consumable-card">
        <b>Tindak lanjut</b>
        <div className="consumable-row">
          <span>Status</span><Badge tone={label.tone}>{label.label}</Badge>
        </div>
        {conv?.status === 'membeli' && (
          <>
            <div className="consumable-row"><span>Produk</span><span>{conv.produk}</span></div>
            <div className="consumable-row"><span>Nilai transaksi</span><span>{rp(conv.nilaiTransaksi)}</span></div>
          </>
        )}
        {conv?.updatedAt && <small>Diperbarui {fmtWaktu(conv.updatedAt)}</small>}

        {!koordinator && <small>Perubahan status hanya bisa dilakukan Koordinator.</small>}

        {koordinator && !peserta.serverId && (
          <small>Peserta ini belum tersinkron. Sync dulu sebelum status bisa diubah.</small>
        )}

        {koordinator && peserta.serverId && !beliBuka && (
          <div className="warn-aksi">
            <Button variant="secondary" size="sm" disabled={busy}
              onClick={() => void setStatus('dihubungi')}>Sudah dihubungi</Button>
            <Button size="sm" disabled={busy} onClick={() => setBeliBuka(true)}>Membeli</Button>
            <button className="link-btn sm" disabled={busy}
              onClick={() => void setStatus('batal')}>Tidak jadi</button>
          </div>
        )}

        {koordinator && peserta.serverId && beliBuka && (
          <>
            <Field label="Nilai transaksi" htmlFor="d-nilai">
              <input id="d-nilai" className="input" inputMode="numeric" value={nilai}
                onChange={(e) => setNilai(e.target.value.replace(/\D/g, ''))} placeholder="cth. 1400000" />
            </Field>
            <Field label="Produk yang dibeli" htmlFor="d-produk">
              <input id="d-produk" className="input" value={produk}
                onChange={(e) => setProduk(e.target.value)} placeholder="cth. Paket herbal sendi" />
            </Field>
            <Button full disabled={busy || !nilai || !produk.trim()} icon={ICONS.check}
              onClick={() => void setStatus('membeli', Number(nilai), produk.trim())}>
              Simpan pembelian
            </Button>
            <button className="link-btn" onClick={() => setBeliBuka(false)}>Batal</button>
          </>
        )}
      </div>
    </div>
  );
}

export { num };
