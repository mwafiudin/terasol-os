import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Field, Icon, ICONS, InputRupiah, MenuAksi, PageHead, Paginasi, SegTabs, Sheet,
  usePaginasi,
} from '../components/ui';
import { api, ApiError, type CabangRow, type JenisTransaksi, type KatalogRow, type PenggunaRow } from '../lib/api';
import { ROLE_LABEL, fmtTanggal, rp } from '../lib/domain';
import { PRODUK } from '../lib/produk';
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
      {tab === 'tim' && <TabTim pusat={pusat} />}
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
  const [impor, setImpor] = useState(false);
  /** Paket yang sedang disunting isinya; null berarti tidak ada. */
  const [isiPaket, setIsiPaket] = useState<KatalogRow | null>(null);

  const muat = useCallback(async () => {
    setGagal(null);
    try { setRows((await api.katalog({ semua })).katalog); }
    catch { setGagal('Gagal memuat katalog. Periksa koneksi.'); setRows([]); }
  }, [semua]);

  async function imporKk() {
    setImpor(true);
    try {
      const hasil = await api.imporKatalog(PRODUK.map((p) => ({
        kode: p.id,
        nama: p.nama,
        jenis: 'produk' as const,
        // Produk yang harganya belum tercatat di toko resmi masuk dengan 0 —
        // "belum diatur" lebih jujur daripada menebak, dan Koordinator bisa
        // mengisinya sendiri.
        harga: p.harga ?? 0,
      })));
      say(hasil.baru > 0
        ? `${hasil.baru} produk ditambahkan, ${hasil.diperbarui} diperbarui.`
        : `${hasil.diperbarui} produk diperbarui.`);
      await muat();
    } catch { say('Gagal mengimpor. Periksa koneksi.'); }
    finally { setImpor(false); }
  }

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

  const jumlahKk = rows.filter((k) => k.sumber === 'kk').length;

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

        {/* Impor daftar KK.
            Daftarnya hidup di aplikasi ini (`lib/produk.ts`), lengkap dengan
            kandungan dan aturan pakainya; yang dikirim ke katalog cabang hanya
            kode, nama, jenis, dan harganya. Idempoten — menekannya dua kali
            memperbarui, bukan menggandakan. */}
        {!semua && (
          <div className="impor-kk">
            <span>
              <b>{jumlahKk} dari {PRODUK.length} produk KK ada di katalog cabang ini</b>
              <em>
                Impor menambah yang belum ada dan memperbarui nama serta harganya.
                Barang yang sudah dinonaktifkan tetap nonaktif.
              </em>
            </span>
            <Button size="sm" variant="secondary" icon={ICONS.download}
              disabled={impor} onClick={() => void imporKk()}>
              {impor ? 'Mengimpor…' : jumlahKk === 0 ? 'Impor daftar KK' : 'Perbarui dari KK'}
            </Button>
          </div>
        )}

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
                          {k.jenis === 'paket' && (
                            <em>
                              {k.isi.length === 0
                                ? 'Isinya belum diatur'
                                : k.isi.map((x) => `${x.jumlah}× ${x.nama}`).join(' + ')}
                            </em>
                          )}
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
                              <MenuAksi label={`Aksi untuk ${k.nama}`} aksi={[
                                // Hanya paket yang punya isi untuk disunting;
                                // menawarkannya pada produk berarti membuka
                                // layar yang tidak bisa diisi apa pun.
                                ...(k.jenis === 'paket' ? [{
                                  label: 'Atur isi paket', ikon: ICONS.cart,
                                  onPilih: () => setIsiPaket(k),
                                }] : []),
                                { label: 'Ubah', ikon: ICONS.pencil, onPilih: () => setForm({ awal: k }) },
                                {
                                  label: k.aktif ? 'Nonaktifkan' : 'Aktifkan',
                                  ikon: k.aktif ? ICONS.x : ICONS.check,
                                  onPilih: () => void setAktif(k, !k.aktif),
                                },
                                // Yang sudah menempel pada transaksi tidak ditawari
                                // hapus sama sekali: menawarkan lalu menolak hanya
                                // memindahkan penjelasan ke saat yang lebih buruk.
                                ...(k.terpakai === 0 ? [{
                                  label: 'Hapus', ikon: ICONS.trash, bahaya: true,
                                  onPilih: () => setKonfirmHapus(k.id),
                                }] : []),
                              ]} />
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

      {isiPaket && (
        <FormIsiPaket paket={isiPaket} katalog={rows}
          onTutup={() => setIsiPaket(null)}
          onSelesai={() => { setIsiPaket(null); void muat(); }} />
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

/**
 * Peran yang boleh diberikan oleh peran yang sedang masuk.
 *
 * Cerminan dari `bolehBeriPeran` di server, bukan penggantinya: server tetap
 * menolak sendiri. Yang dikerjakan di sini hanya tidak menawarkan pilihan yang
 * pasti ditolak — pagar tampilan yang dianggap pagar sungguhan adalah pagar
 * yang bisa dilangkahi lewat satu permintaan HTTP.
 */
function peranTersedia(pemanggil: Role | undefined): Role[] {
  const dasar: Role[] = ['petugas', 'koordinator'];
  return pemanggil === 'admin_pusat' ? [...dasar, 'admin_pusat'] : dasar;
}

function TabTim({ pusat }: { pusat: boolean }) {
  const { say, user } = useApp();
  const [rows, setRows] = useState<PenggunaRow[] | null>(null);
  const [cabang, setCabang] = useState<CabangRow[]>([]);
  const [cari, setCari] = useState('');
  const [filterCabang, setFilterCabang] = useState('');
  const [buka, setBuka] = useState(false);
  const [kelola, setKelola] = useState<PenggunaRow | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGagal(null);
    try { setRows((await api.users({ cari, cabang: filterCabang || undefined })).users); }
    catch { setGagal('Gagal memuat daftar akun. Periksa koneksi.'); setRows([]); }
  }, [cari, filterCabang]);

  // Ketikan pencarian ditahan sejenak: satu permintaan per huruf akan membanjiri
  // server dan membuat hasilnya tiba tidak berurutan.
  useEffect(() => {
    const t = setTimeout(() => void muat(), cari ? 300 : 0);
    return () => clearTimeout(t);
  }, [muat, cari]);

  useEffect(() => {
    if (pusat) void api.cabang().then((r) => setCabang(r.cabang)).catch(() => setCabang([]));
  }, [pusat]);

  // Dipanggil sebelum early-return di bawah: hook tidak boleh dilewati pada
  // sebagian render. Daftar akun tumbuh terus, dan bagi Admin Pusat ia memuat
  // seluruh cabang sekaligus.
  const halaman = usePaginasi(rows ?? [], 15);

  if (rows === null) return <span className="hint">Memuat tim…</span>;

  const aktif = rows.filter((u) => u.active).length;
  const nonaktif = rows.length - aktif;

  return (
    <>
      {buka && (
        <FormAkun
          pusat={pusat}
          cabang={cabang}
          peran={peranTersedia(user?.role)}
          onBatal={() => setBuka(false)}
          onSelesai={async (nama) => { setBuka(false); say(`Akun ${nama} dibuat.`); await muat(); }}
        />
      )}

      <div className="card panel">
        <div className="panel-head">
          <span className="toolbar-judul">
            {aktif} akun aktif{nonaktif > 0 ? ` · ${nonaktif} nonaktif` : ''}
          </span>
          {!buka && (
            <Button size="sm" icon={ICONS.userPlus} onClick={() => setBuka(true)}>Tambah</Button>
          )}
        </div>

        <div className="saring">
          <input className="input" type="search" value={cari} placeholder="Cari nama atau email…"
            aria-label="Cari akun" onChange={(e) => setCari(e.target.value)} />
          {pusat && cabang.length > 0 && (
            <select className="input" value={filterCabang} aria-label="Saring cabang"
              onChange={(e) => setFilterCabang(e.target.value)}>
              <option value="">Semua cabang</option>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          )}
        </div>

        {gagal && <span className="hint">{gagal}</span>}

        {rows.length === 0 ? (
          <span className="hint">
            {cari || filterCabang ? 'Tidak ada akun yang cocok.' : 'Belum ada akun.'}
          </span>
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                {pusat && <th className="kol-sempit">Cabang</th>}
                <th className="kol-sempit">Peran</th>
                <th className="kol-sempit">Status</th>
                <th className="kol-aksi"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {halaman.potong.map((u) => (
                <tr className={u.active ? '' : 'nonaktif'} key={u.id}>
                  <td data-label="Nama" className="kol-nama">
                    <b>{u.nama}</b>
                    {u.id === user?.id && <em>Akun Anda</em>}
                  </td>
                  <td data-label="Email" className="ringkas">{u.email}</td>
                  {pusat && <td data-label="Cabang" className="kol-sempit ringkas">{u.cabang}</td>}
                  <td data-label="Peran" className="kol-sempit ringkas">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td data-label="Status" className="kol-sempit ringkas">
                    <span className={`vonis ${u.active ? 'vonis-normal' : 'vonis-netral'}`}>
                      {u.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="kol-aksi">
                    <Button size="sm" variant="secondary" onClick={() => setKelola(u)}>Kelola</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginasi {...halaman} satuan="akun" onPindah={halaman.setHal} />
      </div>

      {kelola && (
        <SheetAkun
          akun={kelola}
          sendiri={kelola.id === user?.id}
          peran={peranTersedia(user?.role)}
          onTutup={() => setKelola(null)}
          onBerubah={async (pesan) => { say(pesan); await muat(); }}
        />
      )}

      <small className="hint">
        Menonaktifkan akun langsung mencabut sesi di semua perangkatnya.
        {pusat && ' Sebagai Admin Pusat, daftar ini memuat akun seluruh cabang.'}
      </small>
    </>
  );
}

/* --------------------------- akun baru --------------------------- */

function FormAkun({ pusat, cabang, peran, onBatal, onSelesai }: {
  pusat: boolean;
  cabang: CabangRow[];
  peran: Role[];
  onBatal: () => void;
  onSelesai: (nama: string) => Promise<void>;
}) {
  const { say, user } = useApp();
  const [f, setF] = useState({
    nama: '', email: '', password: '',
    role: 'petugas' as Role,
    // Bawaannya cabang sendiri. Admin Pusat yang lupa menggantinya tetap
    // mendapatkan perilaku lama, bukan akun yang mendarat di cabang acak.
    tenantId: user?.tenantId ?? '',
  });
  const [busy, setBusy] = useState(false);

  async function tambah() {
    if (!f.nama.trim() || !f.email.trim() || f.password.length < 8) {
      say('Lengkapi nama, email, dan kata sandi minimal 8 karakter.');
      return;
    }
    setBusy(true);
    try {
      await api.createUser({
        nama: f.nama.trim(), email: f.email.trim(), password: f.password, role: f.role,
        ...(pusat && f.tenantId ? { tenantId: f.tenantId } : {}),
      });
      await onSelesai(f.nama.trim());
    } catch (err) {
      say(err instanceof ApiError && (err.status === 409 || err.status === 403)
        ? err.message
        : 'Gagal membuat akun. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  return (
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

      {/* Tanpa pemilih ini, cabang yang baru dibuka tidak akan pernah punya
          koordinator pertamanya — akunnya selalu lahir di cabang si pembuat. */}
      {pusat && cabang.length > 0 && (
        <Field label="Cabang" htmlFor="t-cabang">
          <select id="t-cabang" className="input" value={f.tenantId}
            onChange={(e) => setF({ ...f, tenantId: e.target.value })}>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}{c.status === 'inactive' ? ' (nonaktif)' : ''}
              </option>
            ))}
          </select>
        </Field>
      )}

      <PilihPeran peran={peran} nilai={f.role} onPilih={(role) => setF({ ...f, role })} />

      <Button full icon={ICONS.check} disabled={busy} onClick={() => void tambah()}>Buat akun</Button>
      <button className="link-btn" onClick={onBatal}>Batal</button>
    </div>
  );
}

function PilihPeran({ peran, nilai, onPilih, nonaktif }: {
  peran: Role[]; nilai: Role; onPilih: (r: Role) => void; nonaktif?: boolean;
}) {
  return (
    <div className="field">
      <label>Peran</label>
      <div className="pill-row">
        {peran.map((r) => (
          <button key={r} disabled={nonaktif}
            className={`pill-choice ${nilai === r ? 'on' : ''}`}
            onClick={() => onPilih(r)}>{ROLE_LABEL[r] ?? r}</button>
        ))}
      </div>
      {nilai === 'admin_pusat' && (
        <small className="field-bantu">
          Admin Pusat membaca data seluruh cabang dan dapat mengelola akun di mana pun.
        </small>
      )}
    </div>
  );
}

/* --------------------------- kelola akun --------------------------- */

/**
 * Satu tempat untuk semua tindakan atas satu akun.
 *
 * Sebelumnya barisnya hanya punya tombol Nonaktifkan, dan mengubah peran atau
 * memulihkan sandi tidak mungkin dilakukan dari aplikasi meski rutenya sudah
 * menerima keduanya. Ditaruh di lembar, bukan sebagai tiga tombol per baris:
 * tabel dengan tiga tombol di tiap baris tidak muat di ponsel, dan tindakan
 * yang jarang dipakai tidak layak menempati kolom permanen.
 */
function SheetAkun({ akun, sendiri, peran, onTutup, onBerubah }: {
  akun: PenggunaRow;
  sendiri: boolean;
  peran: Role[];
  onTutup: () => void;
  onBerubah: (pesan: string) => Promise<void>;
}) {
  const { say } = useApp();
  const [nama, setNama] = useState(akun.nama);
  const [role, setRole] = useState<Role>(akun.role);
  const [busy, setBusy] = useState(false);
  const [konfirmSandi, setKonfirmSandi] = useState(false);
  const [sandiBaru, setSandiBaru] = useState<string | null>(null);

  const berubah = nama.trim() !== akun.nama || role !== akun.role;

  async function simpan() {
    if (!nama.trim()) { say('Nama tidak boleh kosong.'); return; }
    setBusy(true);
    try {
      await api.updateUser(akun.id, {
        ...(nama.trim() !== akun.nama ? { nama: nama.trim() } : {}),
        ...(role !== akun.role ? { role } : {}),
      });
      onTutup();
      await onBerubah(`Perubahan pada ${nama.trim()} disimpan.`);
    } catch (err) {
      say(err instanceof ApiError && (err.status === 400 || err.status === 403)
        ? err.message
        : 'Gagal menyimpan. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  async function setAktif(aktif: boolean) {
    setBusy(true);
    try {
      await api.updateUser(akun.id, { active: aktif });
      onTutup();
      await onBerubah(aktif ? `${akun.nama} diaktifkan.` : `${akun.nama} dinonaktifkan.`);
    } catch (err) {
      say(err instanceof ApiError && err.status === 400
        ? err.message
        : 'Gagal menyimpan. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  async function setelUlang() {
    setKonfirmSandi(false);
    setBusy(true);
    try {
      const r = await api.resetPassword(akun.id);
      setSandiBaru(r.password);
      await onBerubah(`Kata sandi ${r.nama} disetel ulang.`);
    } catch (err) {
      say(err instanceof ApiError && err.status === 400
        ? err.message
        : 'Gagal menyetel ulang. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  return (
    <Sheet title={akun.nama} subtitle={`${akun.email} · ${akun.cabang}`} onClose={onTutup}>
      {/* Sandi baru ditampilkan sekali dan tidak bisa diminta ulang — server
          tidak menyimpannya. Diletakkan paling atas supaya tidak terlewat. */}
      {sandiBaru ? (
        <div className="card consumable-card">
          <b>Kata sandi sementara</b>
          <p className="sandi-baru">{sandiBaru}</p>
          <small className="field-bantu">
            Catat sekarang — ini satu-satunya kali sandi ini ditampilkan. Sampaikan
            kepada {akun.nama} dan minta ia menggantinya lewat Pengaturan → Akun
            setelah masuk. Semua sesi perangkatnya sudah keluar.
          </small>
          <Button full variant="secondary" onClick={onTutup}>Selesai</Button>
        </div>
      ) : (
        <>
          <Field label="Nama" htmlFor="k-nama">
            <input id="k-nama" className="input" value={nama}
              onChange={(e) => setNama(e.target.value)} />
          </Field>

          {/* Peran sendiri tidak bisa diubah sendiri: hanya Admin Pusat yang
              dapat mengangkat Admin Pusat, jadi menurunkan diri sendiri adalah
              pintu satu arah. Server menolaknya; di sini cukup dikunci. */}
          <PilihPeran peran={peran} nilai={role} onPilih={setRole} nonaktif={sendiri} />
          {sendiri && (
            <small className="field-bantu">
              Peran akun sendiri tidak dapat diubah. Minta rekan dengan peran setara melakukannya.
            </small>
          )}

          <Button full icon={ICONS.check} disabled={busy || !berubah}
            onClick={() => void simpan()}>Simpan perubahan</Button>

          <div className="sheet-pisah" />

          {konfirmSandi ? (
            <div className="konfirm">
              <span>Setel ulang kata sandi {akun.nama}? Semua perangkatnya akan keluar.</span>
              <div className="konfirm-aksi">
                <Button size="sm" variant="ghost" onClick={() => setKonfirmSandi(false)}>Batal</Button>
                <Button size="sm" disabled={busy} onClick={() => void setelUlang()}>Setel ulang</Button>
              </div>
            </div>
          ) : (
            <Button full variant="secondary" disabled={busy || sendiri}
              onClick={() => setKonfirmSandi(true)}>Setel ulang kata sandi</Button>
          )}
          {sendiri && (
            <small className="field-bantu">
              Ganti kata sandi sendiri lewat Pengaturan → Akun, yang menuntut sandi lama.
            </small>
          )}

          {!sendiri && (
            <Button full variant={akun.active ? 'ghost' : 'secondary'} disabled={busy}
              onClick={() => void setAktif(!akun.active)}>
              {akun.active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ============================= Cabang ============================= */

/**
 * Menyusun isi sebuah paket dari katalog yang sudah ada.
 *
 * Isinya DIPILIH, tidak diketik. Itu inti perubahannya: sebuah paket yang
 * anggotanya diketik hanya menghasilkan nama panjang yang tidak bisa
 * dilaporkan per barang, dan tidak ada yang tahu isinya benar-benar ada di
 * katalog atau tidak.
 */
function FormIsiPaket({ paket, katalog, onTutup, onSelesai }: {
  paket: KatalogRow;
  katalog: KatalogRow[];
  onTutup: () => void;
  onSelesai: () => void;
}) {
  const { say } = useApp();
  const [isi, setIsi] = useState(paket.isi.map((x) => ({ katalogId: x.katalogId, jumlah: x.jumlah })));
  const [busy, setBusy] = useState(false);

  // Paket tidak boleh memuat paket. Ditahan juga di server; di sini supaya
  // pilihannya memang tidak pernah muncul, bukan muncul lalu ditolak.
  const bisa = katalog.filter((k) => k.jenis !== 'paket' && k.aktif && k.tenantId === paket.tenantId);
  const belumDipakai = bisa.filter((k) => !isi.some((x) => x.katalogId === k.id));
  const namaDari = (id: string) => bisa.find((k) => k.id === id)?.nama ?? '(sudah tidak ada)';
  const hargaDari = (id: string) => Number(bisa.find((k) => k.id === id)?.harga ?? 0);
  const totalIsi = isi.reduce((t, x) => t + hargaDari(x.katalogId) * x.jumlah, 0);
  const hargaPaket = Number(paket.harga);

  async function simpan() {
    setBusy(true);
    try {
      await api.setIsiPaket(paket.id, isi);
      say(`Isi "${paket.nama}" tersimpan.`);
      onSelesai();
    } catch { say('Gagal menyimpan isi paket. Periksa koneksi.'); }
    finally { setBusy(false); }
  }

  return (
    <Sheet title="Isi paket" subtitle={paket.nama} onClose={onTutup}>
      {isi.length === 0 && (
        <p className="bagikan-jelas">
          Paket ini belum berisi apa pun. Tambahkan produk atau terapi dari
          katalog di bawah.
        </p>
      )}

      {isi.map((x) => (
        <div className="isi-baris" key={x.katalogId}>
          <span className="isi-nama">{namaDari(x.katalogId)}</span>
          <input className="input isi-jumlah" inputMode="numeric" value={String(x.jumlah)}
            aria-label={`Jumlah ${namaDari(x.katalogId)}`}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/D/g, '')) || 1;
              setIsi(isi.map((y) => (y.katalogId === x.katalogId ? { ...y, jumlah: n } : y)));
            }} />
          <button className="ikon-btn" aria-label={`Keluarkan ${namaDari(x.katalogId)}`}
            onClick={() => setIsi(isi.filter((y) => y.katalogId !== x.katalogId))}>
            <Icon d={ICONS.x} size={16} />
          </button>
        </div>
      ))}

      {belumDipakai.length > 0 && (
        <Field label="Tambahkan dari katalog" htmlFor="p-tambah">
          <select id="p-tambah" className="input" value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setIsi([...isi, { katalogId: e.target.value, jumlah: 1 }]);
            }}>
            <option value="">— pilih produk atau terapi —</option>
            {belumDipakai.map((k) => (
              <option key={k.id} value={k.id}>{k.nama} · {rp(Number(k.harga))}</option>
            ))}
          </select>
        </Field>
      )}

      {isi.length > 0 && (
        <>
          <div className="consumable-total">
            <span>Bila dibeli satuan</span><span>{rp(totalIsi)}</span>
          </div>
          <div className="consumable-total">
            <span>Harga paket</span><span>{rp(hargaPaket)}</span>
          </div>
          {/* Selisihnya disebut apa adanya, termasuk bila paketnya lebih mahal.
              Angka yang hanya ditampilkan saat menguntungkan berhenti menjadi
              angka dan mulai menjadi pemasaran. */}
          <small className="field-bantu">
            {hargaPaket < totalIsi
              ? `Pembeli hemat ${rp(totalIsi - hargaPaket)} dibanding membeli satuan.`
              : hargaPaket > totalIsi
                ? `Paket ini ${rp(hargaPaket - totalIsi)} lebih mahal daripada membeli satuan — periksa harganya.`
                : 'Harga paket sama dengan jumlah harga satuannya.'}
          </small>
        </>
      )}

      <Button full size="lg" icon={ICONS.check} disabled={busy}
        onClick={() => void simpan()}>
        Simpan isi paket
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}

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
                      <MenuAksi label={`Aksi untuk ${c.nama}`} aksi={[
                        {
                          label: 'Ubah nama', ikon: ICONS.pencil,
                          onPilih: () => setUbah({ id: c.id, nama: c.nama }),
                        },
                        // Cabang sendiri tidak ditawari nonaktif: server menolaknya,
                        // dan menawarkan lalu menolak hanya memindahkan penjelasan.
                        ...(c.id !== tenantSaya ? [{
                          label: c.status === 'active' ? 'Nonaktifkan' : 'Aktifkan',
                          ikon: c.status === 'active' ? ICONS.x : ICONS.check,
                          onPilih: () => void api.updateCabang(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })
                            .then(() => { say('Status cabang diperbarui.'); return muat(); })
                            .catch(() => say('Gagal menyimpan.')),
                        }] : []),
                      ]} />
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
