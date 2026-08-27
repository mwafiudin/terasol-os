-- ============================================================================
-- 009 — konteks gula darah pada screening registrasi
-- ============================================================================
--
-- `/sync/push` sudah menerima `konteksGula` dan meneruskannya ke tabel
-- `pengukuran` lewat `cerminkanScreening`. Tabel `screenings` sendiri tidak
-- pernah menyimpannya, sehingga angka gula di sana berdiri tanpa keterangan
-- kapan ia diambil.
--
-- Itu bukan kekurangan yang netral. Rentang rujukannya berbeda tajam:
--
--   130 mg/dL SEWAKTU     → dalam rentang rujukan
--   130 mg/dL PUASA       → rentang prediabetes
--
-- Artinya setiap tempat yang menilai angka gula dari `screenings` — ringkasan
-- peserta, dan penyaring temuan pada daftar peserta — akan menganggap
-- pembacaan puasa sebagai sewaktu, lalu menyatakan wajar sesuatu yang tidak.
-- Pada alat screening, gagal menandai lebih buruk daripada menandai berlebih.
--
-- Nilai lama dibiarkan NULL, bukan diisi 'sewaktu': menebak konteks pembacaan
-- yang sudah lewat adalah mengarang keterangan yang tidak pernah dicatat
-- siapa pun. Pembacanya harus memperlakukan NULL sebagai "tidak diketahui".
alter table screenings
  add column if not exists konteks_gula text
    check (konteks_gula is null or konteks_gula in ('puasa', 'sewaktu', '2jam_pp'));
