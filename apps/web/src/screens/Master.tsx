import { Fragment, useCallback, useEffect, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, InputRupiah, PageHead, SegTabs, Sheet } from '../components/ui';
import { api, ApiError, type CabangRow, type JenisTransaksi, type KatalogRow } from '../lib/api';
import { ROLE_LABEL, fmtTanggal, rp } from '../lib/domain';
import { useApp } from '../lib/store';
import type { Role } from '../lib/types';

type Nav = (screen: string) => void;

const JENIS: { k: JenisTransaksi; label: string; tone: string }[] = [
  { k: 'produk', label: 'Produk', tone: 'sage' },
  { k: 'terapi', label: 'Terapi', tone: 'brand' },
  { k: 'paket', label: 'Paket', tone: 'success' },
];

/**
 * Master data.
 *
 * Cakupannya mengikuti peran, bukan tombol yang disembunyikan: Koordinator
 * bekerja pada cabangnya sendiri karena RLS memang hanya memberinya itu, dan
 * Admin Pusat bisa meminta pandangan lintas cabang secara sadar. Membatasi di
 * lapisan tampilan saja akan menjadi pagar yang bisa dilangkahi.
 */
export type MasterTab = 'katalog' | 'tim' | 'cabang';

/**
 * Tab dikendalikan dari luar supaya sub-menu sidebar bisa mengarahkannya
 * langsung. Di layar ≥1100px judul dan tab di dalam halaman disembunyikan —
 * sidebar sudah menyebut keduanya, dan mengulangnya berarti empat baris krom
 * sebelum satu pun isi terlihat.
 */
export function Master({ go, tab, onTab }: { go: Nav; tab: MasterTab; onTab: (t: MasterTab) => void }) {
  const { user } = useApp();
  const pusat = user?.role === 'admin_pusat';

  const daftarTab = [
    { id: 'katalog' as const, label: 'Produk & layanan', icon: ICONS.tag },
    { id: 'tim' as const, label: 'Tim', icon: ICONS.users },
    ...(pusat ? [{ id: 'cabang' as const, label: 'Cabang', icon: ICONS.outlet }] : []),
  ];
  const judulTab = daftarTab.find((t) => t.id === tab)?.label ?? 'Master data';

  return (
    <div className="page page-master">
      <PageHead title="Master data" onBack={() => go('home')}
        right={<Badge tone="accent">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Badge>} />
      {/* Judul tetap ada bagi pembaca layar meski tersembunyi di sidebar-layout. */}
      <h1 className="sr-only">Master data — {judulTab}</h1>

      <span className="recap-sub">
        <span>
          {pusat
            ? 'Anda dapat mengelola seluruh cabang.'
            : `Berlaku untuk ${user?.tenantNama ?? 'cabang Anda'}.`}
        </span>
      </span>

      <SegTabs tabs={daftarTab} active={tab} onSelect={onTab} />

      {tab === 'katalog' && <TabKatalog pusat={pusat} />}
      {tab === 'tim' && <TabTim />}
      {tab === 'cabang' && pusat && <TabCabang tenantSaya={user?.tenantId ?? null} />}
    </div>
  );
}

/* ======================== Produk & layanan ======================== */

function TabKatalog({ pusat }: { pusat: boolean }) {
  const { say } = useApp();
  const [rows, setRows] = useState<KatalogRow[] | null>(null);
  const [semua, setSemua] = useState(false);
  const [cabang, setCabang] = useState<CabangRow[]>([]);
  const [form, setForm] = useState<{ awal: KatalogRow | null } | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGagal(null);
    try { setRows((await api.katalog({ semua })).katalog); }
    catch { setGagal('Gagal memuat katalog. Periksa koneksi.'); setRows([]); }
  }, [semua]);

  useEffect(() => { void muat(); }, [muat]);
  useEffect(() => {
    if (pusat) void api.cabang().then((r) => setCabang(r.cabang)).catch(() => setCabang([]));
  }, [pusat]);

  async function hapus(k: KatalogRow) {
    setKonfirmHapus(null);
    try {
      await api.deleteKatalog(k.id);
      say(`"${k.nama}" dihapus dari katalog.`);
      await muat();
    } catch (err) {
      say(err instanceof ApiError && err.status === 409
        ? err.message
        : 'Gagal menghapus. Periksa koneksi.');
    }
  }

  async function setAktif(k: KatalogRow, aktif: boolean) {
    try {
      await api.updateKatalog(k.id, { aktif });
      say(aktif ? `"${k.nama}" diaktifkan.` : `"${k.nama}" dinonaktifkan.`);
      await muat();
    } catch { say('Gagal menyimpan. Periksa koneksi.'); }
  }

  if (rows === null) return <span className="hint">Memuat katalog…</span>;

  // Dikelompokkan per jenis; pada pandangan lintas cabang, per cabang dulu.
  const kunciGrup = (k: KatalogRow) => (semua ? k.tenantNama : '');
  const grup = [...new Set(rows.map(kunciGrup))];

  return (
    <>
      {gagal && <div className="belum-note">{gagal}</div>}

      {/* Baris alat menyatu dengan daftarnya dalam satu permukaan: aksi
          "Tambah" jadi punya tambatan, alih-alih mengambang di ruang kosong
          antara tab dan isi. */}
      <div className="card panel">
        <div className="panel-head">
          {pusat ? (
            <div className="chip-baris">
              <button className={`chip ${!semua ? 'on' : ''}`} onClick={() => setSemua(false)}>
                Cabang saya
              </button>
              <button className={`chip ${semua ? 'on' : ''}`} onClick={() => setSemua(true)}>
                Semua cabang
              </button>
            </div>
          ) : (
            <span className="toolbar-judul">
              {rows.length} entri{rows.some((k) => !k.aktif) ? ` · ${rows.filter((k) => !k.aktif).length} nonaktif` : ''}
            </span>
          )}
          <Button size="sm" icon={ICONS.plus} onClick={() => setForm({ awal: null })}>
            Tambah
          </Button>
        </div>

        {/* Keadaan kosong hanya sah bila pemuatannya berhasil. Menampilkan
            "gagal memuat" dan "masih kosong" bersamaan mengatakan dua hal yang
            bertentangan, dan yang kedua adalah dugaan yang tidak kita ketahui. */}
        {rows.length === 0 && !gagal && (
          <div className="panel-kosong">
            <b>Katalog masih kosong</b>
            <p>
              Isi dengan produk dan terapi yang benar-benar dijual di sini. Form
              belanja akan memilih dari daftar ini, sehingga nama dan harganya
              tidak perlu diketik ulang tiap kali.
            </p>
          </div>
        )}

        {/* Tabel sungguhan, bukan daftar yang diregangkan. Di bawah 1100px
            CSS memecahnya jadi kartu berlabel — satu markup, dua bentuk, dan
            hubungan kolom-ke-sel tetap utuh bagi pembaca layar. */}
        {rows.length > 0 && (
          <table className="tabel">
            <thead>
              <tr>
                <th>Nama</th>
                <th className="kol-sempit">Jenis</th>
                <th className="kol-angka">Harga acuan</th>
                <th className="kol-angka">Dipakai</th>
                <th className="kol-sempit">Status</th>
                <th className="kol-aksi"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            {grup.map((namaGrup) => (
              <tbody key={namaGrup || 'tunggal'}>
                {namaGrup && (
                  <tr className="baris-grup baris-cabang">
                    <td colSpan={6}>{namaGrup}</td>
                  </tr>
                )}
                {JENIS.map((j) => {
                  const isi = rows.filter((k) => kunciGrup(k) === namaGrup && k.jenis === j.k);
                  if (isi.length === 0) return null;
                  return isi.map((k, i) => (
                    <Fragment key={k.id}>
                      {i === 0 && (
                        <tr className="baris-grup"><td colSpan={6}>{j.label}</td></tr>
                      )}
                      <tr className={k.aktif ? '' : 'nonaktif'}>
                        <td data-label="Nama" className="kol-nama">
                          <b>{k.nama}</b>
                          {k.catatan && <em>{k.catatan}</em>}
                        </td>
                        <td data-label="Jenis" className="kol-sempit ringkas">{j.label}</td>
                        <td data-label="Harga acuan" className="kol-angka ringkas">{rp(Number(k.harga))}</td>
                        <td data-label="Dipakai" className="kol-angka ringkas">
                          {k.terpakai > 0 ? (
                            <><span className="hanya-kartu">dipakai </span>{k.terpakai}×</>
                          ) : <span className="muted">belum dipakai</span>}
                        </td>
                        <td data-label="Status" className="kol-sempit ringkas">
                          <span className={`vonis ${k.aktif ? 'vonis-normal' : 'vonis-netral'}`}>
                            {k.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="kol-aksi">
                          {konfirmHapus === k.id ? (
                            <div className="hapus-konfirm">
                              <span>Hapus "{k.nama}"?</span>
                              <button className="link-btn sm bahaya" onClick={() => void hapus(k)}>Ya</button>
                              <button className="link-btn sm" onClick={() => setKonfirmHapus(null)}>Batal</button>
                            </div>
                          ) : (
                            <div className="riwayat-aksi">
                              <button className="ikon-btn" aria-label={`Ubah ${k.nama}`}
                                onClick={() => setForm({ awal: k })}>
                                <Icon d={ICONS.pencil} size={16} />
                              </button>
                              <button className="ikon-btn"
                                aria-label={`${k.aktif ? 'Nonaktifkan' : 'Aktifkan'} ${k.nama}`}
                                title={k.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                                onClick={() => void setAktif(k, !k.aktif)}>
                                <Icon d={k.aktif ? ICONS.x : ICONS.check} size={16} />
                              </button>
                              {/* Yang sudah menempel pada transaksi tidak ditawari
                                  hapus sama sekali: menawarkan lalu menolak hanya
                                  memindahkan penjelasan ke saat yang lebih buruk. */}
                              {k.terpakai === 0 && (
                                <button className="ikon-btn bahaya" aria-label={`Hapus ${k.nama}`}
                                  onClick={() => setKonfirmHapus(k.id)}>
                                  <Icon d={ICONS.trash} size={16} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  ));
                })}
              </tbody>
            ))}
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <small className="hint">
          Barang yang sudah pernah dipakai tidak bisa dihapus — nonaktifkan saja,
          supaya riwayat belanja tetap menyebut namanya.
        </small>
      )}

      {form && (
        <FormKatalog awal={form.awal} cabang={pusat ? cabang : []}
          onTutup={() => setForm(null)}
          onSelesai={async () => { setForm(null); await muat(); }} />
      )}
    </>
  );
}

function FormKatalog({ awal, cabang, onTutup, onSelesai }: {
  awal: KatalogRow | null;
  cabang: CabangRow[];
  onTutup: () => void;
  onSelesai: () => Promise<void>;
}) {
  const { say } = useApp();
  const [jenis, setJenis] = useState<JenisTransaksi>(awal?.jenis ?? 'produk');
  const [nama, setNama] = useState(awal?.nama ?? '');
  const [harga, setHarga] = useState(awal ? String(Number(awal.harga)) : '');
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [tenantId, setTenantId] = useState(awal?.tenantId ?? cabang[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const siap = nama.trim() !== '' && harga !== '';

  async function simpan() {
    setBusy(true);
    try {
      if (awal) {
        await api.updateKatalog(awal.id, {
          jenis, nama: nama.trim(), harga: Number(harga), catatan: catatan.trim() || null,
        });
        say('Katalog diperbarui.');
      } else {
        await api.createKatalog({
          jenis, nama: nama.trim(), harga: Number(harga),
          catatan: catatan.trim() || null,
          ...(cabang.length > 0 && tenantId ? { tenantId } : {}),
        });
        say(`"${nama.trim()}" ditambahkan.`);
      }
      await onSelesai();
    } catch (err) {
      say(err instanceof ApiError && err.status === 409
        ? err.message
        : 'Gagal menyimpan. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  return (
    <Sheet title={awal ? 'Ubah entri katalog' : 'Tambah ke katalog'}
      subtitle={awal ? awal.nama : 'Dipakai oleh form belanja'} onClose={onTutup}>

      {!awal && cabang.length > 0 && (
        <Field label="Cabang" htmlFor="k-cabang">
          <select id="k-cabang" className="input" value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}>
            {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </Field>
      )}

      <div className="field">
        <label>Jenis</label>
        <div className="pill-row">
          {JENIS.map((j) => (
            <button key={j.k} className={`pill-choice ${jenis === j.k ? 'on' : ''}`}
              onClick={() => setJenis(j.k)}>{j.label}</button>
          ))}
        </div>
      </div>

      <Field label="Nama" htmlFor="k-nama">
        <input id="k-nama" className="input" value={nama} maxLength={200} autoFocus
          onChange={(e) => setNama(e.target.value)} placeholder="cth. Paket herbal sendi" />
      </Field>

      <Field label="Harga acuan" htmlFor="k-harga">
        <InputRupiah id="k-harga" value={harga} onChange={setHarga} placeholder="350.000" />
        <small className="field-bantu">
          Harga ini hanya mengisi form belanja. Transaksi menyimpan harganya
          sendiri, jadi nota lama tidak ikut berubah saat daftar harga diperbarui.
        </small>
      </Field>

      <Field label="Catatan (opsional)" htmlFor="k-catatan">
        <input id="k-catatan" className="input" value={catatan} maxLength={200}
          onChange={(e) => setCatatan(e.target.value)} placeholder="cth. isi 60 kapsul" />
      </Field>

      <Button full size="lg" icon={ICONS.check} disabled={!siap || busy} onClick={() => void simpan()}>
        {awal ? 'Simpan perubahan' : 'Tambahkan'}
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}

/* ============================== Tim ============================== */

type Pengguna = { id: string; nama: string; email: string; role: Role; active: boolean };

function TabTim() {
  const { say, user } = useApp();
  const [rows, setRows] = useState<Pengguna[] | null>(null);
  const [buka, setBuka] = useState(false);
  const [f, setF] = useState({ nama: '', email: '', password: '', role: 'petugas' as 'petugas' | 'koordinator' });
  const [busy, setBusy] = useState(false);

  const muat = useCallback(async () => {
    try { setRows((await api.users()).users); } catch { setRows([]); }
  }, []);
  useEffect(() => { void muat(); }, [muat]);

  async function tambah() {
    if (!f.nama.trim() || !f.email.trim() || f.password.length < 8) {
      say('Lengkapi nama, email, dan kata sandi minimal 8 karakter.');
      return;
    }
    setBusy(true);
    try {
      await api.createUser({ ...f, nama: f.nama.trim(), email: f.email.trim() });
      say(`Akun ${f.nama.trim()} dibuat.`);
      setF({ nama: '', email: '', password: '', role: 'petugas' });
      setBuka(false);
      await muat();
    } catch { say('Gagal membuat akun. Email mungkin sudah dipakai.'); }
    finally { setBusy(false); }
  }

  if (rows === null) return <span className="hint">Memuat tim…</span>;

  return (
    <>

      {buka && (
        <div className="card consumable-card">
          <b>Akun baru</b>
          <Field label="Nama" htmlFor="t-nama">
            <input id="t-nama" className="input" value={f.nama} autoFocus
              onChange={(e) => setF({ ...f, nama: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="t-email">
            <input id="t-email" className="input" type="email" value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Kata sandi awal" htmlFor="t-sandi">
            <input id="t-sandi" className="input" type="password" value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })} />
            <small className="field-bantu">Minimal 8 karakter. Minta diganti setelah masuk pertama kali.</small>
          </Field>
          <div className="field">
            <label>Peran</label>
            <div className="pill-row">
              <button className={`pill-choice ${f.role === 'petugas' ? 'on' : ''}`}
                onClick={() => setF({ ...f, role: 'petugas' })}>Petugas</button>
              <button className={`pill-choice ${f.role === 'koordinator' ? 'on' : ''}`}
                onClick={() => setF({ ...f, role: 'koordinator' })}>Koordinator</button>
            </div>
          </div>
          <Button full icon={ICONS.check} disabled={busy} onClick={() => void tambah()}>Buat akun</Button>
          <button className="link-btn" onClick={() => setBuka(false)}>Batal</button>
        </div>
      )}

      <div className="card panel">
        <div className="panel-head">
          <span className="toolbar-judul">
            {rows.filter((u) => u.active).length} akun aktif
            {rows.some((u) => !u.active) ? ` · ${rows.filter((u) => !u.active).length} nonaktif` : ''}
          </span>
          {!buka && (
            <Button size="sm" icon={ICONS.userPlus} onClick={() => setBuka(true)}>Tambah</Button>
          )}
        </div>
        <table className="tabel">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th className="kol-sempit">Peran</th>
              <th className="kol-sempit">Status</th>
              <th className="kol-aksi"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr className={u.active ? '' : 'nonaktif'} key={u.id}>
                <td data-label="Nama" className="kol-nama">
                  <b>{u.nama}</b>
                  {u.id === user?.id && <em>Akun Anda</em>}
                </td>
                <td data-label="Email" className="ringkas">{u.email}</td>
                <td data-label="Peran" className="kol-sempit ringkas">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td data-label="Status" className="kol-sempit ringkas">
                  <span className={`vonis ${u.active ? 'vonis-normal' : 'vonis-netral'}`}>
                    {u.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="kol-aksi">
                  {/* Menonaktifkan akun sendiri ditolak server; tombolnya tidak
                      ditampilkan sekalian agar tidak perlu dijelaskan dua kali. */}
                  {u.id !== user?.id && (
                    <Button size="sm" variant="secondary"
                      onClick={() => void api.setUserActive(u.id, !u.active)
                        .then(() => { say(u.active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.'); return muat(); })
                        .catch(() => say('Gagal menyimpan. Periksa koneksi.'))}>
                      {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <small className="hint">
        Menonaktifkan akun langsung mencabut sesi di semua perangkatnya.
      </small>
    </>
  );
}

/* ============================= Cabang ============================= */

function TabCabang({ tenantSaya }: { tenantSaya: string | null }) {
  const { say } = useApp();
  const [rows, setRows] = useState<CabangRow[] | null>(null);
  const [nama, setNama] = useState('');
  const [buka, setBuka] = useState(false);
  const [ubah, setUbah] = useState<{ id: string; nama: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const muat = useCallback(async () => {
    try { setRows((await api.cabang()).cabang); } catch { setRows([]); }
  }, []);
  useEffect(() => { void muat(); }, [muat]);

  if (rows === null) return <span className="hint">Memuat cabang…</span>;

  return (
    <>

      {buka && (
        <div className="card consumable-card">
          <b>Cabang baru</b>
          <Field label="Nama cabang" htmlFor="c-nama">
            <input id="c-nama" className="input" value={nama} autoFocus maxLength={160}
              onChange={(e) => setNama(e.target.value)} placeholder="cth. Cabang Bekasi" />
          </Field>
          <div className="belum-note">
            Cabang baru lahir kosong — tanpa pengguna, event, maupun katalog.
            Buat akun Koordinatornya lebih dulu agar ada yang bisa mengisinya.
          </div>
          <Button full icon={ICONS.check} disabled={busy || !nama.trim()}
            onClick={() => {
              setBusy(true);
              void api.createCabang(nama.trim())
                .then(() => { say(`Cabang ${nama.trim()} dibuat.`); setNama(''); setBuka(false); return muat(); })
                .catch(() => say('Gagal membuat cabang. Periksa koneksi.'))
                .finally(() => setBusy(false));
            }}>
            Buat cabang
          </Button>
          <button className="link-btn" onClick={() => setBuka(false)}>Batal</button>
        </div>
      )}

      <div className="card panel">
        <div className="panel-head">
          <span className="toolbar-judul">
            {rows.length} cabang
            {rows.some((c) => c.status !== 'active')
              ? ` · ${rows.filter((c) => c.status !== 'active').length} nonaktif` : ''}
          </span>
          {!buka && (
            <Button size="sm" icon={ICONS.plus} onClick={() => setBuka(true)}>Tambah</Button>
          )}
        </div>
        <table className="tabel">
          <thead>
            <tr>
              <th>Nama</th>
              <th className="kol-angka">Pelanggan</th>
              <th className="kol-angka">Event</th>
              <th className="kol-angka">Akun aktif</th>
              <th className="kol-sempit">Dibuat</th>
              <th className="kol-aksi"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr className={c.status === 'active' ? '' : 'nonaktif'} key={c.id}>
                <td data-label="Nama" className="kol-nama">
                  {ubah?.id === c.id ? (
                    <input className="input" value={ubah.nama} autoFocus maxLength={160}
                      onChange={(e) => setUbah({ ...ubah, nama: e.target.value })} />
                  ) : (
                    <>
                      <b>{c.nama}</b>
                      {c.id === tenantSaya && <em>Cabang Anda</em>}
                    </>
                  )}
                </td>
                <td data-label="Pelanggan" className="kol-angka ringkas">{c.pelanggan}<span className="hanya-kartu"> pelanggan</span></td>
                <td data-label="Event" className="kol-angka ringkas">{c.event}<span className="hanya-kartu"> event</span></td>
                <td data-label="Akun aktif" className="kol-angka ringkas">{c.pengguna}<span className="hanya-kartu"> akun</span></td>
                <td data-label="Dibuat" className="kol-sempit ringkas">
                  <span className="hanya-kartu">dibuat </span>
                  {fmtTanggal(c.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="kol-aksi">
                  {ubah?.id === c.id ? (
                    <div className="riwayat-aksi">
                      <Button size="sm" icon={ICONS.check} disabled={!ubah.nama.trim()}
                        onClick={() => void api.updateCabang(c.id, { nama: ubah.nama.trim() })
                          .then(() => { say('Nama cabang diperbarui.'); setUbah(null); return muat(); })
                          .catch(() => say('Gagal menyimpan.'))}>Simpan</Button>
                      <button className="link-btn sm" onClick={() => setUbah(null)}>Batal</button>
                    </div>
                  ) : (
                    <div className="riwayat-aksi">
                      <button className="ikon-btn" aria-label={`Ubah nama ${c.nama}`}
                        onClick={() => setUbah({ id: c.id, nama: c.nama })}>
                        <Icon d={ICONS.pencil} size={16} />
                      </button>
                      {/* Cabang sendiri tidak ditawari nonaktif: server menolaknya,
                          dan menawarkan lalu menolak hanya memindahkan penjelasan. */}
                      {c.id !== tenantSaya && (
                        <button className="ikon-btn"
                          aria-label={`${c.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'} ${c.nama}`}
                          title={c.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => void api.updateCabang(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })
                            .then(() => { say('Status cabang diperbarui.'); return muat(); })
                            .catch(() => say('Gagal menyimpan.'))}>
                          <Icon d={c.status === 'active' ? ICONS.x : ICONS.check} size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <small className="hint">
        Cabang tidak bisa dihapus — datanya milik pasien yang pernah dilayani
        di sana. Nonaktifkan bila sudah tidak beroperasi.
      </small>
    </>
  );
}
