# Terasol OS

Aplikasi manajemen mitra Rumah Sehat Terasol — kanal event screening.
PWA offline-first dengan backend multi-tenant, dibangun dari [PRD MVP dan desain Terasol OS](docs/README.md) (opsi 1a).

| | URL |
|---|---|
| Aplikasi | https://web-production-6d0787.up.railway.app |
| API | https://api-production-21af.up.railway.app |
| Railway | project `terasol-os` — service `web`, `api`, `Postgres` |

## Struktur

```
apps/api      Node 22 + TypeScript + Fastify + Postgres (RLS multi-tenant)
apps/web      React 19 + TypeScript + Vite PWA (IndexedDB terenkripsi)
design/       kanvas desain & design system asli (referensi)
prototype/    prototype HTML awal (referensi, tidak dipakai runtime)
docs/         PRD
```

Dua app berdiri sendiri (tanpa npm workspace) supaya `railway up --path-as-root`
bisa mengunggah satu app saja per service.

## Menjalankan lokal

**API** — butuh Postgres. Cara termudah: tunnel ke Postgres Railway.

```bash
railway connect Postgres --tunnel-only --port 55432
```

Lalu di `apps/api/.env` (lihat `.env.example`):

```bash
cd apps/api && npm install && npm run build && npm start
```

**Web**

```bash
cd apps/web && npm install && npm run dev
```

Set `VITE_API_URL` di `apps/web/.env.local` (nilainya ditanam saat build).

## Akun demo

Data demo hidup di tenant terpisah **"Cabang Demo"**, bukan menumpang cabang
sungguhan. Pemisahannya ditegakkan RLS yang sama seperti antar-cabang asli, dan
`npm run seed -- --reset` hanya menyentuh tenant demo.

| Peran | Email |
|---|---|
| Petugas | `petugas.demo@terasol.id` |
| Koordinator | `koordinator.demo@terasol.id` |
| Admin Pusat | `pusat.demo@terasol.id` |

Isinya menyalin angka kanvas desain: 2 event, 61 peserta, Bazar dengan 48 peserta
/ 17 berminat / 6 membeli senilai Rp 8.400.000, plus satu konflik dedup supaya
layar resolusi konflik ada isinya saat didemokan.

Membuat atau menyegarkan:

```bash
DEMO_PASSWORD=... npm run seed -- --reset
```

**Masuk cepat saat `npm run dev`.** Layar login menampilkan tombol satu-ketuk per
peran, dibaca dari `VITE_DEMO_LOGINS` di `apps/web/.env.local`. Tombol ini tidak
pernah sampai ke produksi — ada dua pengaman yang keduanya harus lolos:

1. `import.meta.env.DEV` jadi literal `false` saat build produksi, sehingga JSX,
   CSS, dan fungsi pembacanya dibuang bundler — bukan sekadar tidak dirender.
2. Kredensialnya hanya ada di `.env.local`, yang masuk `.gitignore` **dan**
   `.railwayignore`, jadi tidak pernah ikut ke repo maupun ke server build.

Diverifikasi dengan menggeledah aset yang benar-benar disajikan produksi: nol
kecocokan untuk kata sandi, ketiga email, nama variabel, kelas CSS, maupun teks
panelnya. Sourcemap juga tidak diterbitkan.

> **Catatan keamanan.** Akun demo `admin_pusat` berperilaku sesuai perannya:
> boleh membaca lintas cabang (tulis tetap terkunci ke tenant sendiri). Selama
> keputusan D6 belum diambil, jangan taruh data pasien sungguhan di cabang lain
> tanpa menonaktifkan akun itu lebih dulu — cukup `PATCH /users/:id` dengan
> `{"active": false}`, atau lewat Pengaturan → Tim.

## Pengujian

```bash
cd apps/api && npm test
```

34 uji, semuanya menembak Postgres sungguhan — bukan mock:

- **`test/security.test.js`** — membuktikan Row Level Security benar-benar mengunci:
  tenant lain tidak terlihat walau id-nya diketahui, tulis lintas tenant ditolak
  Postgres, query tanpa konteks tenant mengembalikan kosong, dan role aplikasi
  bukan superuser/bypassrls. Plus aturan domain yang ditegakkan DB (IMT generated
  column, `membeli` wajib nilai+produk, consent immutable, event berbayar wajib harga).
- **`test/api.e2e.test.js`** — alur nyata lewat HTTP: login → buat event → sync
  dengan bentrok dedup → rekap → resolusi konflik → konversi → ekspor CSV →
  replay batch. Perlu server jalan (`npm start` di terminal lain).
- **`test/password.test.js`** — hashing scrypt.

## Yang sudah jalan

| PRD | Status |
|---|---|
| US-01 Membuat event | Selesai — bisa offline, masuk antrean sync; event dengan peserta hanya bisa diarsipkan |
| US-02 Registrasi + consent | Selesai — consent sebelum input hasil, versi & waktu direkam, penolakan jadi tally anonim, dedup nomor HP diperingatkan |
| US-03 Input hasil screening | Selesai — keypad angka menempel, 7 parameter opsional, IMT otomatis (generated column), validasi rentang minta konfirmasi, autosave tiap ketukan |
| US-04 Minat & konversi | Selesai — toggle satu tap; Koordinator ubah status; `membeli` wajib nilai + produk (CHECK constraint) |
| US-05 Sinkronisasi | Selesai — antrean terlihat, sync otomatis + manual, inkremental, idempoten per `batchId`, gagal tidak menghapus/memblokir |
| US-06 Rekap event | Selesai — statistik dihitung server, ekspor CSV |
| US-07 Placeholder kanal lain | Selesai — Outlet (v1.1) & Home Service (v1.2) |
| §4.3 Resolusi konflik | Selesai — server tidak menimpa; kedua record disimpan, satu `needs_review`, Koordinator memilih |
| §4.5.1 Enkripsi lokal | Selesai — AES-256-GCM, kunci PBKDF2 dari PIN, tidak pernah ke disk |
| §4.5.2 PIN + auto-lock | Selesai — auto-lock 5 menit idle |
| §4.5.3 Auto-purge | Selesai — identitas & hasil dihapus dari perangkat setelah server konfirmasi + masa retensi |
| §4.5.4 Remote wipe | Selesai — cabut sesi dari Pengaturan → Perangkat; sesi mati seketika, data lokal dihapus saat online |
| §4.5.5 Tenant isolation | Selesai — RLS Postgres, app connect sebagai role non-superuser |
| §4.5.6 Consent versioning | Selesai — tabel `consent_texts`, record consent merujuk versi |
| §4.5.7 Penghapusan data peserta | Selesai — `POST /participants/:id/erase`, identitas dibersihkan, jejak di audit_log |
| §4.5.8 Audit log | Selesai — termasuk **akses baca** Admin Pusat ke data peserta (`participant.read`, `conflict.read`, `participant.pull`), bukan hanya operasi tulis |
| R1 Storage eviction | Selesai — peringatan bila persistent storage ditolak, ajakan pasang ke home screen, dan sync dipaksa saat antrean lewat 50 record |

## Angka yang harus diisi cabang, bukan ditebak kode

**Harga consumable** disimpan per cabang di `tenants.consumable_prices` dan diisi
lewat Pengaturan → Biaya. Defaultnya **kosong**: selama belum diisi, rekap
menulis "harga belum diatur" alih-alih Rp 0 yang terbaca seolah pemeriksaannya
gratis. PRD meminta estimasi biaya consumable tanpa menyebut angkanya — itu
masukan bisnis, dan menaruhnya sebagai konstanta di kode berarti mengarang biaya
yang diam-diam ikut ke setiap laporan.

**Pendapatan event** dihitung terpisah dari penjualan produk: `peserta dilayani ×
harga paket` (termasuk peserta yang menolak consent — mereka tetap dilayani dan
tetap membayar). Rekap menampilkan keduanya beserta totalnya.

## Keputusan terbuka yang masih menahan rilis

Ini **belum** selesai dan sengaja tidak ditebak:

- **D4 / D5 — durasi retensi.** Retensi lokal default 24 jam (provisional,
  ditampilkan di layar Pengaturan supaya tidak jadi asumsi tersembunyi). Retensi
  server: `npm run purge` **menolak jalan** tanpa `RETENTION_DAYS` eksplisit.
- **D7 — teks consent v1.** Masih draf, menunggu review hukum. Versinya sudah
  direkam di tiap record, jadi teks baru cukup ditambah sebagai `v2`.
- **D6 — akses Admin Pusat.** Saat ini `admin_pusat` boleh membaca lintas cabang
  (tulis tetap terkunci ke tenant sendiri) dan setiap akses tercatat. Bila
  diputuskan agregat-saja, hapus klausa `admin_pusat` di policy RLS —
  satu baris di `migrations/001_init.sql`.
- **R2 — batas enkripsi browser.** PIN 6 digit hanya 10⁶ kemungkinan dan PBKDF2
  ramah GPU. Ini diterima sadar sesuai PRD; pertahanan sesungguhnya adalah purge
  agresif setelah sync, bukan kekuatan PIN-nya.
- **Verifikasi hukum UU PDP** sebelum rilis (§4.5).
- **"Lima parameter" di US-03.** PRD menulis "Lima parameter" lalu menyebut enam
  (tinggi, berat, tensi, gula darah, kolesterol, asam urat) — dan tensi terpecah
  jadi sistolik/diastolik sehingga menjadi tujuh field. Implementasi mengikuti
  daftarnya (tujuh field). Bila angka lima yang benar, ada dua parameter yang
  harus dicoret dan target 45 detik di Success Criteria perlu dihitung ulang.
- **Biometrik.** §4.5.2 menulis "PIN/biometrik"; yang dibangun baru PIN. Karena
  PRD memakai "atau", ini terpenuhi — WebAuthn bisa ditambahkan bila diinginkan.

## Operasi

```bash
# migrasi (juga jalan otomatis saat API boot, dengan advisory lock)
cd apps/api && npm run migrate

# purge retensi server — wajib menyebut durasi
RETENTION_DAYS=365 npm run purge -- --dry-run

# data contoh untuk dev/demo (jangan di produksi)
npm run seed
```

Deploy:

```bash
railway up ./apps/api --path-as-root --service api --environment production --detach
railway up ./apps/web --path-as-root --service web --environment production --detach
```

## Catatan arsitektur

**UI tidak pernah menunggu jaringan.** Semua tulisan mengenai IndexedDB dulu;
sync engine bekerja di belakang layar. `batchId` disimpan sampai server
mengonfirmasi, jadi retry setelah sinyal putus tidak pernah menggandakan data.

**Isolasi tenant ditegakkan Postgres, bukan kode aplikasi.** API terhubung
sebagai role `terasol_app` (bukan superuser, bukan pemilik tabel), dan setiap
request menyetel `app.tenant_id` lewat `SET LOCAL` di dalam transaksi. Lupa
menulis `where tenant_id = ...` di satu query tidak membocorkan data — RLS yang
menghentikannya. Ini yang diuji `test/security.test.js`.

**Aturan yang tidak boleh bisa ditembus ada di DB.** IMT adalah generated column
(mustahil diisi manual), `membeli` tanpa nilai+produk ditolak CHECK constraint,
consent immutable terhadap UPDATE dan hanya bisa dihapus lewat purge resmi yang
menyatakan diri (`app.purge = 'on'`).
