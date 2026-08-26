-- Terasol OS — schema awal (PRD §4.2).
-- Prinsip: tenant_id wajib di setiap tabel operasional, isolasi ditegakkan
-- Row Level Security (§4.5.5) — bukan hanya di level aplikasi.

create extension if not exists pgcrypto;

-- ============================== enum ==============================
create type user_role   as enum ('petugas', 'koordinator', 'admin_pusat');
create type event_tipe  as enum ('gratis', 'berbayar');
create type event_status as enum ('planned', 'active', 'done', 'archived');
create type gender      as enum ('P', 'L');
create type conv_status as enum ('baru', 'dihubungi', 'membeli', 'batal');

-- ======================= helper: konteks request =======================
-- API menyetel app.tenant_id / app.role / app.user_id per transaksi
-- (SET LOCAL), lalu policy di bawah membacanya.
create or replace function app_tenant_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.tenant_id', true), '')::uuid
  $$;

create or replace function app_role() returns text
  language sql stable as $$
    select coalesce(nullif(current_setting('app.role', true), ''), 'none')
  $$;

create or replace function app_user_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.user_id', true), '')::uuid
  $$;

create or replace function touch_updated_at() returns trigger
  language plpgsql as $$
    begin new.updated_at := now(); return new; end;
  $$;

-- ============================== tenants ==============================
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================== users ==============================
create table users (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  email         text not null,
  password_hash text not null,
  nama          text not null,
  role          user_role not null default 'petugas',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create index users_tenant_idx on users (tenant_id);

-- ===================== device sessions (§4.4, §4.5.4) =====================
-- Autentikasi per perangkat. Revoke + wipe_requested memicu penghapusan
-- data lokal saat perangkat berikutnya online (remote wipe).
create table device_sessions (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  user_id            uuid not null references users(id) on delete cascade,
  device_id          text not null,
  device_label       text,
  refresh_token_hash text not null,
  revoked_at         timestamptz,
  wipe_requested     boolean not null default false,
  wiped_at           timestamptz,
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create unique index device_sessions_user_device_key on device_sessions (user_id, device_id);
create index device_sessions_tenant_idx on device_sessions (tenant_id);

-- ==================== consent texts (§4.5.6 versioning) ====================
create table consent_texts (
  versi      text primary key,
  isi        text not null,
  active     boolean not null default false,
  created_at timestamptz not null default now()
);
-- Hanya satu versi yang boleh aktif.
create unique index consent_texts_one_active on consent_texts (active) where active;

-- ============================== events ==============================
create table events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  client_id   uuid not null,                 -- idempotensi sync (dibuat di perangkat)
  nama        text not null,
  lokasi      text not null,
  tanggal     date not null,
  tipe        event_tipe not null default 'gratis',
  harga_paket integer not null default 0 check (harga_paket >= 0),
  petugas     text,
  status      event_status not null default 'active',
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  constraint events_berbayar_needs_harga
    check (tipe <> 'berbayar' or harga_paket > 0)
);
create unique index events_tenant_client_key on events (tenant_id, client_id);
create index events_tenant_tanggal_idx on events (tenant_id, tanggal desc);
create trigger events_touch before update on events
  for each row execute function touch_updated_at();

-- ============================== participants ==============================
create table participants (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  event_id      uuid not null references events(id) on delete restrict,
  client_id     uuid not null,
  nama          text not null,
  gender        gender not null,
  usia          smallint not null check (usia between 0 and 130),
  hp            text not null,
  -- §4.3: bentrok kunci dedup TIDAK ditimpa — kedua record disimpan,
  -- salah satunya ditandai needs_review untuk resolusi manual.
  needs_review  boolean not null default false,
  created_by    uuid references users(id) on delete set null,
  device_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,                  -- duplikat yang kalah saat resolusi konflik
  -- §4.5.7: penghapusan data peserta atas permintaan. Identitas dibersihkan,
  -- barisnya tetap ada agar rekap historis tidak berubah diam-diam — dan
  -- jejak auditnya tersimpan di audit_log.
  erased_at     timestamptz
);
create unique index participants_tenant_client_key on participants (tenant_id, client_id);
-- Sengaja BUKAN unique: §4.3 mempertahankan kedua record saat bentrok.
create index participants_dedup_idx on participants (event_id, hp) where deleted_at is null;
create index participants_event_idx on participants (event_id) where deleted_at is null;
create trigger participants_touch before update on participants
  for each row execute function touch_updated_at();

-- ===================== consents (immutable, insert-only) =====================
create table consents (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  granted        boolean not null,
  versi_teks     text not null references consent_texts(versi),
  ts             timestamptz not null default now()
);
create index consents_participant_idx on consents (participant_id);

-- §4.2: consent tidak pernah di-update, hanya insert baru.
create or replace function consents_immutable() returns trigger
  language plpgsql as $$
    begin
      raise exception 'consents bersifat immutable — buat record consent baru, jangan ubah/hapus yang lama';
    end;
  $$;
create trigger consents_no_update before update or delete on consents
  for each row execute function consents_immutable();

-- ============================== screenings ==============================
-- Batas CHECK di sini adalah batas kewarasan (menolak data sampah).
-- "Rentang wajar" per parameter divalidasi di UI/API sebagai peringatan yang
-- bisa dikonfirmasi petugas (US-03) — jadi nilai ekstrem tetap bisa tersimpan.
create table screenings (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  client_id      uuid not null,
  tinggi         numeric(5,1) check (tinggi     is null or tinggi     between 50 and 250),
  berat          numeric(5,1) check (berat      is null or berat      between 1  and 400),
  sistolik       smallint     check (sistolik   is null or sistolik   between 30 and 350),
  diastolik      smallint     check (diastolik  is null or diastolik  between 20 and 250),
  gula           smallint     check (gula       is null or gula       between 10 and 1000),
  kolesterol     smallint     check (kolesterol is null or kolesterol between 20 and 800),
  asam_urat      numeric(4,1) check (asam_urat  is null or asam_urat  between 0  and 50),
  -- US-03: IMT dihitung otomatis, tidak pernah diinput manual.
  imt numeric(4,1) generated always as (
    case when tinggi is null or berat is null or tinggi <= 0 then null
         else round(berat / ((tinggi / 100.0) * (tinggi / 100.0)), 1)
    end
  ) stored,
  params_diambil text[] not null default '{}',   -- dasar hitung biaya consumable
  out_of_range   boolean not null default false, -- petugas mengonfirmasi nilai di luar rentang wajar
  measured_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index screenings_tenant_client_key on screenings (tenant_id, client_id);
create unique index screenings_participant_key on screenings (participant_id);
create trigger screenings_touch before update on screenings
  for each row execute function touch_updated_at();

-- ============================== conversions ==============================
create table conversions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  participant_id  uuid not null unique references participants(id) on delete cascade,
  berminat        boolean not null default false,
  status          conv_status not null default 'baru',
  nilai_transaksi bigint not null default 0 check (nilai_transaksi >= 0),
  produk          text,
  updated_at      timestamptz not null default now(),
  -- US-04: bila status `membeli`, nilai transaksi dan produk wajib diisi.
  constraint conversions_membeli_needs_detail
    check (status <> 'membeli' or (nilai_transaksi > 0 and produk is not null and btrim(produk) <> ''))
);
create index conversions_tenant_status_idx on conversions (tenant_id, status);

-- ==================== anon tallies (US-02, consent ditolak) ====================
-- Peserta menolak consent tetap dilayani; hasil TIDAK disimpan, hanya tally
-- anonim untuk hitungan consumable.
create table anon_tallies (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  event_id       uuid not null references events(id) on delete cascade,
  client_id      uuid not null,
  params_diambil text[] not null default '{}',
  device_id      text,
  created_at     timestamptz not null default now()
);
create unique index anon_tallies_tenant_client_key on anon_tallies (tenant_id, client_id);
create index anon_tallies_event_idx on anon_tallies (event_id);

-- ==================== sync log (§4.2, audit & debugging) ====================
create table sync_log (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  device_id  text not null,
  user_id    uuid references users(id) on delete set null,
  batch_id   uuid not null,
  status     text not null,
  accepted   integer not null default 0,
  conflicts  integer not null default 0,
  detail     jsonb,
  created_at timestamptz not null default now()
);
-- Batch yang sama dikirim ulang tidak boleh dobel diproses.
create unique index sync_log_batch_key on sync_log (tenant_id, batch_id);

-- ======================== audit log (§4.5.8) ========================
create table audit_log (
  id            bigserial primary key,
  tenant_id     uuid,
  actor_user_id uuid references users(id) on delete set null,
  actor_role    user_role,
  action        text not null,
  entity        text,
  entity_id     uuid,
  meta          jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_tenant_idx on audit_log (tenant_id, created_at desc);
create index audit_log_actor_idx on audit_log (actor_user_id, created_at desc);

-- ===================== Row Level Security (§4.5.5) =====================
-- FORCE agar pemilik tabel pun tunduk pada policy.
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'device_sessions', 'events', 'participants', 'consents',
    'screenings', 'conversions', 'anon_tallies', 'sync_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    -- Baca: tenant sendiri; admin_pusat boleh lintas cabang (D6 — bila
    -- diputuskan agregat-saja, cukup hapus klausa admin_pusat di sini).
    -- Tulis: selalu terkunci ke tenant pada konteks request.
    execute format($p$
      create policy %1$s_tenant_isolation on %1$I
        using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
        with check (tenant_id = app_tenant_id())
    $p$, t);
  end loop;
end $$;

-- tenants: hanya baris sendiri (admin_pusat melihat semua).
alter table tenants enable row level security;
alter table tenants force row level security;
create policy tenants_isolation on tenants
  using (id = app_tenant_id() or app_role() = 'admin_pusat')
  with check (app_role() = 'admin_pusat');

-- audit_log: append-only dari sisi aplikasi; hanya koordinator/admin yang membaca.
alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy audit_log_read on audit_log for select
  using (
    (tenant_id = app_tenant_id() and app_role() in ('koordinator', 'admin_pusat'))
    or app_role() = 'admin_pusat'
  );
create policy audit_log_append on audit_log for insert with check (true);

-- consent_texts: referensi bersama, boleh dibaca semua peran terautentikasi.
alter table consent_texts enable row level security;
alter table consent_texts force row level security;
create policy consent_texts_read on consent_texts for select using (true);
create policy consent_texts_write on consent_texts for insert
  with check (app_role() = 'admin_pusat');

-- ========================= teks consent v1 (D7) =========================
-- Draf — menunggu review hukum. Versi direkam di setiap record consent.
insert into consent_texts (versi, isi, active) values (
  'v1',
  'Kami mencatat nama, jenis kelamin, usia, nomor HP, dan hasil pengukuran Anda.' || E'\n' ||
  'Data dipakai untuk rekap layanan dan tindak lanjut penawaran produk Terasol.' || E'\n' ||
  'Data disimpan maksimal 12 bulan, lalu dihapus.' || E'\n' ||
  'Persetujuan dapat ditarik kapan saja melalui cabang; data Anda akan kami hapus.',
  true
);
