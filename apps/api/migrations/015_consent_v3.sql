-- ============================================================================
-- 015 — teks consent v3: hasil bisa dikirimkan lewat tautan
-- ============================================================================
--
-- Sejak migrasi 014 hasil pemeriksaan bisa dibagikan ke peserta lewat tautan
-- yang dibuka tanpa login. Itu perlakuan baru atas datanya, dan pemberitahuan
-- yang tidak menyebutnya berhenti menggambarkan apa yang sebenarnya terjadi.
--
-- Yang ditambahkan bukan sekadar "hasil dapat dikirimkan", melainkan sifat
-- tautannya: berlaku terbatas, dan bisa dicabut. Keduanya adalah janji, dan
-- janji yang tertulis di teks persetujuan adalah janji yang bisa ditagih —
-- itulah sebabnya angka 30 hari ikut disebut, bukan disamarkan menjadi
-- "sementara waktu".
--
-- v2 dinonaktifkan, TIDAK disunting. `consents.versi_teks` merujuk ke baris
-- ini, dan menyunting v2 berarti mengubah isi persetujuan yang sudah terlanjur
-- ditandatangani orang — mereka menyetujui teks yang lain.
update consent_texts set active = false where versi = 'v2';

insert into consent_texts (versi, isi, active) values (
  'v3',
  'Kami mencatat nama, jenis kelamin, tanggal lahir, nomor HP, dan hasil pengukuran Anda.' || E'\n' ||
  'Data dipakai untuk rekap layanan dan tindak lanjut penawaran produk Terasol.' || E'\n' ||
  'Hasil pemeriksaan dapat kami kirimkan kepada Anda lewat tautan pribadi yang berlaku 30 hari dan bisa dicabut kapan saja.' || E'\n' ||
  'Data disimpan maksimal 12 bulan, lalu dihapus.' || E'\n' ||
  'Persetujuan dapat ditarik kapan saja melalui cabang; data Anda akan kami hapus.',
  true
) on conflict (versi) do nothing;
