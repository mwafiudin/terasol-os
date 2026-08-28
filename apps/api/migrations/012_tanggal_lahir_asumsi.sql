-- ============================================================================
-- 012 — menandai tanggal lahir yang ditaksir dari usia
-- ============================================================================
--
-- Di lapangan tanggal lahir sering tidak ada. Orang tidak hafal, KTP tidak
-- dibawa, dan antrean di belakangnya tidak berhenti. Petugas butuh bisa
-- mengetik "62" dan lanjut.
--
-- Migrasi 011 menolak menebak tanggal lahir dari usia, dengan alasan yang masih
-- berlaku: menebaknya berarti mengarang tanggal lahir orang sungguhan. Yang
-- berubah bukan alasannya, melainkan siapa yang menebak. Di sana yang menebak
-- adalah SISTEM, diam-diam, atas baris lama yang tidak bisa ditanyai lagi. Di
-- sini yang memilih adalah PETUGAS, di depan orangnya, dan taksirannya diberi
-- tanda supaya tidak seorang pun sesudahnya salah mengiranya fakta.
--
-- Taksirannya: hari ini dikurangi usia yang diketik. Bukan 1 Januari, dan bukan
-- pertengahan tahun. Alasannya bisa dibuktikan — orang yang hari ini berusia 62
-- pasti lahir antara (hari ini − 63 tahun + 1 hari) dan (hari ini − 62 tahun),
-- jadi memilih ujung terakhir rentang itu membuat usianya BENAR hari ini dan
-- benar lagi pada setiap ulang tahun tanggal pencatatan sesudahnya. Meleset
-- paling banyak satu tahun di antara keduanya, dan tidak ada asumsi lain yang
-- bisa lebih baik dari data yang hanya berisi satu angka usia.
--
-- Kolomnya NOT NULL DEFAULT false: baris yang sudah ada punya tanggal lahir
-- sungguhan atau tidak punya sama sekali, dan keduanya bukan taksiran.
alter table participants
  add column if not exists tanggal_lahir_asumsi boolean not null default false;

alter table pelanggan
  add column if not exists tanggal_lahir_asumsi boolean not null default false;

-- Taksiran tanpa tanggal tidak berarti apa-apa, dan membiarkannya mungkin
-- berarti membiarkan baris yang mengaku "ini taksiran" tanpa ada yang ditaksir.
alter table participants
  add constraint participants_asumsi_butuh_tanggal
  check (not tanggal_lahir_asumsi or tanggal_lahir is not null);

alter table pelanggan
  add constraint pelanggan_asumsi_butuh_tanggal
  check (not tanggal_lahir_asumsi or tanggal_lahir is not null);
