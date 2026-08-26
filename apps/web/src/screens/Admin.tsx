import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, PageHead } from '../components/ui';
import { api, type ConflictGroup } from '../lib/api';
import { LOCAL_RETENTION_HOURS } from '../lib/db';
import { PARAM_LABEL, fmtTanggal } from '../lib/domain';
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
                  <b>Record {i + 1} — {r.nama}, {r.usia} th</b>
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

export function Settings({ go }: { go: Nav }) {
  const { user, lock, logout, say } = useApp();
  const [tab, setTab] = useState<'akun' | 'tim' | 'biaya' | 'perangkat'>('akun');

  return (
    <div className="page">
      <PageHead title="Pengaturan" onBack={() => go('home')} />

      <div className="card summary-card">
        <div className="summary-row"><span>Nama</span><span>{user?.nama}</span></div>
        <div className="summary-row"><span>Email</span><span>{user?.email}</span></div>
        <div className="summary-row"><span>Peran</span><span>{user?.role}</span></div>
        <div className="summary-row"><span>Cabang</span><span>{user?.tenantNama}</span></div>
      </div>

      <div className="seg">
        {(['akun', 'tim', 'biaya', 'perangkat'] as const).map((t) => (
          <button key={t} className={`seg-btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t === 'akun' ? 'Akun' : t === 'tim' ? 'Tim' : t === 'biaya' ? 'Biaya' : 'Perangkat'}
          </button>
        ))}
      </div>

      {tab === 'akun' && <AkunTab />}
      {tab === 'tim' && <TimTab />}
      {tab === 'biaya' && <BiayaTab />}
      {tab === 'perangkat' && <PerangkatTab />}

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
        <Field key={k} label={`${PARAM_LABEL[k]} (Rp per strip)`} htmlFor={`h-${k}`}>
          <input id={`h-${k}`} className="input" inputMode="numeric"
            disabled={!bolehUbah} placeholder="belum diatur"
            value={harga[k] ?? ''}
            onChange={(e) => setHarga({ ...harga, [k]: e.target.value.replace(/\D/g, '') })} />
        </Field>
      ))}

      {dimuat && bolehUbah && (
        <Button full disabled={busy} onClick={() => void simpan()}>Simpan harga</Button>
      )}
      {dimuat && !bolehUbah && <small>Hanya Koordinator yang bisa mengubah harga.</small>}
    </div>
  );
}

function TimTab() {
  const { user, say } = useApp();
  const [users, setUsers] = useState<{ id: string; nama: string; email: string; role: string; active: boolean }[]>([]);
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'petugas' as 'petugas' | 'koordinator' });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setUsers((await api.users()).users); } catch { /* butuh koneksi */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (user?.role === 'petugas') {
    return <div className="card consumable-card"><small>Manajemen tim hanya untuk Koordinator.</small></div>;
  }

  async function tambah() {
    if (form.password.length < 8) { say('Kata sandi minimal 8 karakter.'); return; }
    setBusy(true);
    try {
      await api.createUser(form);
      setForm({ nama: '', email: '', password: '', role: 'petugas' });
      setOpen(false);
      say('Akun dibuat.');
      await load();
    } catch {
      say('Gagal membuat akun — email mungkin sudah dipakai.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card consumable-card">
      <b>Tim cabang</b>
      {users.map((u) => (
        <div className="consumable-row" key={u.id}>
          <span>{u.nama} · {u.role}</span>
          <button className="link-btn sm"
            onClick={() => void api.setUserActive(u.id, !u.active).then(load)}>
            {u.active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      ))}
      {users.length === 0 && <small>Belum ada akun lain, atau perlu koneksi untuk memuat.</small>}

      {!open
        ? <Button variant="secondary" size="sm" icon={ICONS.plus} onClick={() => setOpen(true)}>Tambah akun</Button>
        : (
          <>
            <Field label="Nama" htmlFor="u-nama">
              <input id="u-nama" className="input" value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="u-email">
              <input id="u-email" className="input" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Kata sandi awal" htmlFor="u-pass">
              <input id="u-pass" className="input" type="text" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <div className="pill-row">
              <button className={`pill-choice ${form.role === 'petugas' ? 'on' : ''}`}
                onClick={() => setForm({ ...form, role: 'petugas' })}>Petugas</button>
              <button className={`pill-choice ${form.role === 'koordinator' ? 'on' : ''}`}
                onClick={() => setForm({ ...form, role: 'koordinator' })}>Koordinator</button>
            </div>
            <Button full disabled={busy} onClick={() => void tambah()}>Buat akun</Button>
            <button className="link-btn" onClick={() => setOpen(false)}>Batal</button>
          </>
        )}
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
