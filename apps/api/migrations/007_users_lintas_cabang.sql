-- ============================================================================
-- 007 — Admin Pusat boleh mengelola akun lintas cabang
-- ============================================================================
--
-- Migration 006 meninggalkan pesan bahwa keputusan lintas cabang harus diambil
-- ULANG secara sadar untuk setiap tabel master berikutnya. Ini pengambilan
-- ulang itu untuk `users`, dan alasannya BUKAN alasan katalog.
--
-- Alasan katalog dulu: "salah tulis tidak memalsukan apa pun yang pernah
-- terjadi pada seorang pasien". Alasan itu TIDAK berlaku di sini. `users`
-- adalah kendali akses; salah tulis di sini memberi orang jalan masuk ke data
-- pasien. Kalau dinilai dari besar risikonya saja, tabel ini justru yang paling
-- pantas tetap terkunci.
--
-- Yang membalikkan keputusan adalah keadaan tanpa perubahan ini:
--
--   `POST /users` menanam `ctx.tenantId` milik pemanggil. Artinya cabang yang
--   baru dibuat lewat Master data TIDAK BISA mendapatkan koordinator
--   pertamanya — akunnya selalu lahir di cabang si pembuat. Satu-satunya jalan
--   yang tersisa adalah menjalankan CLI seed di server produksi.
--
-- Jadi pilihannya bukan antara "terkunci" dan "terbuka", melainkan antara
-- rute API yang dijaga peran dan tercatat di audit log, dengan menyerahkan
-- shell produksi kepada orang yang perlu membuka cabang. Yang kedua jauh lebih
-- longgar, dan longgarnya tidak terekam di mana pun.
--
-- Perlu dicatat pula bahwa ini bukan penambahan kuasa yang berarti: Admin Pusat
-- SUDAH bisa membaca data pasien seluruh cabang. Membuat akun di cabang B tidak
-- memberinya akses yang belum ia punya.
--
-- BATAS YANG TETAP BERDIRI — dan sengaja tidak ikut dilonggarkan:
--
--   * Tabel catatan pelayanan (participants, screenings, pengukuran, transaksi,
--     consents) TETAP `with check (tenant_id = app_tenant_id())`. Admin Pusat
--     tidak boleh mengarang peserta atau pengukuran di cabang yang tidak ia
--     layani. Uji di test/security.test.js menjaga batas itu dan tidak
--     disentuh oleh migrasi ini.
--   * Kenaikan peran ke `admin_pusat` dijaga di lapisan rute, bukan di sini:
--     hanya Admin Pusat yang boleh memberikannya, dan tidak seorang pun boleh
--     menurunkan perannya sendiri — sehingga selalu tersisa minimal satu Admin
--     Pusat yang hidup.
--   * `device_sessions` hanya dilonggarkan untuk UPDATE, tidak untuk INSERT —
--     lihat alasannya di bawah.
--
-- Bila kelak ada tabel master lain lagi, keputusan ini harus diambil ulang
-- untuk tabel itu — sekali lagi, bukan disalin karena "users begitu".

drop policy users_tenant_isolation on users;

create policy users_tenant_isolation on users
  using (tenant_id = app_tenant_id() or app_role() = 'admin_pusat')
  with check (tenant_id = app_tenant_id() or app_role() = 'admin_pusat');

-- ============================================================================
-- device_sessions — pencabutan lintas cabang, TAPI hanya pencabutan
-- ============================================================================
--
-- Menonaktifkan akun ikut mencabut semua sesi perangkatnya; itulah yang membuat
-- penonaktifan berarti sesuatu, bukan sekadar bendera di satu baris. Tanpa
-- perubahan ini, penonaktifan lintas cabang akan gagal di tengah transaksi:
-- baris `users` lolos, lalu UPDATE `device_sessions` ditolak karena barisnya
-- bertenant lain — dan seluruh transaksi berguling balik dengan pesan RLS
-- mentah. Justru kasus yang paling membutuhkan kuasa pusat (akun cabang yang
-- diduga bocor) adalah yang paling pasti gagal.
--
-- Yang dilonggarkan HANYA UPDATE. INSERT tetap terkunci ke tenant sendiri:
-- policy kedua ini `for update`, jadi ia tidak ikut menilai INSERT sama sekali,
-- dan `with check` policy pertama tetap menjadi satu-satunya penilai di sana.
-- Artinya Admin Pusat bisa mematikan sesi di cabang lain, tetapi tidak bisa
-- menerbitkan sesi baru di sana. (Menerbitkan sesi pun tidak akan menolongnya:
-- access token ditandatangani dengan rahasia server, bukan dibaca dari tabel.)
create policy device_sessions_pusat_cabut on device_sessions for update
  using (app_role() = 'admin_pusat')
  with check (app_role() = 'admin_pusat');
