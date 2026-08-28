-- ============================================================================
-- 010 — memperbaiki penanda "di luar rentang wajar" pada pengukuran lama
-- ============================================================================
--
-- Screening registrasi mengirim SATU bendera `outOfRange` untuk seluruh
-- kunjungan — jawaban atas "adakah satu saja angka yang tampak salah ketik".
-- `cerminkanScreening` menyalin bendera itu ke SETIAP baris `pengukuran`.
--
-- Akibatnya satu angka mencurigakan menandai kesembilan angka lainnya. Di layar
-- peserta itu tampil sebagai tinggi badan 180 cm berlabel "Di luar rentang
-- wajar", berdampingan dengan kolesterol 190 yang berlabel "Dalam rujukan" DAN
-- "Di luar rentang wajar" sekaligus — satu angka dengan dua vonis yang saling
-- bertentangan.
--
-- Perangkat kini mengirim `diLuarWajar` per parameter, sehingga baris baru
-- benar sejak awal. Baris lama diperbaiki di sini, dan bisa diperbaiki karena
-- penandanya memang TURUNAN dari nilainya sendiri — tidak ada yang perlu
-- ditebak.
--
-- Angka batas di bawah SENGAJA disalin dari `UKUR` di rujukan.ts untuk
-- perbaikan sekali jalan ini. Ia bukan sumber kebenaran yang baru: penilaian
-- yang berjalan tetap dihitung perangkat, dan berkas ini tidak akan dijalankan
-- lagi setelah selesai.
update pengukuran set out_of_range = case jenis
  when 'tinggi'        then nilai < 120 or nilai > 210
  when 'berat'         then nilai < 30  or nilai > 180
  when 'lingkar_perut' then nilai < 40  or nilai > 200
  when 'sistolik'      then nilai < 70  or nilai > 250
  when 'diastolik'     then nilai < 40  or nilai > 150
  when 'nadi'          then nilai < 40  or nilai > 180
  when 'gula'          then nilai < 50  or nilai > 500
  when 'kolesterol'    then nilai < 100 or nilai > 400
  when 'asam_urat'     then nilai < 2   or nilai > 15
  else out_of_range
end
where deleted_at is null;
