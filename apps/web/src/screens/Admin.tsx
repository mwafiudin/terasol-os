import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, InputRupiah, PageHead } from '../components/ui';
import { api, type ConflictGroup, type PusatRingkasan } from '../lib/api';
import { LOCAL_RETENTION_HOURS } from '../lib/db';
import { PARAM_LABEL, ROLE_LABEL, fmtTanggal, rp, usiaTampil } from '../lib/domain';
import { IDLE_LOCK_MS, REQUIRE_PIN, useApp } from '../lib/store';
import { isOnline, MAX_UNSYNCED } from '../lib/sync';
import type { ParamKey } from '../lib/types';

type Nav = (screen: string) => void;

/* ========================= Resolusi konflik (§4.3) ========================= */

export function Conflicts({ go }: { go: Nav }) {
  const { say } = useApp();
  const [groups, setGroups] = useState<ConflictGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOnline()) { setError('Resolusi konflik butuh koneksi ke server.'); return; }
    try {
      setGroups((await api.conflicts()).conflicts);
      setError(null);
    } catch {
      setError('Gagal memuat daftar konflik.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function pertahankan(g: ConflictGroup, keepId: string) {
    setBusy(true);
    try {
      const dropIds = g.records.filter((r) => r.id !== keepId).map((r) => r.id);
      await api.resolveConflict(keepId, dropIds);
      say('Record dipertahankan. Duplikatnya diarsipkan.');
      await load();
    } catch {
      say('Gagal menyelesaikan konflik.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHead title="Resolusi konflik" onBack={() => go('home')} right={<Badge tone="accent">Koordinator</Badge>} />
      <span className="hint" style={{ textAlign: 'left' }}>
        Dua petugas mencatat nomor HP yang sama di event yang sama. Server tidak
        menimpa otomatis — pilih record yang dipertahankan; yang lain diarsipkan.
      </span>

      {error && <div className="range-warn">{error}</div>}
      {!error && groups.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.check} size={26} /></div>
          <b>Tidak ada konflik</b>
          <p>Semua record bersih.</p>
        </div>
      )}

      {groups.map((g) => (
        <div key={`${g.eventId}-${g.hp}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="section-title">{g.eventNama} · nomor {g.hp}</span>
          {g.records.map((r, i) => {
            const nilai = r.screening
              ? (Object.keys(r.screening) as ParamKey[])
                .filter((k) => PARAM_LABEL[k] && r.screening![k] != null)
                .map((k) => `${PARAM_LABEL[k]} ${r.screening![k]}`)
                .join(' · ')
              : '';
            return (
              <div className="card conflict-card" key={r.id}>
                <div className="who">
                  <b>Record {i + 1} — {r.nama}, {usiaTampil(r.tanggalLahir, r.usia)} th</b>
                  <span>{new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="conflict-vals">{nilai || 'Belum ada hasil pengukuran'}</div>
                <Button variant="secondary" size="sm" disabled={busy}
                  onClick={() => void pertahankan(g, r.id)}>
                  Pertahankan record ini
                </Button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ============================== Pengaturan ============================== */

/**
 * Mode sync cabang.
 *
 * Pertimbangannya ditulis apa adanya di layar, bukan disembunyikan di balik
 * ikon tanya: yang memilih adalah Koordinator yang tahu apakah balai desa
 * tempat timnya bekerja punya sinyal, dan ia berhak tahu apa yang ia
 * pertaruhkan sebelum memilih — bukan sesudahnya.
 */
function ModeSyncTab() {
  const { user, say } = useApp();
  const [mode, setMode] = useState<'online' | 'offline'>(user?.modeSync ?? 'online');
  const [busy, setBusy] = useState(false);

  async function pilih(m: 'online' | 'offline') {
    if (m === mode || busy) return;
    setBusy(true);
    const sebelum = mode;
    setMode(m);
    try {
      await api.setModeSync(m);
      say(m === 'online'
        ? 'Cabang ini kini harus online untuk mencatat peserta baru.'
        : 'Cabang ini kini boleh mencatat tanpa sinyal.');
    } catch {
      setMode(sebelum);
      say('Gagal menyimpan. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  return (
    <div className="card consumable-card">
      <b>Mode pencatatan</b>

      <button className={`mode-pilihan ${mode === 'online' ? 'on' : ''}`}
        disabled={busy} onClick={() => void pilih('online')}>
        <span className="mode-kepala">
          <b>Harus online</b>
          {mode === 'online' && <Badge tone="success">Dipakai</Badge>}
        </span>
        <span className="mode-untung">
          Kesalahan terlihat seketika, dan data selalu sudah ada di server
          begitu tersimpan.
        </span>
        <span className="mode-rugi">
          Harganya: pencatatan peserta baru berhenti total saat sinyal hilang.
        </span>
      </button>

      <button className={`mode-pilihan ${mode === 'offline' ? 'on' : ''}`}
        disabled={busy} onClick={() => void pilih('offline')}>
        <span className="mode-kepala">
          <b>Boleh offline</b>
          {mode === 'offline' && <Badge tone="success">Dipakai</Badge>}
        </span>
        <span className="mode-untung">
          Petugas tetap bisa mencatat tanpa sinyal; datanya mengantre
          terenkripsi di perangkat dan terkirim sendiri saat sinyal kembali.
        </span>
        <span className="mode-rugi">
          Harganya: sampai terkirim, data itu hanya ada di satu HP. Petugas lain
          tidak melihatnya, dan HP yang hilang berarti data yang hilang.
          Antrean juga bisa tertahan tanpa disadari bila ada satu angka yang
          ditolak server.
        </span>
      </button>

      <small>
        Apa pun modenya, yang sedang dikerjakan selalu boleh diselesaikan —
        pengukuran yang sudah diambil dari orang yang berdiri di depan petugas
        tidak pernah dibuang karena sinyal putus.
      </small>
    </div>
  );
}

export function Settings({ go }: { go: Nav }) {
  const { user, lock, logout, say } = useApp();
  const [tab, setTab] = useState<'akun' | 'sync' | 'biaya' | 'perangkat'>('akun');
  const koordinatorKeAtas = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  return (
    <div className="page">
      <PageHead title="Pengaturan" onBack={() => go('home')} />

      <div className="card summary-card">
        <div className="summary-row"><span>Nama</span><span>{user?.nama}</span></div>
        <div className="summary-row"><span>Email</span><span>{user?.email}</span></div>
        <div className="summary-row">
          <span>Peran</span>
          <span>{user ? ROLE_LABEL[user.role] ?? user.role : '—'}</span>
        </div>
        <div className="summary-row"><span>Cabang</span><span>{user?.tenantNama}</span></div>
      </div>

      <div className="seg">
        {(['akun', ...(koordinatorKeAtas ? ['sync' as const] : []), 'biaya', 'perangkat'] as const).map((t) => (
          <button key={t} className={`seg-btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t === 'akun' ? 'Akun' : t === 'sync' ? 'Sync' : t === 'biaya' ? 'Biaya' : 'Perangkat'}
          </button>
        ))}
      </div>

      {tab === 'akun' && <AkunTab />}
      {tab === 'sync' && koordinatorKeAtas && <ModeSyncTab />}
      {tab === 'biaya' && <BiayaTab />}
      {tab === 'perangkat' && <PerangkatTab />}

      {/* Pengelolaan akun tim pindah ke Master data. Dua tempat untuk pekerjaan
          yang sama membuat perubahan di salah satunya tampak tidak berlaku. */}
      {(user?.role === 'koordinator' || user?.role === 'admin_pusat') && (
        <button className="card menu-card menu-item" onClick={() => go('master')}>
          <span className="ic"><Icon d={ICONS.tag} size={19} /></span>
          <span className="tx">
            <b>Master data</b>
            <span>Akun tim, produk &amp; layanan, cabang</span>
          </span>
          <Icon d={ICONS.chevR} />
        </button>
      )}

      <div className="card consumable-card">
        <b>Keamanan data di perangkat</b>
        <div className="consumable-row">
          <span>Enkripsi lokal</span>
          <span>{REQUIRE_PIN ? 'AES-256-GCM, kunci dari PIN' : 'AES-256-GCM, kunci perangkat'}</span>
        </div>
        <div className="consumable-row">
          <span>PIN lock</span>
          <span className={REQUIRE_PIN ? '' : 'belum'}>
            {REQUIRE_PIN ? `auto-lock ${Math.round(IDLE_LOCK_MS / 60000)} menit idle` : 'dimatikan'}
          </span>
        </div>
        <div className="consumable-row">
          <span>Retensi lokal</span><span>{LOCAL_RETENTION_HOURS} jam setelah sync</span>
        </div>
        <div className="consumable-row">
          <span>Batas antrean</span><span>{MAX_UNSYNCED} record sebelum sync dipaksa</span>
        </div>

        {!REQUIRE_PIN && (
          <div className="belum-note">
            PIN sedang dimatikan. Data peserta tetap dienkripsi, tetapi kuncinya
            tersimpan di perangkat ini juga — siapa pun yang bisa membuka
            aplikasi bisa membaca isinya. Bila perangkat hilang, yang tersisa
            hanya remote wipe dan auto-purge. Nyalakan lagi lewat
            <code> REQUIRE_PIN </code> sebelum dipakai membawa data peserta
            sungguhan ke lapangan.
          </div>
        )}

        <small>
          Durasi retensi masih provisional — keputusan D4 menunggu verifikasi
          hukum. Setelah sync terkonfirmasi dan masa retensi lewat, identitas dan
          hasil pengukuran dihapus dari perangkat.
        </small>
      </div>

      {REQUIRE_PIN && (
        <Button variant="secondary" full icon={ICONS.lock} onClick={lock}>Kunci sekarang</Button>
      )}
      <Button variant="ghost" full icon={ICONS.logout}
        onClick={() => { void logout().then(() => say('Anda keluar dari perangkat ini.')); }}>
        Keluar
      </Button>
    </div>
  );
}

function AkunTab() {
  const { say } = useApp();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  async function ganti() {
    if (next.length < 8) { say('Kata sandi baru minimal 8 karakter.'); return; }
    setBusy(true);
    try {
      const r = await api.changePassword(cur, next);
      setCur(''); setNext('');
      say(r.sesiLainDicabut > 0
        ? `Kata sandi diganti. ${r.sesiLainDicabut} sesi perangkat lain dicabut.`
        : 'Kata sandi diganti.');
    } catch {
      say('Gagal mengganti kata sandi. Periksa kata sandi lama.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card consumable-card">
      <b>Ganti kata sandi</b>
      <Field label="Kata sandi saat ini" htmlFor="pw-cur">
        <input id="pw-cur" className="input" type="password" value={cur}
          onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
      </Field>
      <Field label="Kata sandi baru" htmlFor="pw-new">
        <input id="pw-new" className="input" type="password" value={next}
          onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      <Button full disabled={busy || !cur || !next} onClick={() => void ganti()}>Simpan</Button>
      <small>Perangkat lain akan diminta masuk ulang.</small>
    </div>
  );
}

/**
 * Harga consumable per cabang (US-06). Sebelumnya angkanya konstanta di kode —
 * artinya biaya karangan ikut ke setiap rekap tanpa ada yang bisa mengoreksi.
 */
function BiayaTab() {
  const { user, say } = useApp();
  const [params, setParams] = useState<ParamKey[]>([]);
  const [harga, setHarga] = useState<Partial<Record<ParamKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [dimuat, setDimuat] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api.config();
      setParams(c.consumableParams);
      setHarga(Object.fromEntries(
        c.consumableParams.map((k) => [k, c.consumablePrice[k] != null ? String(c.consumablePrice[k]) : '']),
      ));
      setDimuat(true);
    } catch { /* butuh koneksi */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const bolehUbah = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  async function simpan() {
    setBusy(true);
    try {
      const payload = Object.fromEntries(
        params.map((k) => {
          const v = (harga[k] ?? '').replace(/\D/g, '');
          return [k, v === '' ? null : Number(v)];
        }),
      );
      await api.setConsumablePrices(payload);
      say('Harga consumable disimpan. Rekap akan memakai angka ini.');
      await load();
    } catch {
      say('Gagal menyimpan harga.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card consumable-card">
      <b>Harga consumable per pemeriksaan</b>
      <small>
        Dipakai rekap untuk menghitung estimasi biaya. Dikosongkan berarti belum
        diatur — rekap akan mengatakannya, bukan menghitungnya sebagai Rp 0.
        Tiap cabang bisa punya harga beli strip yang berbeda.
      </small>

      {!dimuat && <small>Memuat…</small>}

      {dimuat && params.map((k) => (
        <Field key={k} label={`${PARAM_LABEL[k]} — per strip`} htmlFor={`h-${k}`}>
          <InputRupiah id={`h-${k}`} disabled={!bolehUbah} placeholder="belum diatur"
            value={harga[k] ?? ''}
            onChange={(v) => setHarga({ ...harga, [k]: v })} />
        </Field>
      ))}

      {dimuat && bolehUbah && (
        <Button full disabled={busy} onClick={() => void simpan()}>Simpan harga</Button>
      )}
      {dimuat && !bolehUbah && <small>Hanya Koordinator yang bisa mengubah harga.</small>}
    </div>
  );
}

function PerangkatTab() {
  const { user, say } = useApp();
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof api.devices>>['devices']>([]);

  const load = useCallback(async () => {
    try { setDevices((await api.devices()).devices); } catch { /* butuh koneksi */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (user?.role === 'petugas') {
    return <div className="card consumable-card"><small>Manajemen perangkat hanya untuk Koordinator.</small></div>;
  }

  return (
    <div className="card consumable-card">
      <b>Perangkat aktif</b>
      <small>
        Mencabut perangkat langsung mematikan sesinya dan memerintahkan
        penghapusan data lokal saat perangkat itu online berikutnya (§4.5.4).
      </small>
      {devices.map((d) => (
        <div className="consumable-row" key={d.id}>
          <span>
            {d.userNama} · {fmtTanggal(d.lastSeenAt, { day: 'numeric', month: 'short' })}
            {d.revokedAt ? ' · dicabut' : ''}
          </span>
          {!d.revokedAt && (
            <button className="link-btn sm danger"
              onClick={() => void api.revokeDevice(d.id, true)
                .then(() => { say('Perangkat dicabut. Data lokalnya akan dihapus.'); return load(); })}>
              Cabut &amp; hapus
            </button>
          )}
        </div>
      ))}
      {devices.length === 0 && <small>Belum ada perangkat terdaftar, atau perlu koneksi untuk memuat.</small>}
    </div>
  );
}

/* ============================== Placeholder ============================== */

/* ==================== Dashboard lintas cabang (Pusat) ==================== */

/**
 * Perbandingan antarcabang untuk Admin Pusat.
 *
 * Sengaja hanya angka. Riwayat pelanggan tetap milik cabangnya masing-masing —
 * membandingkan performa cabang tidak memerlukan nama satu orang pun, dan
 * membuka daftar orang lintas cabang di sini akan membatalkan pemisahan yang
 * justru menjadi alasan RLS ada.
 */
export function Pusat({ go }: { go: Nav }) {
  const [data, setData] = useState<PusatRingkasan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urut, setUrut] = useState<'nama' | 'belanja' | 'pelanggan'>('belanja');

  useEffect(() => {
    void api.pusatRingkasan()
      .then(setData)
      .catch(() => setError('Gagal memuat ringkasan cabang. Periksa koneksi.'));
  }, []);

  if (error) {
    return (
      <div className="page">
        <PageHead title="Semua cabang" onBack={() => go('home')} />
        <div className="belum-note">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="page">
        <PageHead title="Semua cabang" onBack={() => go('home')} />
        <span className="hint">Memuat…</span>
      </div>
    );
  }

  const cabang = [...data.cabang].sort((a, b) => {
    if (urut === 'nama') return a.nama.localeCompare(b.nama);
    if (urut === 'pelanggan') return b.pelanggan - a.pelanggan;
    return Number(b.totalBelanja) - Number(a.totalBelanja);
  });
  const tertinggi = Math.max(1, ...cabang.map((c) => Number(c.totalBelanja)));

  return (
    <div className="page">
      <PageHead title="Semua cabang" onBack={() => go('home')}
        right={<Badge tone="accent">Admin Pusat</Badge>} />

      <div className="card consumable-card">
        <b>Gabungan {data.total.cabang} cabang</b>
        <div className="stat-grid">
          <div className="stat-card"><b>{data.total.pelanggan}</b><span>Pelanggan</span></div>
          <div className="stat-card"><b>{data.total.kunjungan}</b><span>Kunjungan</span></div>
          <div className="stat-card"><b>{data.total.pengukuran}</b><span>Pengukuran</span></div>
          <div className="stat-card"><b>{data.total.eventAktif}</b><span>Event aktif</span></div>
        </div>
        <div className="consumable-total">
          <span>Total belanja tercatat</span><span>{rp(data.total.totalBelanja)}</span>
        </div>
        {data.total.perluDitinjau > 0 && (
          <div className="belum-note">
            {data.total.perluDitinjau} record di seluruh cabang bernomor kembar dan menunggu peninjauan
            dan belum ikut dihitung.
          </div>
        )}
      </div>

      <div className="chip-baris">
        {([['belanja', 'Belanja tertinggi'], ['pelanggan', 'Pelanggan terbanyak'], ['nama', 'Urut nama']] as const)
          .map(([k, label]) => (
            <button key={k} className={`chip ${urut === k ? 'on' : ''}`} onClick={() => setUrut(k)}>
              {label}
            </button>
          ))}
      </div>

      <span className="section-title">Per cabang</span>

      {cabang.map((c) => (
        <div className="card cabang-card" key={c.id}>
          <div className="cabang-atas">
            <span className="cabang-nama">{c.nama}</span>
            {c.eventAktif > 0 && <Badge tone="success" dot>{c.eventAktif} aktif</Badge>}
            {c.perluDitinjau > 0 && <Badge tone="warning">{c.perluDitinjau} nomor kembar</Badge>}
          </div>
          <div className="cabang-nilai"><b>{rp(Number(c.totalBelanja))}</b><span>{c.transaksi} transaksi</span></div>
          {/* Batang perbandingan relatif terhadap cabang tertinggi — bukan
              target, sekadar agar selisihnya terbaca sekali lihat. */}
          <div className="cabang-bar">
            <div style={{ width: `${(Number(c.totalBelanja) / tertinggi) * 100}%` }} />
          </div>
          <div className="cabang-angka">
            <span><b>{c.pelanggan}</b> pelanggan</span>
            <span><b>{c.kunjungan}</b> kunjungan</span>
            <span><b>{c.pengukuran}</b> pengukuran</span>
            <span><b>{c.petugas}</b> akun aktif</span>
          </div>
        </div>
      ))}

      <small className="hint">
        Halaman ini menampilkan angka agregat saja. Data diri dan riwayat
        pelanggan tetap terbatas pada cabangnya masing-masing, dan setiap
        pembukaan halaman ini tercatat di audit log.
      </small>
    </div>
  );
}

export function Placeholder({ kind }: { kind: 'outlet' | 'hs' }) {
  const outlet = kind === 'outlet';
  return (
    <div className="page page-fill" style={{ padding: 0 }}>
      <div className="placeholder">
        <svg className="deco" style={{ top: -90, [outlet ? 'right' : 'left']: -110, width: 300, height: 300 }}
          viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <circle cx="100" cy="100" r="80" stroke="rgba(18,84,90,.07)" strokeWidth="10"
            strokeLinecap="round" strokeDasharray="430 75"
            transform={`rotate(${outlet ? -30 : 140} 100 100)`} />
        </svg>
        <div className="ic"><Icon d={outlet ? ICONS.outlet : ICONS.van} size={30} /></div>
        <Badge tone="sage">Segera hadir · {outlet ? 'v1.1' : 'v1.2'}</Badge>
        <b>Kanal {outlet ? 'Outlet' : 'Home Service'}</b>
        <p>
          {outlet
            ? 'Pencatatan sesi harian di outlet, jadwal, dan pelanggan berulang — terhubung dengan data konversi dari event.'
            : 'Penjadwalan kunjungan ke rumah pelanggan, penugasan petugas, dan pencatatan sesi di lokasi.'}
        </p>
      </div>
    </div>
  );
}
