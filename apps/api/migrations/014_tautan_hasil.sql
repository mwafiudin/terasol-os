-- ============================================================================
-- 014 — tautan hasil yang bisa dibagikan ke peserta
-- ============================================================================
--
-- Peserta tidak punya akun dan tidak akan pernah punya. Supaya ia bisa membaca
-- hasilnya sendiri di HP-nya — dan mencetaknya jadi PDF di sana — hasilnya
-- harus bisa dibuka tanpa login. Itu berarti menerbitkan data kesehatan ke
-- sebuah URL, dan seluruh isi tabel ini adalah pagar di sekelilingnya.
--
-- Empat pagar itu:
--
--   1. TOKEN ACAK, bukan id pelanggan. Id pelanggan muncul di URL layar
--      petugas dan bisa tertebak dari record lain; token 32 byte acak tidak.
--   2. KEDALUWARSA wajib. Data kesehatan tidak boleh menetap di URL selamanya
--      hanya karena satu pesan WhatsApp tidak pernah dihapus dari HP orang.
--   3. BISA DICABUT. Tautan yang salah kirim harus bisa dimatikan sekarang
--      juga, bukan ditunggu kedaluwarsa.
--   4. JEJAK DIBUKA. Berapa kali dan kapan terakhir. Bukan untuk analitik —
--      untuk menjawab "apakah tautan ini pernah dibuka orang lain" saat ada
--      yang perlu ditanyakan.
--
-- Satu tautan aktif per pelanggan (indeks parsial di bawah): membagikan ulang
-- memperbarui yang ada, bukan menebar tautan baru yang semuanya tetap hidup.
create table if not exists tautan_hasil (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  pelanggan_id    uuid not null references pelanggan(id) on delete cascade,
  token           text not null unique check (length(token) between 32 and 128),
  kedaluwarsa     timestamptz not null,
  dicabut_at      timestamptz,
  dibuka_kali     integer not null default 0,
  dibuka_terakhir timestamptz,
  dibuat_oleh     uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index tautan_hasil_pelanggan_idx on tautan_hasil (pelanggan_id);
create unique index tautan_hasil_satu_aktif
  on tautan_hasil (pelanggan_id) where dicabut_at is null;

-- ============================== RLS ==============================
--
-- Rute publik TIDAK memintas RLS. Ia menukar token menjadi tenant_id lewat
-- satu query tanpa konteks, lalu membaca hasilnya melalui `withTenant` seperti
-- rute lain — jadi kalau tokennya salah tenant, RLS-lah yang menahannya, bukan
-- kebenaran satu baris kode. Pagar yang sudah ada dipakai ulang, bukan
-- dibangun kedua kalinya di tempat yang lebih mudah keliru.
alter table tautan_hasil enable row level security;
alter table tautan_hasil force row level security;

create policy tautan_hasil_baca on tautan_hasil for select
  using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat');

-- Petugas ikut boleh membuat: yang membagikan hasil adalah orang yang berdiri
-- di depan pesertanya saat itu, bukan Koordinator yang sedang di kantor.
create policy tautan_hasil_buat on tautan_hasil for insert
  with check (tenant_id = app_tenant_id());

create policy tautan_hasil_ubah on tautan_hasil for update
  using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
  with check (tenant_id = app_tenant_id() or app_role() = 'admin_pusat');
