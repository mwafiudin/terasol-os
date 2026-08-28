-- ============================================================================
-- 013 — trigliserida
-- ============================================================================
--
-- Ada di kartu "Acuan Hasil Pemeriksaan Kesehatan" yang dipegang peserta —
-- baris keempat, nilai normal <150 mg/dL — tetapi tidak ada di mana pun dalam
-- aplikasi. Petugas yang memeriksanya dengan alat strip 4-in-1 tidak punya
-- tempat untuk menuliskannya, dan angkanya berhenti di kertas.
--
-- Batas CHECK-nya longgar seperti kolom lain di tabel ini: hanya menangkal
-- angka yang mustahil. Rentang wajar yang lebih sempit, dan konfirmasi petugas
-- saat dilewati, tetap urusan aplikasi (US-03).
alter table screenings
  add column if not exists trigliserida integer
    check (trigliserida is null or trigliserida between 20 and 2000);

-- `pengukuran` menyimpan satu baris per parameter, jenisnya sebuah enum.
-- Nilai enum baru tidak bisa ditambahkan di dalam transaksi yang sama dengan
-- pemakaiannya pada beberapa versi Postgres, jadi ia berdiri sebagai migrasi
-- tersendiri di sini dan baru dipakai oleh kode aplikasi.
alter type jenis_ukur add value if not exists 'trigliserida';
