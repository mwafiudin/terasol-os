-- ============================================================================
-- 016 — peserta boleh tidak punya nomor HP
-- ============================================================================
--
-- Nomor HP wajib, jadi petugas mengarang. Di lapangan tujuh orang berbeda
-- tercatat dengan `0812345678`: sugeng, toyiman, bambang, yuandika, arib, siti
-- muslikah, sulami. Kolom yang menolak kosong tidak menghasilkan data yang
-- lebih lengkap — ia menghasilkan data yang salah, dan yang salah itu diam.
--
-- Akibatnya berlipat, bukan sekadar kolom yang keliru:
--
--   * Ketujuhnya saling menandai "nomor kembar", sehingga daftar tinjauan
--     terisi orang yang sama sekali bukan duplikat.
--   * `pelangganUntuk` mencocokkan pada HP + nama. Dua orang bernama mirip
--     dengan nomor karangan yang sama menjadi SATU pelanggan, dan riwayat
--     kesehatan keduanya bercampur di satu grafik.
--
-- NULL, bukan string kosong. Keduanya sama-sama "tidak ada nomor", tapi hanya
-- NULL yang membuat indeks dedup dan pencocokan pelanggan berhenti dengan
-- sendirinya: di Postgres, NULL tidak pernah sama dengan NULL. String kosong
-- akan cocok dengan string kosong lain, dan kita kembali ke tujuh orang yang
-- saling mengaku duplikat.
alter table participants alter column hp drop not null;
alter table pelanggan     alter column hp drop not null;

-- Indeks dedup dipersempit: baris tanpa nomor tidak perlu ikut dicari, dan
-- membiarkannya di indeks hanya membesarkan sesuatu yang tidak pernah dipakai.
drop index if exists participants_dedup_idx;
create index participants_dedup_idx on participants (event_id, hp)
  where deleted_at is null and hp is not null;

drop index if exists pelanggan_hp_idx;
create index pelanggan_hp_idx on pelanggan (tenant_id, hp)
  where erased_at is null and hp is not null;

-- Nomor yang tersimpan harus benar-benar nomor. Sebelumnya string kosong bisa
-- masuk tanpa ada yang menahan, dan ia bukan nomor maupun ketiadaan nomor —
-- ia bentuk ketiga yang harus diingat setiap pembaca kolom ini selamanya.
alter table participants
  add constraint participants_hp_bukan_kosong check (hp is null or length(btrim(hp)) >= 3);
alter table pelanggan
  add constraint pelanggan_hp_bukan_kosong check (hp is null or length(btrim(hp)) >= 3);
