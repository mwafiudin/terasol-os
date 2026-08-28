import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Icon, ICONS } from '../components/ui';
import { api, type ServerParticipant } from '../lib/api';
import { getMeta, setMeta } from '../lib/db';
import { CONV_LABEL, fmtSejak, fmtTanggal, rp, statusTampil, usiaTampil } from '../lib/domain';
import { ALASAN_TERTUTUP, modeSyncDari, pintuTertutup } from '../lib/modeSync';
import { activeEvent, countsFor, eventHariIni, pullEvents, type EventCounts } from '../lib/events';
import { useInstall } from '../lib/install';
import { useApp } from '../lib/store';
import {
  isOnline, isSimulatedOffline, MAX_UNSYNCED, setSimulatedOffline,
  subscribeSync, syncNow, type SyncState,
} from '../lib/sync';
import type { EventRow } from '../lib/types';

type Props = {
  go: (screen: string) => void;
  onFollowUp: (p: ServerParticipant) => void;
  /**
   * Mendaftarkan peserta ke event TERTENTU.
   *
   * Wajib membawa event-nya: sejak kartu bisa digeser, "event yang sedang
   * dilihat" tidak lagi sama dengan "event pertama hari ini", dan menebaknya
   * di tempat lain akan menaruh peserta di event yang salah.
   */
  onDaftar: (ev: EventRow) => void;
  reloadKey: number;
};

/**
 * Peringatan ketahanan data (mitigasi R1), diringkas jadi satu kartu.
 *
 * Sebelumnya dua kartu terbuka penuh dan mendorong tombol "Registrasi peserta
 * baru" keluar layar — peringatan yang menghalangi pekerjaan justru berakhir
 * diabaikan. Sekarang: satu baris ringkas, ketuk untuk detail.
 *
 * Bisa disembunyikan, tapi pilihan itu dilupakan begitu masalahnya bertambah —
 * risiko baru berhak diberitahukan sekali lagi, bukan ikut terbungkam.
 */
function PeringatanKetahanan({ storagePersisted, install, say }: {
  storagePersisted: boolean | null;
  install: ReturnType<typeof useInstall>;
  say: (m: string) => void;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [disembunyikanPada, setDisembunyikanPada] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    void getMeta<number>('peringatanKetahananDisembunyikan')
      .then((v) => setDisembunyikanPada(v ?? null));
  }, []);

  const masalah: { judul: string; isi: string; ikon: typeof ICONS.alert }[] = [];
  if (storagePersisted === false) {
    masalah.push({
      judul: 'Penyimpanan permanen ditolak',
      isi: 'Browser belum menjamin data bertahan. Sebaiknya sync sesering mungkin.',
      ikon: ICONS.alert,
    });
  }
  if (!install.standalone) {
    masalah.push({
      judul: 'Belum dipasang ke layar utama',
      isi: install.dapatDipasang
        ? 'Dibuka lewat tab browser, data lapangan lebih rentan terhapus sendiri.'
        : 'Dibuka lewat tab browser, data lapangan lebih rentan terhapus sendiri. Buka menu browser lalu pilih "Tambahkan ke layar utama".',
      ikon: ICONS.download,
    });
  }

  // undefined = masih memuat; jangan berkedip.
  if (disembunyikanPada === undefined || masalah.length === 0) return null;
  // Sembunyikan hanya berlaku selama jumlah masalahnya tidak bertambah.
  if (disembunyikanPada !== null && masalah.length <= disembunyikanPada) return null;

  return (
    <div className={`warn-card ringkas ${terbuka ? 'terbuka' : ''}`}>
      <button className="warn-ringkas" onClick={() => setTerbuka(!terbuka)}
        aria-expanded={terbuka}>
        <span className="ic"><Icon d={ICONS.alert} size={18} /></span>
        {/* Ringkas supaya tetap utuh di layar 320px — rinciannya ada saat
            dibuka. Judul yang terpotong ellipsis justru kehilangan maknanya. */}
        <span className="warn-judul">Risiko kehilangan data</span>
        {masalah.length > 1 && <span className="warn-jumlah">{masalah.length}</span>}
        <span className={`warn-chev ${terbuka ? 'putar' : ''}`}>
          <Icon d={ICONS.chevR} size={18} />
        </span>
      </button>

      {terbuka && (
        <div className="warn-detail">
          {masalah.map((m) => (
            <div className="warn-item" key={m.judul}>
              <Icon d={m.ikon} size={17} />
              <div>
                <b>{m.judul}</b>
                <span>{m.isi}</span>
              </div>
            </div>
          ))}
          <div className="warn-aksi">
            {install.dapatDipasang && (
              <Button size="sm" onClick={() => void install.pasang().then((h) => {
                if (h === 'accepted') say('Aplikasi dipasang ke layar utama.');
              })}>Pasang sekarang</Button>
            )}
            <button className="link-btn sm" onClick={() => {
              void setMeta('peringatanKetahananDisembunyikan', masalah.length);
              setDisembunyikanPada(masalah.length);
              say('Peringatan disembunyikan. Muncul lagi bila ada masalah baru.');
            }}>Sembunyikan</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Home({ go, onFollowUp, onDaftar, reloadKey }: Props) {
  const { user, key, say, storagePersisted } = useApp();
  const install = useInstall();
  /**
   * Event yang ditawarkan di kartu utama.
   *
   * Bisa lebih dari satu: satu hari boleh punya beberapa event, dan sebelumnya
   * hanya satu yang pernah terlihat — yang lain hanya bisa dicapai lewat tab
   * Event tanpa petunjuk bahwa ia ada.
   */
  const [daftarEv, setDaftarEv] = useState<EventRow[]>([]);
  const [pilih, setPilih] = useState(0);
  const [counts, setCounts] = useState<Record<string, EventCounts>>({});
  const [sync, setSync] = useState<SyncState | null>(null);
  const [followUps, setFollowUps] = useState<ServerParticipant[]>([]);
  const [conflicts, setConflicts] = useState(0);
  const [offlineSim, setOfflineSim] = useState(isSimulatedOffline());

  useEffect(() => subscribeSync(setSync), []);

  const load = useCallback(async () => {
    try { await pullEvents(); } catch { /* offline: pakai data lokal */ }
    // Hari ini lebih dulu. Kalau tidak ada satu pun hari ini, jatuh ke event
    // terdekat supaya kartunya tidak kosong tanpa sebab.
    const hariIniSaja = await eventHariIni();
    const daftar = hariIniSaja.length ? hariIniSaja : [await activeEvent()].filter((x): x is EventRow => !!x);
    setDaftarEv(daftar);
    setPilih((i) => Math.min(i, Math.max(0, daftar.length - 1)));
    const isi: Record<string, EventCounts> = {};
    for (const e of daftar) isi[e.clientId] = await countsFor(e);
    setCounts(isi);

    if (isOnline()) {
      try {
        const [p, c] = await Promise.all([api.participants({ berminat: true }), api.conflicts()]);
        setFollowUps(
          p.participants
            .filter((x) => x.convStatus !== 'membeli' && x.convStatus !== 'batal')
            .slice(0, 3),
        );
        setConflicts(c.conflicts.length);
      } catch { /* daftar tindak lanjut butuh jaringan — biarkan kosong */ }
    }
  }, []);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const online = isOnline();
  // Pintu masuk ditutup bila cabang disetel harus online dan sinyalnya hilang.
  const tertutup = pintuTertutup(user) || (modeSyncDari(user) === 'online' && !online);
  const koordinator = user?.role === 'koordinator' || user?.role === 'admin_pusat';
  const pending = sync?.pending ?? 0;

  /**
   * Keadaan sync sebagai SATU pernyataan.
   *
   * Sebelumnya offline diumumkan dua kali — sekali di baris status, sekali di
   * kotak terpisah di bawahnya — sementara hal yang paling penting justru tidak
   * pernah disebut: kapan terakhir data ini benar-benar sampai ke server. Pada
   * aplikasi yang sengaja bisa bekerja berhari-hari tanpa sinyal, "tersinkron"
   * tanpa keterangan waktu tidak menjawab apa pun.
   */
  const keadaan = sync?.running ? 'jalan'
    : !online ? 'offline'
      : sync?.lastError ? 'gagal'
        : pending > 0 ? 'antre'
          // Perangkat yang belum pernah mengirim apa pun bukan "tersinkron" —
          // ia sekadar belum punya apa-apa untuk dikirim. Menyebutnya
          // tersinkron lalu menambahkan "belum pernah tersinkron" di bawahnya
          // adalah dua kalimat yang saling membantah.
          : sync?.lastSyncAt ? 'aman' : 'kosong';

  const dotCls = `sync-dot${keadaan === 'jalan' ? ' busy'
    : keadaan === 'aman' ? ' ok' : keadaan === 'gagal' ? ' gagal' : ''}`;

  const syncTitle = {
    jalan: 'Menyinkronkan…',
    // Kalimatnya harus sesuai modenya. "Input tetap berjalan" pada cabang yang
    // disetel harus online adalah janji yang langsung dibantah oleh tombol
    // registrasi yang mati tepat di bawahnya.
    offline: tertutup ? 'Offline — pencatatan baru ditahan' : 'Offline — input tetap berjalan',
    gagal: 'Sync belum berhasil',
    aman: 'Semua data tersinkron',
    antre: `${pending} record menunggu terkirim`,
    kosong: 'Tidak ada antrean',
  }[keadaan];

  const syncDetail = keadaan === 'kosong'
    ? 'Belum ada data yang perlu dikirim dari perangkat ini.'
    : [
      keadaan !== 'antre' && pending > 0 ? `${pending} record menunggu` : null,
      sync?.lastSyncAt ? `terakhir ${fmtSejak(sync.lastSyncAt)}` : 'belum pernah terkirim',
    ].filter(Boolean).join(' · ');

  async function doSync() {
    const r = await syncNow(key);
    if (r) {
      const n = r.accepted.participants.length + r.accepted.events.length + r.accepted.anonTallies.length;
      say(r.conflicts.length
        ? `${n} record tersinkron · ${r.conflicts.length} perlu ditinjau.`
        : 'Sync berhasil. Data sensitif lokal dibersihkan sesuai retensi.');
    } else if (sync?.lastError) {
      say(sync.lastError);
    }
    await load();
  }

  return (
    <div className="page page-home">
      <div className="home-head">
        <div className="home-head-brand">
          <img src="/terasol-mark.svg" alt="Terasol" />
          <div>
            <div className="sub">Rumah Sehat Terasol</div>
            <div className="branch">{user?.tenantNama}</div>
          </div>
        </div>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="Pengaturan">
          <Icon d={ICONS.gear} size={22} />
        </button>
      </div>

      <div className={`sync-row ${keadaan}`}>
        <span className={dotCls} />
        <span className="sync-tx">
          <b>{syncTitle}</b>
          <span>{syncDetail}</span>
        </span>
        {/* Simulasi offline adalah alat uji, bukan fitur lapangan. Sebelumnya
            ia terbit ke produksi berdampingan dengan tombol Sync sungguhan —
            satu ketukan keliru membuat petugas mengira sinyalnya hilang. */}
        {import.meta.env.DEV && (
          <button className="sim-btn" onClick={() => {
            const next = !offlineSim;
            setOfflineSim(next);
            setSimulatedOffline(next);
            say(next ? 'Mode offline. Semua input tetap tersimpan di perangkat.' : 'Kembali online.');
            void load();
          }}>{offlineSim ? 'Kembali online' : 'Uji offline'}</button>
        )}
        <button className="sync-btn" onClick={() => void doSync()} disabled={sync?.running}>
          <Icon d={ICONS.refresh} size={15} sw={2} />
          {sync?.running ? 'Menyinkronkan' : 'Sync'}
        </button>
      </div>

      {/* R1 — antrean menumpuk. Sync sudah dipicu otomatis; ini memberi tahu
          petugas kenapa sebaiknya cari sinyal sekarang, tanpa memblokir input. */}
      {sync?.overQuota && (
        <div className="warn-card danger">
          <span className="ic"><Icon d={ICONS.alert} size={19} /></span>
          <span className="tx">
            <b>{sync.pending} record menunggu terkirim</b>
            <span>
              Sudah lewat batas aman {MAX_UNSYNCED} record. Cari sinyal dan sync
              sekarang — browser bisa membersihkan penyimpanan saat ruang menipis.
            </span>
          </span>
        </div>
      )}

      {/* R1 — keduanya risiko yang sama (data lapangan bisa hilang sebelum
          sync), jadi disatukan dan diringkas agar tidak mendorong aksi utama
          petugas keluar layar. */}
      <PeringatanKetahanan storagePersisted={storagePersisted} install={install} say={say} />

      {daftarEv.length > 0 ? (
        <div className={`hero-deck${daftarEv.length > 1 ? ' geser' : ''}`}
          onScroll={(e) => {
            // Halaman aktif dibaca dari posisi gulir, bukan disimpan terpisah:
            // dengan scroll-snap, gulirlah sumber kebenarannya.
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== pilih) setPilih(i);
          }}>
          {daftarEv.map((e) => {
            const st = statusTampil(e);
            const c = counts[e.clientId] ?? { peserta: 0, berminat: 0, tally: 0, belumSync: 0 };
            return (
              <div className="hero-card" key={e.clientId}>
                <svg className="deco" viewBox="0 0 200 200" fill="none" aria-hidden="true">
                  <circle cx="100" cy="100" r="82" stroke="rgba(248,245,238,.09)" strokeWidth="9"
                    strokeLinecap="round" strokeDasharray="440 75" transform="rotate(-40 100 100)" />
                  <circle cx="46" cy="152" r="6" fill="rgba(204,156,72,.5)" />
                </svg>
                <div className="hero-top">
                  <Badge tone="onbrand" dot={st.hariIni}>Event {st.label.toLowerCase()}</Badge>
                  <span className="tipe">{e.tipe === 'berbayar' ? rp(e.hargaPaket) : 'Gratis'}</span>
                </div>
                <div>
                  <div className="hero-title">{e.nama}</div>
                  <div className="hero-meta">{fmtTanggal(e.tanggal)} · {e.lokasi}</div>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat"><b>{c.peserta}</b><span>Peserta</span></div>
                  <div className="hero-stat"><b>{c.berminat}</b><span>Berminat</span></div>
                  <div className="hero-stat"><b>{c.tally}</b><span>Tally anonim</span></div>
                </div>
                <Button variant="onbrand" size="lg" full icon={ICONS.userPlus}
                  disabled={tertutup} onClick={() => onDaftar(e)}>
                  Registrasi peserta baru
                </Button>
                {tertutup && <span className="hero-tertutup">{ALASAN_TERTUTUP}</span>}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Titik penanda halaman. Hanya muncul bila memang ada lebih dari satu
          event hari itu — satu titik tunggal tidak memberi tahu apa pun, dan
          justru menyiratkan ada yang tersembunyi. */}
      {daftarEv.length > 1 && (
        <div className="hero-titik" role="tablist" aria-label="Event hari ini">
          {daftarEv.map((e, i) => (
            <button key={e.clientId} role="tab" aria-selected={i === pilih}
              aria-label={e.nama}
              className={`titik${i === pilih ? ' on' : ''}`}
              onClick={() => {
                const dek = document.querySelector('.hero-deck');
                dek?.scrollTo({ left: i * dek.clientWidth, behavior: 'smooth' });
              }} />
          ))}
        </div>
      )}

      {daftarEv.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.calPlus} size={26} /></div>
          <b>Belum ada event</b>
          <p>Koordinator membuat event dulu, lalu petugas bisa mulai mencatat peserta.</p>
          <Button size="sm" icon={ICONS.plus} onClick={() => go('eventForm')}>Buat event</Button>
        </div>
      )}

      <div className="card menu-card">
        <button className="menu-item" onClick={() => go('eventForm')}>
          <span className="ic"><Icon d={ICONS.calPlus} size={19} /></span>
          <span className="tx"><b>Buat event</b><span>Akses Koordinator</span></span>
          <Icon d={ICONS.chevR} />
        </button>
        <div className="menu-sep" />
        <button className="menu-item" onClick={() => go('events')}>
          <span className="ic"><Icon d={ICONS.chart} size={19} /></span>
          <span className="tx"><b>Rekap event</b><span>Akses Koordinator</span></span>
          <Icon d={ICONS.chevR} />
        </button>
        {/* Di ponsel rel navigasi tidak punya isian sekunder, jadi apa pun yang
            hanya tinggal di sana harus punya jalan masuk di sini — tanpa itu ia
            sama sekali tidak terjangkau dari ponsel. */}
        <div className="menu-sep" />
        <button className="menu-item" onClick={() => go('produk')}>
          <span className="ic"><Icon d={ICONS.cart} size={19} /></span>
          <span className="tx">
            <b>Produk</b><span>Kandungan, aturan pakai, dan harga daftar</span>
          </span>
          <Icon d={ICONS.chevR} />
        </button>
        {koordinator && (
          <>
            <div className="menu-sep" />
            <button className="menu-item" onClick={() => go('master')}>
              <span className="ic"><Icon d={ICONS.tag} size={19} /></span>
              <span className="tx">
                <b>Master data</b><span>Produk & layanan, tim, cabang</span>
              </span>
              <Icon d={ICONS.chevR} />
            </button>
          </>
        )}
        {user?.role === 'admin_pusat' && (
          <>
            <div className="menu-sep" />
            <button className="menu-item" onClick={() => go('pusat')}>
              <span className="ic"><Icon d={ICONS.users} size={19} /></span>
              <span className="tx">
                <b>Semua cabang</b><span>Perbandingan angka antarcabang</span>
              </span>
              <Icon d={ICONS.chevR} />
            </button>
          </>
        )}
      </div>

      {followUps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="section-title">Tindak lanjut peserta</span>
          <div className="card menu-card">
            {followUps.map((p, i) => {
              const conv = CONV_LABEL[p.convStatus] ?? CONV_LABEL.baru!;
              return (
                <div key={p.id}>
                  {i > 0 && <div className="menu-sep" />}
                  <button className="list-item stacked" onClick={() => onFollowUp(p)}>
                    <span className="tx">
                      <b>{p.nama}, {usiaTampil(p.tanggalLahir, p.usia)} th</b>
                      <span>{p.eventNama} · {fmtTanggal(p.eventTanggal, { day: 'numeric', month: 'long' })}</span>
                    </span>
                    <Badge tone={conv.tone}>{conv.label}</Badge>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {conflicts > 0 && (
        <button className="review-card" onClick={() => go('conflicts')}>
          <span className="ic"><Icon d={ICONS.alert} size={19} /></span>
          <span className="tx">
            <b>{conflicts} record perlu ditinjau</b>
            <span>Duplikat saat sync — pilih record yang dipertahankan</span>
          </span>
          <Icon d={ICONS.chevR} />
        </button>
      )}
    </div>
  );
}
