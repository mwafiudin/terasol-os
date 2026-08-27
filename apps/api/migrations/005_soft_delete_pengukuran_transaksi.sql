-- Penghapusan yang bisa dibatalkan untuk pengukuran dan transaksi.
--
-- Sebelumnya DELETE benar-benar membuang barisnya. Untuk data yang salah ketik
-- itu memadai; untuk hasil pengukuran tidak. Hasil pengukuran adalah fakta pada
-- satu momen dan tidak bisa diulang — kalau ternyata yang dihapus salah, tidak
-- ada cara mengembalikannya, dan tidak ada jejak bahwa ia pernah ada.
--
-- `participants` sudah memakai pola yang sama (`deleted_at`), jadi ini
-- menyelaraskan tabel baru dengan konvensi yang sudah berlaku di skema ini,
-- bukan memperkenalkan pola baru.

alter table pengukuran
  add column deleted_at timestamptz,
  add column deleted_by uuid references users(id) on delete set null;

alter table transaksi
  add column deleted_at timestamptz,
  add column deleted_by uuid references users(id) on delete set null;

-- Indeks riwayat hanya perlu melihat baris yang masih hidup.
drop index if exists pengukuran_riwayat_idx;
create index pengukuran_riwayat_idx
  on pengukuran (pelanggan_id, jenis, diukur_pada desc)
  where deleted_at is null;

drop index if exists transaksi_pelanggan_idx;
create index transaksi_pelanggan_idx
  on transaksi (pelanggan_id, tanggal desc)
  where deleted_at is null;

-- Kunci idempotensi sync sengaja TIDAK menyaring yang terhapus: kalau sebuah
-- pengukuran dihapus lalu perangkat lama mengirim ulang batch yang sama, yang
-- benar adalah menyentuh baris yang sudah ada (yang tetap terhapus), bukan
-- membuat duplikat baru yang tiba-tiba hidup kembali.
