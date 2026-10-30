# Self-host dengan Docker

Produksi masih di Railway. Berkas ini untuk menjalankan Terasol OS di server
sendiri (VPS) sebagai dua container di belakang reverse proxy yang memegang
TLS, misalnya Caddy atau Cloudflare Tunnel.

Dockerfile-nya bernama `Dockerfile.selfhost`, bukan `Dockerfile`: Railway
otomatis memakai berkas bernama `Dockerfile` di root service (`apps/api`,
`apps/web`), dan build produksi di Railway tidak boleh ikut berubah karena
berkas ini.

> **Baca bagian [Pindah origin PWA](#pindah-origin-pwa) sebelum mengganti domain.**
> Data petugas yang belum tersinkron bisa hilang.

## API

```bash
docker build -f apps/api/Dockerfile.selfhost \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  -t terasol-api apps/api

docker run -d --name terasol-api --env-file api.env -p 127.0.0.1:3000:3000 terasol-api
```

Image berjalan sebagai user `node` (uid 1000), Node 22, base dipaku digest.
`HEALTHCHECK` memanggil `/health` lewat `fetch` bawaan Node.

### Env

Sumbernya `apps/api/src/env.ts`; contoh lengkap di `apps/api/.env.example`.

| Env | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ya | Role **pemilik** database. Dipakai migrasi, pembuatan role aplikasi, login/refresh, dan `/health`. |
| `APP_DB_USER` | tidak (`terasol_app`) | Nama role **aplikasi**. |
| `APP_DB_PASSWORD` | ya | Kata sandi role aplikasi. Migrasi menyetelnya ke role itu setiap boot. |
| `JWT_SECRET` | ya | Acak panjang. Mengganti nilainya mengeluarkan semua sesi. |
| `CORS_ORIGIN` | produksi: ya | Origin web, dipisah koma. Bawaannya `*`, jangan dipakai di produksi. |
| `NODE_ENV` | — | Image sudah menyetel `production`: pesan galat 500 tidak dikirim ke klien. |
| `PORT` | — | Bawaan 3000. |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | tidak | `15m` dan `30`. |
| `BOOTSTRAP_TENANT`, `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD`, `BOOTSTRAP_NAMA` | tidak | Tenant + admin pertama, hanya bila tabel `users` kosong. |
| `APP_ENV` | tidak | Nama lingkungan di `/health` (padanan `RAILWAY_ENVIRONMENT_NAME`). |
| `RETENTION_DAYS` | untuk `purge` | Sengaja tanpa bawaan (keputusan D5). |
| `DATABASE_CA_CERT` | tidak | CA sendiri (teks PEM) untuk Postgres di host publik yang sertifikatnya tidak ditandatangani CA publik. |
| `DATABASE_TLS_TANPA_VERIFIKASI` | tidak | `1` mematikan verifikasi sertifikat dan mencetak peringatan. Hanya untuk laptop lewat proxy publik Railway (self-signed), jangan di server. |

`GIT_COMMIT_SHA` dan `GIT_BRANCH` adalah build arg di atas. Di Railway nilainya
tetap dari `RAILWAY_GIT_*`, yang didahulukan bila ada.

### Dua role database

API memegang **dua** pool (`src/db.ts`), dan pemisahan ini yang membuat Row
Level Security berarti:

- **Pemilik** (`DATABASE_URL`) memiliki tabel dan menjalankan migrasi. Login dan
  refresh juga lewat pool ini, karena harus menemukan user sebelum tenant-nya
  diketahui; query di sana menyaring sendiri.
- **Aplikasi** (`APP_DB_USER`/`APP_DB_PASSWORD`) dipakai setiap request lain.
  URL-nya diturunkan dari `DATABASE_URL` dengan user dan sandi diganti, jadi
  host, port, database, dan parameternya sama. Role ini dibuat atau disegarkan
  oleh migrasi (`ensureAppRole` di `src/migrate.ts`) tanpa SUPERUSER,
  BYPASSRLS, CREATEROLE, dan CREATEDB, dan migrasi **gagal keras** bila
  ternyata role itu punya salah satunya. Hanya dengan begitu setiap query
  tunduk RLS.

Pemilik tidak harus superuser `postgres`. Cukup role ber-`CREATEROLE` yang
juga `BYPASSRLS`, dibuat sekali oleh superuser:

```sql
create role terasol login createrole bypassrls password '...';
create database terasol owner terasol;
-- Bila terasol_app sudah ada (mis. hasil restore), pemilik perlu hak admin atasnya:
grant terasol_app to terasol with admin option;
```

`BYPASSRLS` di sini wajib: tabel memakai `FORCE ROW LEVEL SECURITY`, dan
beberapa migrasi menyisipkan baris (teks consent di 001, 011, 015) yang policy-nya
menuntut konteks `admin_pusat`. Hak itu tidak menambah kuasa nyata, karena
pemilik tabel toh bisa mematikan FORCE RLS di tabelnya sendiri. Yang tidak
boleh punya hak itu adalah role aplikasi. `test/migrate-pemilik.test.js`
menguji susunan ini.

**TLS ke Postgres** diatur `opsiPool()` di `src/tls.ts`. Postgres di jaringan
Docker yang sama (service bernama satu kata seperti `postgres`), `localhost`,
dan `*.railway.internal` disambung tanpa TLS. Host lain memakai TLS yang
memverifikasi sertifikat; nama host lengkap seperti `db.contoh.com` tanpa TLS
butuh `?sslmode=disable` di `DATABASE_URL`, yang ikut ke URL role aplikasi.

### Migrasi

Server menjalankan migrasi sendiri saat boot, dengan advisory lock supaya
instance kedua menunggu. Untuk menjalankannya terpisah, misalnya sebelum
mengganti container:

```bash
docker run --rm --env-file api.env terasol-api node dist/cli-migrate.js
```

Itu padanan `npm run migrate` di `package.json`, minus `--env-file-if-exists`
karena env datang dari Docker. `purge` dan `seed` sama polanya
(`dist/cli-purge.js`, `dist/cli-seed.js`).

### Health

`GET /health` publik:

- `200 {"ok":true,"db":"up","revisi":{...}}`
- `503 {"ok":false,"db":"down","revisi":{...}}` saat database tidak terjangkau.
  Pesan galat Postgres **tidak** dikirim ke klien (bisa memuat host, port,
  atau nama role); detailnya ada di log container
  (`health: basis data tidak terjangkau`).

Koneksi idle yang diputus Postgres (restart, failover) dicatat di log dan
diganti koneksi baru; proses API tidak ikut mati.

## Web

```bash
docker build -f apps/web/Dockerfile.selfhost \
  --build-arg VITE_API_URL=https://api.contoh.id \
  -t terasol-web apps/web

docker run -d --name terasol-web -p 127.0.0.1:8080:8080 terasol-web
```

- `VITE_API_URL` **wajib** dan ditanam ke bundle saat build; build gagal bila
  kosong. Ganti URL API berarti build ulang image.
- Disajikan `nginx-unprivileged` (uid 101, port 8080), base dipaku digest.
- `index.html`, `sw.js`, `registerSW.js`, dan `manifest.webmanifest` dikirim
  `Cache-Control: no-cache`; tanpa itu petugas tertahan di versi lama karena
  service worker tidak pernah melihat `sw.js` baru. `assets/*` dan
  `workbox-*.js` berhash, jadi `immutable` setahun.
- Build gagal bila sourcemap ikut ter-build. `.env.local` (berisi
  `VITE_DEMO_LOGINS`) dikecualikan dari konteks build lewat `.dockerignore`.
- Belum ada Content-Security-Policy: perlu `VITE_API_URL` dan Google Fonts di
  `connect-src`/`style-src`/`font-src`, dan harus diuji di browser dulu.

Pastikan proxy di depan tidak menimpa `Cache-Control` di atas (misalnya aturan
cache Cloudflare "cache everything").

## Pindah origin PWA

**Data lokal petugas terikat origin.** IndexedDB, kunci perangkat untuk
enkripsi lokal, antrean sync, dan service worker semuanya milik origin
`https://terasol.up.railway.app`. Membuka aplikasi di domain baru berarti
browser memulai dari kosong: tidak ada antrean, tidak ada data, dan kunci
perangkat yang lama tidak bisa dipakai.

Data yang **belum tersinkron** di origin lama tidak ikut pindah. Urutannya:

1. Jalankan API dan web baru berdampingan; origin lama tetap hidup.
2. Minta semua petugas membuka aplikasi di origin lama dan memastikan antrean
   sync **kosong** (layar sync, tidak ada record menunggu). Perangkat yang
   sedang di lapangan tanpa sinyal harus kembali online dulu.
3. Cek di server bahwa event terakhir dari tiap perangkat sudah masuk.
4. Baru arahkan petugas ke domain baru: login ulang, dan pasang ulang ke home
   screen (ikon lama tetap menunjuk origin lama).
5. Matikan origin lama setelah tidak ada lagi yang membukanya. Sebelum itu,
   jangan biarkan dua origin dipakai bergantian, karena masing-masing punya
   antrean sendiri.

Ganti `CORS_ORIGIN` API agar memuat origin baru (dan origin lama selama
masa transisi).
