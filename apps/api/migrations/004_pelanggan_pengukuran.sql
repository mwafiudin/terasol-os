-- Riwayat pelanggan, pengukuran per baris, penugasan petugas, dan transaksi.
--
-- Model lama tidak bisa menopang apa yang dibutuhkan:
--   * `participants` terikat satu event, jadi orang yang sama datang dua kali
--     tercatat sebagai dua orang asing — mustahil memantau perubahannya.
--   * `screenings` memakai kolom tetap 1:1, jadi tidak bisa menyimpan dua
--     pembacaan gula darah dalam satu kunjungan (puasa dan 2 jam setelah makan
--     adalah angka yang berbeda dan tidak sebanding).
--   * Petugas hanya teks bebas di event, sehingga tidak ada yang tahu siapa
--     yang benar-benar mengukur.
--
-- Keputusan: riwayat tetap PER CABANG. `pelanggan` bertenant, dan RLS-nya sama
-- ketatnya dengan tabel lain. Admin Pusat melihat lintas cabang lewat policy
-- yang sudah ada, bukan lewat data yang dibagi.

-- ============================== pelanggan ==============================
create table pelanggan (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nama       text not null,
  gender     gender not null,
  usia       smallint check (usia is null or usia between 0 and 130),
  hp         text not null,
  catatan    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  erased_at  timestamptz
);
-- Kunci orang di dalam satu cabang adalah nomor HP-nya, sama seperti kunci
-- dedup peserta (§4.3). Sengaja bukan unique: nomor bisa dipakai berdua
-- (suami-istri, orang tua-anak), dan menolaknya akan menghalangi pelayanan.
create index pelanggan_hp_idx on pelanggan (tenant_id, hp) where erased_at is null;
create index pelanggan_nama_idx on pelanggan (tenant_id, lower(nama));
create trigger pelanggan_touch before update on pelanggan
  for each row execute function touch_updated_at();

-- Peserta event kini menjadi "kunjungan" milik seorang pelanggan.
alter table participants
  add column pelanggan_id uuid references pelanggan(id) on delete restrict;
create index participants_pelanggan_idx on participants (pelanggan_id);

-- ============================== pengukuran ==============================
create type jenis_ukur as enum (
  'tinggi', 'berat', 'lingkar_perut',
  'sistolik', 'diastolik', 'nadi',
  'gula', 'kolesterol', 'asam_urat'
);

create table pengukuran (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  pelanggan_id   uuid not null references pelanggan(id) on delete cascade,
  -- Kunjungan asalnya. Boleh null untuk pengukuran di luar event.
  participant_id uuid references participants(id) on delete set null,
  client_id      uuid not null,
  jenis          jenis_ukur not null,
  -- Konteks hanya bermakna untuk gula darah: puasa / sewaktu / 2 jam setelah
  -- makan. Tanpa ini angkanya tidak bisa dibandingkan satu sama lain.
  konteks        text,
  nilai          numeric(6,1) not null,
  diukur_pada    timestamptz not null default now(),
  -- PIC: siapa yang benar-benar mengukur, bukan sekadar siapa yang login.
  diukur_oleh    uuid references users(id) on delete set null,
  out_of_range   boolean not null default false,
  catatan        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint pengukuran_konteks_hanya_gula
    check (konteks is null or jenis = 'gula'),
  constraint pengukuran_konteks_valid
    check (konteks is null or konteks in ('puasa', 'sewaktu', '2jam_pp')),
  -- Batas kewarasan, bukan rentang rujukan. Nilai di luar rentang wajar tetap
  -- boleh tersimpan setelah petugas konfirmasi (US-03).
  constraint pengukuran_nilai_masuk_akal check (nilai >= 0 and nilai <= 1000)
);
create unique index pengukuran_tenant_client_key on pengukuran (tenant_id, client_id);
create index pengukuran_riwayat_idx on pengukuran (pelanggan_id, jenis, diukur_pada desc);
create index pengukuran_participant_idx on pengukuran (participant_id);
create trigger pengukuran_touch before update on pengukuran
  for each row execute function touch_updated_at();

-- ========================= petugas ditugaskan =========================
-- Menggantikan kolom teks bebas `events.petugas`, yang tidak bisa dihubungkan
-- ke siapa pun. Kolom lamanya dibiarkan sebagai catatan historis.
create table event_petugas (
  event_id   uuid not null references events(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_petugas_tenant_idx on event_petugas (tenant_id);

-- ============================== transaksi ==============================
create type jenis_transaksi as enum ('produk', 'terapi', 'paket');

create table transaksi (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  pelanggan_id   uuid not null references pelanggan(id) on delete cascade,
  -- Kunjungan yang memicunya, bila transaksinya lahir dari sebuah event.
  participant_id uuid references participants(id) on delete set null,
  client_id      uuid not null,
  jenis          jenis_transaksi not null default 'produk',
  nama           text not null,
  jumlah         integer not null default 1 check (jumlah > 0),
  harga_satuan   bigint not null check (harga_satuan >= 0),
  total          bigint generated always as (jumlah * harga_satuan) stored,
  tanggal        date not null default current_date,
  dicatat_oleh   uuid references users(id) on delete set null,
  catatan        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index transaksi_tenant_client_key on transaksi (tenant_id, client_id);
create index transaksi_pelanggan_idx on transaksi (pelanggan_id, tanggal desc);
create trigger transaksi_touch before update on transaksi
  for each row execute function touch_updated_at();

-- ===================== Row Level Security (§4.5.5) =====================
do $$
declare t text;
begin
  foreach t in array array['pelanggan', 'pengukuran', 'event_petugas', 'transaksi'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$
      create policy %1$s_tenant_isolation on %1$I
        using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
        with check (tenant_id = app_tenant_id())
    $p$, t);
  end loop;
end $$;

-- ======================= backfill dari data lama =======================
-- Satu pelanggan per (tenant, hp, nama) dari peserta yang sudah ada.
insert into pelanggan (tenant_id, nama, gender, usia, hp, created_at)
select distinct on (p.tenant_id, p.hp, lower(p.nama))
       p.tenant_id, p.nama, p.gender, p.usia, p.hp, min(p.created_at) over (
         partition by p.tenant_id, p.hp, lower(p.nama)
       )
  from participants p
 where p.deleted_at is null
 order by p.tenant_id, p.hp, lower(p.nama), p.created_at;

update participants p
   set pelanggan_id = c.id
  from pelanggan c
 where c.tenant_id = p.tenant_id
   and c.hp = p.hp
   and lower(c.nama) = lower(p.nama)
   and p.pelanggan_id is null;

-- Screening lama dipecah jadi baris pengukuran. Gula darah lama tidak punya
-- konteks; ditandai 'sewaktu' karena itulah yang realistis di event screening,
-- dan diberi catatan agar asal-usulnya tidak hilang.
insert into pengukuran (tenant_id, pelanggan_id, participant_id, client_id,
                        jenis, konteks, nilai, diukur_pada, out_of_range, catatan)
select s.tenant_id, p.pelanggan_id, s.participant_id, gen_random_uuid(),
       v.jenis::jenis_ukur,
       case when v.jenis = 'gula' then 'sewaktu' end,
       v.nilai, s.measured_at, s.out_of_range,
       case when v.jenis = 'gula' then 'Konteks diasumsikan sewaktu (data sebelum konteks dicatat)' end
  from screenings s
  join participants p on p.id = s.participant_id
 cross join lateral (values
        ('tinggi',     s.tinggi),
        ('berat',      s.berat),
        ('sistolik',   s.sistolik::numeric),
        ('diastolik',  s.diastolik::numeric),
        ('gula',       s.gula::numeric),
        ('kolesterol', s.kolesterol::numeric),
        ('asam_urat',  s.asam_urat)
      ) as v(jenis, nilai)
 where v.nilai is not null
   and p.pelanggan_id is not null;

-- Konversi lama yang berstatus membeli dijadikan transaksi, supaya riwayat
-- belanja tidak dimulai dari nol.
insert into transaksi (tenant_id, pelanggan_id, participant_id, client_id, jenis,
                       nama, jumlah, harga_satuan, tanggal, catatan)
select cv.tenant_id, p.pelanggan_id, cv.participant_id, gen_random_uuid(), 'produk',
       coalesce(nullif(btrim(cv.produk), ''), 'Produk tidak dirinci'),
       1, cv.nilai_transaksi, e.tanggal,
       'Dipindahkan dari catatan konversi lama'
  from conversions cv
  join participants p on p.id = cv.participant_id
  join events e on e.id = p.event_id
 where cv.status = 'membeli'
   and cv.nilai_transaksi > 0
   and p.pelanggan_id is not null;
