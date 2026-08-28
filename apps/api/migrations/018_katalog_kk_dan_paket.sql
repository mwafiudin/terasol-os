-- ============================================================================
-- 018 — katalog berasal dari daftar KK, dan paket bisa membundel isinya
-- ============================================================================
--
-- Ada DUA daftar produk di aplikasi ini, dan yang satu lahir tanpa ada yang
-- memintanya. Daftar KK (52 SKU, lengkap dengan kandungan, aturan pakai, dan
-- harga toko) adalah yang sengaja dikumpulkan. Tabel `katalog` justru terisi
-- sendiri dari transaksi: petugas mengetik "Paket terapi 4 sesi" di form
-- pembelian, dan namanya menjadi baris katalog baru.
--
-- Akibatnya bisa ditebak — katalog berisi ejaan-ejaan yang tidak pernah
-- diputuskan siapa pun, dan laporan per produk memecah barang yang sama
-- menjadi beberapa baris karena spasi atau huruf besarnya berbeda.
--
-- Dua kolom yang membereskannya:
--
--   `kode`   — SKU dari daftar KK. Inilah yang membuat impor ulang MEMPERBARUI
--              baris yang sudah ada alih-alih menumpuk salinan, dan yang
--              menyambungkan katalog cabang ke keterangan produk di aplikasi.
--   `sumber` — 'kk' bila berasal dari daftar resmi, 'cabang' bila layanan yang
--              memang hanya ada di cabang itu (terapi, sewa alat). Keduanya sah;
--              yang tidak sah adalah baris yang lahir tanpa disengaja.
--
-- Baris yang sudah ada menjadi 'cabang'. TIDAK dihapus dan tidak dinonaktifkan:
-- transaksi lama menunjuk padanya, dan riwayat belanja orang harus tetap
-- terbaca. Yang dihentikan adalah kelahiran barisnya, bukan barisnya.
alter table katalog
  add column if not exists kode text,
  add column if not exists sumber text not null default 'cabang'
    check (sumber in ('kk', 'cabang'));

-- Satu SKU sekali saja per cabang. Parsial karena hanya baris KK yang punya
-- kode; layanan cabang tidak, dan tidak boleh saling menghalangi.
create unique index if not exists katalog_kode_key
  on katalog (tenant_id, kode) where kode is not null;

-- ============================== isi paket ==============================
--
-- Paket adalah baris katalog berjenis 'paket' yang menunjuk baris katalog
-- lain. Bukan tabel produk tersendiri: sebuah paket dijual, dicatat di
-- transaksi, dan dinonaktifkan dengan cara yang sama persis seperti produk —
-- membuatnya entitas terpisah berarti menulis ulang ketiganya.
--
-- Isinya boleh produk MAUPUN terapi. Itu memang gunanya: "3 sesi terapi +
-- 1 botol CN" adalah bentuk yang paling sering ditawarkan, dan sebelum ini
-- ia hanya bisa dicatat sebagai satu nama panjang yang tidak bisa dilaporkan
-- per barang.
create table if not exists paket_isi (
  paket_id   uuid not null references katalog(id) on delete cascade,
  katalog_id uuid not null references katalog(id) on delete restrict,
  jumlah     integer not null default 1 check (jumlah > 0),
  primary key (paket_id, katalog_id),
  -- Paket tidak boleh memuat dirinya sendiri. Ini menahan lingkaran yang
  -- paling pendek dan paling mungkin terjadi; lingkaran yang lebih panjang
  -- (A memuat B, B memuat A) ditahan aplikasi, karena CHECK tidak bisa
  -- menelusuri baris lain.
  constraint paket_isi_bukan_diri check (paket_id <> katalog_id)
);

create index paket_isi_katalog_idx on paket_isi (katalog_id);

alter table paket_isi enable row level security;
alter table paket_isi force row level security;

-- Tidak punya tenant_id sendiri: kepemilikannya diturunkan dari paketnya.
-- Menyalin tenant_id ke sini berarti membuka kemungkinan keduanya berbeda,
-- dan baris yang tenant-nya bertentangan dengan induknya adalah keadaan yang
-- tidak punya arti sama sekali.
create policy paket_isi_semua on paket_isi for all
  using (exists (
    select 1 from katalog k
     where k.id = paket_isi.paket_id
       and (k.tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
  ))
  with check (exists (
    select 1 from katalog k where k.id = paket_isi.paket_id and k.tenant_id = app_tenant_id()
  ));
