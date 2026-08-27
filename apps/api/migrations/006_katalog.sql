-- Katalog produk dan layanan per cabang.
--
-- `transaksi.nama` selama ini teks bebas. Akibatnya "Paket herbal sendi",
-- "paket herbal sendi", dan "Paket Herbal Sendi" adalah tiga barang berbeda
-- bagi basis data — tidak ada satu pun laporan per produk yang bisa dipercaya,
-- dan harga yang sama harus diketik ulang setiap transaksi.
--
-- Katalog memperbaiki itu di hulu. Transaksi tetap menyimpan nama dan harga
-- apa adanya (lihat catatan di bawah), jadi data lama tidak perlu ditebak
-- ulang dan barang di luar katalog tetap bisa dicatat.

create table katalog (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  jenis      jenis_transaksi not null default 'produk',
  nama       text not null,
  -- Harga acuan. Transaksi tetap menyalin harganya sendiri: harga katalog
  -- berubah dari waktu ke waktu, dan nota lama tidak boleh ikut berubah
  -- hanya karena daftar harganya diperbarui.
  harga      bigint not null default 0 check (harga >= 0),
  catatan    text,
  -- Barang yang berhenti dijual dinonaktifkan, bukan dihapus: transaksi lama
  -- masih menunjuk padanya, dan riwayat belanja harus tetap terbaca.
  aktif      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nama unik per cabang per jenis. Inilah yang mencegah katalog sendiri
-- menumbuhkan duplikat yang justru ingin dihilangkan.
create unique index katalog_nama_key on katalog (tenant_id, jenis, lower(nama));
create index katalog_aktif_idx on katalog (tenant_id, aktif, jenis);

create trigger katalog_touch before update on katalog
  for each row execute function touch_updated_at();

-- Transaksi menunjuk ke katalog bila memang berasal dari sana. Boleh null:
-- barang yang tidak ada di katalog tetap harus bisa dicatat di lapangan,
-- karena menolak mencatat penjualan yang sudah terjadi adalah kehilangan data.
alter table transaksi
  add column katalog_id uuid references katalog(id) on delete set null;
create index transaksi_katalog_idx on transaksi (katalog_id);

-- ===================== Row Level Security (§4.5.5) =====================
--
-- PERHATIAN — policy ini SENGAJA berbeda dari tabel operasional.
--
-- Di tabel lain, Admin Pusat boleh MEMBACA lintas cabang tetapi tidak MENULIS
-- (`with check (tenant_id = app_tenant_id())`), dan ada uji yang menjaganya.
-- Alasannya: Admin Pusat tidak boleh bisa mengarang peserta, pengukuran, atau
-- transaksi di cabang yang tidak ia layani.
--
-- Katalog adalah konfigurasi, bukan catatan pelayanan. Mengelola daftar produk
-- seluruh cabang dari pusat adalah permintaan eksplisit pemilik produk, dan
-- salah tulis di sini tidak memalsukan apa pun yang pernah terjadi pada
-- seorang pasien — paling jauh ia memunculkan pilihan yang keliru di form.
-- Setiap penulisan lintas cabang tetap tercatat di audit log beserta cabang
-- tujuannya.
--
-- Bila kelak ada tabel master lain, keputusan ini harus diambil ulang secara
-- sadar untuk tabel itu, bukan disalin karena "katalog begitu".
alter table katalog enable row level security;
alter table katalog force row level security;
create policy katalog_tenant_isolation on katalog
  using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
  with check (tenant_id = app_tenant_id() or app_role() = 'admin_pusat');

-- ======================= isi awal dari data lama =======================
-- Nama produk yang sudah pernah dipakai menjadi entri katalog, dengan harga
-- satuan terakhir sebagai acuan. Lebih baik katalog lahir berisi apa yang
-- benar-benar dijual cabang itu daripada kosong dan menunggu diketik ulang.
insert into katalog (tenant_id, jenis, nama, harga, catatan)
select distinct on (t.tenant_id, t.jenis, lower(btrim(t.nama)))
       t.tenant_id, t.jenis, btrim(t.nama), t.harga_satuan,
       'Dibuat otomatis dari transaksi yang sudah tercatat'
  from transaksi t
 where btrim(t.nama) <> ''
 order by t.tenant_id, t.jenis, lower(btrim(t.nama)), t.created_at desc;

update transaksi t
   set katalog_id = k.id
  from katalog k
 where k.tenant_id = t.tenant_id
   and k.jenis = t.jenis
   and lower(k.nama) = lower(btrim(t.nama));
