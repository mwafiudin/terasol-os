-- ============================================================================
-- 011 — tanggal lahir peserta dan pelanggan
-- ============================================================================
--
-- Usia yang diketik petugas benar tepat satu hari. Setelah itu ia hanya benar
-- secara kebetulan, dan `pelanggan-link.ts` sudah menyadari hal ini — ia
-- menimpa `usia` tiap kali orang yang sama datang lagi, dengan komentar
-- "usia berubah tiap tahun". Yang ditimpanya tetap angka yang basi besok.
--
-- Tanggal lahir tidak pernah basi. Dari sana usia bisa dihitung kapan pun ia
-- dibutuhkan, dan selalu benar pada hari ia dibaca.
--
-- `usia` TIDAK dihapus, dan bukan demi kompatibilitas semata:
--
--   * Baris lama tidak bisa dipulihkan. Usia tidak bisa dibalik menjadi
--     tanggal lahir — 62 tahun bisa berarti 365 hari yang berbeda. Menebaknya
--     (misalnya 1 Januari) berarti mengarang tanggal lahir orang sungguhan ke
--     dalam basis data, yang jauh lebih buruk daripada tidak tahu.
--   * Karena itu kolom baru ini NULLABLE, dan tetap begitu selamanya. NULL di
--     sini berarti "orang ini terdaftar sebelum kami menanyakannya", bukan
--     data yang hilang.
--
-- Jadi keduanya hidup berdampingan dengan peran yang berbeda: tanggal lahir
-- adalah fakta, `usia` adalah catatan usia PADA SAAT PENDAFTARAN. Aplikasi
-- menghitung usia dari tanggal lahir bila ada, dan jatuh ke `usia` bila tidak.
--
-- Batas bawah 1900 hanya menangkal salah ketik tahun; batas atas (tidak boleh
-- di masa depan) tidak bisa ditulis di sini karena CHECK menuntut ekspresi
-- immutable dan `current_date` bukan salah satunya. Itu dijaga zod di API dan
-- atribut `max` pada input tanggal di aplikasi.
alter table participants
  add column if not exists tanggal_lahir date
    check (tanggal_lahir is null or tanggal_lahir >= date '1900-01-01');

alter table pelanggan
  add column if not exists tanggal_lahir date
    check (tanggal_lahir is null or tanggal_lahir >= date '1900-01-01');

-- ============================== consent v2 ==============================
--
-- Tanggal lahir lebih mengidentifikasi daripada usia: "62 tahun" dimiliki
-- ratusan ribu orang di satu kota, "17 Agustus 1963" jauh lebih sedikit.
-- Pemberitahuannya harus menyebut apa yang benar-benar dicatat, jadi teksnya
-- naik versi, bukan disunting diam-diam — `consents.versi_teks` merujuk ke
-- baris ini, dan menyunting v1 berarti mengubah isi persetujuan yang sudah
-- terlanjur ditandatangani orang.
update consent_texts set active = false where versi = 'v1';

insert into consent_texts (versi, isi, active) values (
  'v2',
  'Kami mencatat nama, jenis kelamin, tanggal lahir, nomor HP, dan hasil pengukuran Anda.' || E'\n' ||
  'Data dipakai untuk rekap layanan dan tindak lanjut penawaran produk Terasol.' || E'\n' ||
  'Data disimpan maksimal 12 bulan, lalu dihapus.' || E'\n' ||
  'Persetujuan dapat ditarik kapan saja melalui cabang; data Anda akan kami hapus.',
  true
) on conflict (versi) do nothing;
