-- ============================================================================
-- 008 — lingkar perut dan nadi pada screening registrasi
-- ============================================================================
--
-- Keduanya sudah dikenal aplikasi sejak lama: `UKUR` di rujukan.ts memuatnya
-- lengkap dengan rentang wajar, ambang obesitas sentral Asia-Pasifik untuk
-- lingkar perut, dan keduanya sudah bisa dicatat lewat "Catat pengukuran" yang
-- menulis ke tabel `pengukuran`.
--
-- Yang tidak bisa hanyalah alur REGISTRASI, karena tabel `screenings` tidak
-- punya kolomnya. Akibatnya dua alur yang seharusnya sama menawarkan parameter
-- yang berbeda, dan petugas yang mengukur lingkar perut saat registrasi tidak
-- punya tempat untuk menuliskannya.
--
-- Batas CHECK mengikuti pola kolom lain di tabel ini: longgar, hanya untuk
-- menangkal angka yang mustahil. Rentang wajar yang lebih sempit — dan
-- konfirmasi petugas saat dilewati — tetap urusan aplikasi (US-03).
alter table screenings
  add column if not exists lingkar_perut numeric(5,1)
    check (lingkar_perut is null or lingkar_perut between 20 and 300),
  add column if not exists nadi smallint
    check (nadi is null or nadi between 20 and 300);
