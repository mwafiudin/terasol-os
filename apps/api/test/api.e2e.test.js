/**
 * Uji end-to-end lewat HTTP terhadap server yang sedang berjalan.
 * Menelusuri alur nyata: login → buat event → sync (termasuk bentrok dedup)
 * → rekap → resolusi konflik → konversi → ekspor CSV → replay batch.
 *
 *   npm start                 (di terminal lain)
 *   API_URL=http://localhost:3000 node --env-file=.env --test test/api.e2e.test.js
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';

const API = process.env.API_URL ?? 'http://localhost:3000';
const EMAIL = process.env.BOOTSTRAP_EMAIL ?? 'admin@terasol.id';
const PASSWORD = process.env.BOOTSTRAP_PASSWORD;

let token, eventClientId, eventId, pelangganId, katalogId;
const pClientA = randomUUID(), pClientB = randomUUID();
const batchId = randomUUID();
const HP = '0811' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');

async function call(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

before(async () => {
  assert.ok(PASSWORD, 'BOOTSTRAP_PASSWORD harus ada di .env untuk uji ini');
  const health = await call('/health');
  assert.equal(health.status, 200, `server harus hidup di ${API}`);
});

after(async () => {
  // Bersihkan data uji agar basis data tetap rapi.
  if (!eventId) return;
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('begin');
  await c.query("select set_config('app.purge','on',true)");
  await c.query('delete from participants where event_id = $1', [eventId]);
  await c.query('delete from anon_tallies where event_id = $1', [eventId]);
  await c.query('delete from events where id = $1', [eventId]);
  // Pelanggan dibuat otomatis oleh sync, jadi ia juga harus ikut dibersihkan —
  // kalau tidak, tiap kali uji dijalankan basis data menumpuk satu orang palsu.
  // Pengukurannya ikut terhapus lewat cascade.
  if (katalogId) await c.query('delete from katalog where id = $1', [katalogId]);
  if (pelangganId) await c.query('delete from pelanggan where id = $1', [pelangganId]);
  await c.query('commit');
  await c.end();
});

describe('Alur API end-to-end', () => {
  it('login mengembalikan access token dan identitas', async () => {
    const r = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: EMAIL, password: PASSWORD,
        deviceId: randomUUID(), deviceLabel: 'uji-e2e',
      }),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.accessToken);
    assert.equal(r.body.user.email, EMAIL);
    token = r.body.accessToken;
  });

  it('login dengan kata sandi salah ditolak', async () => {
    const r = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: 'salah-sekali', deviceId: randomUUID() }),
    });
    assert.equal(r.status, 401);
  });

  it('preflight CORS mengizinkan metode yang benar-benar dipakai aplikasi', async () => {
    // Regresi: balasan preflight pernah hanya memuat GET, HEAD, dan POST —
    // himpunan "safelisted" CORS — sehingga setiap PATCH, PUT, dan DELETE dari
    // browser ditolak sebelum menyentuh server. Seluruh uji lain di berkas ini
    // buta terhadap itu: mereka berjalan dari Node, yang tidak pernah mengirim
    // preflight. Gejalanya hanya terlihat di browser, berupa tombol yang
    // ditekan lalu diam.
    const res = await fetch(`${API}/participants/x/conversion`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://contoh.invalid',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    const izin = (res.headers.get('access-control-allow-methods') ?? '')
      .split(',').map((m) => m.trim().toUpperCase());

    for (const m of ['PATCH', 'PUT', 'DELETE']) {
      assert.ok(izin.includes(m), `preflight harus mengizinkan ${m}, dapat: ${izin.join(',')}`);
    }
  });

  it('endpoint terlindungi menolak request tanpa token', async () => {
    const saved = token; token = null;
    const r = await call('/events');
    token = saved;
    assert.equal(r.status, 401);
  });

  it('membuat event', async () => {
    eventClientId = randomUUID();
    const r = await call('/events', {
      method: 'POST',
      body: JSON.stringify({
        clientId: eventClientId, nama: '__e2e Screening Uji', lokasi: 'Menteng',
        tanggal: new Date().toISOString().slice(0, 10),
        tipe: 'berbayar', hargaPaket: 35000, petugas: '2 petugas', status: 'active',
      }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    eventId = r.body.id;
  });

  it('event berbayar tanpa harga ditolak basis data', async () => {
    const r = await call('/events', {
      method: 'POST',
      body: JSON.stringify({
        clientId: randomUUID(), nama: '__e2e tanpa harga', lokasi: 'X',
        tanggal: new Date().toISOString().slice(0, 10), tipe: 'berbayar', hargaPaket: 0,
      }),
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'constraint_violation');
  });

  it('sync push menerima peserta dan menandai bentrok dedup', async () => {
    const now = new Date().toISOString();
    const mk = (clientId, nama) => ({
      clientId, eventClientId, nama, gender: 'P', usia: 62,
      tanggalLahir: '1963-08-17', hp: HP, updatedAt: now,
      consent: { granted: true, versiTeks: 'v3', ts: now },
      screening: {
        clientId: randomUUID(), tinggi: 156, berat: 61, sistolik: 128, diastolik: 84,
        gula: 112, kolesterol: null, asamUrat: null,
        paramsDiambil: ['tinggi', 'berat', 'sistolik', 'diastolik', 'gula'],
        outOfRange: false, measuredAt: now,
      },
      conversion: { berminat: true, status: 'baru', nilaiTransaksi: 0, produk: null, updatedAt: now },
    });

    const r = await call('/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        batchId,
        events: [],
        // Dua petugas mencatat nomor HP yang sama di event yang sama.
        participants: [mk(pClientA, '__e2e Ibu Ratna'), mk(pClientB, '__e2e Ibu Ratna (dobel)')],
        anonTallies: [{
          clientId: randomUUID(), eventClientId, paramsDiambil: ['tinggi'], createdAt: now,
        }],
      }),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.accepted.participants.length, 2, 'kedua record harus tersimpan');
    assert.equal(r.body.conflicts.length, 1, 'tepat satu ditandai perlu ditinjau');
    assert.equal(r.body.conflicts[0].kind, 'dedup');
  });

  it('IMT dihitung server, bukan dikirim perangkat', async () => {
    const r = await call(`/participants?eventId=${eventId}`);
    assert.equal(r.status, 200);
    const p = r.body.participants.find((x) => x.clientId === pClientA);
    assert.equal(Number(p.imt), 25.1);
  });

  it('mengirim ulang batch yang sama tidak menduplikasi data', async () => {
    const r = await call('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ batchId, events: [], participants: [], anonTallies: [] }),
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.replayed, true);

    const list = await call(`/participants?eventId=${eventId}`);
    assert.equal(list.body.participants.length, 2, 'tetap dua, bukan empat');
  });

  it('rekap tidak menghitung record yang menunggu peninjauan', async () => {
    const r = await call(`/events/${eventId}/recap`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.peserta, 1, 'satu record ditahan sampai konflik diselesaikan');
    assert.equal(r.body.perluDitinjau, 1);
    assert.equal(r.body.tallyAnonim, 1);
    assert.equal(r.body.membeli, 0);
  });

  it('harga consumable yang belum diatur ditandai, bukan dihitung Rp 0', async () => {
    // Cabang baru belum punya harga strip. Rekap harus mengatakannya, bukan
    // menampilkan Rp 0 yang terbaca seolah pemeriksaannya gratis.
    const before = await call(`/events/${eventId}/recap`);
    assert.ok(before.body.hargaBelumDiatur.includes('gula'),
      'gula dipakai tapi harganya belum diatur — harus ditandai');
    assert.equal(before.body.estimasiConsumable, 0);
    const gula = before.body.consumable.find((c) => c.param === 'gula');
    assert.equal(gula.hargaSatuan, null, 'belum diatur diwakili null, bukan 0');
    assert.equal(gula.pakaiStrip, true);

    const tinggi = before.body.consumable.find((c) => c.param === 'tinggi');
    assert.equal(tinggi.pakaiStrip, false, 'tinggi tidak memakai strip');
    assert.equal(tinggi.hargaSatuan, 0, 'parameter tanpa strip memang berbiaya nol');
  });

  it('setelah harga diatur, estimasi consumable terhitung', async () => {
    const set = await call('/tenant/consumable-prices', {
      method: 'PATCH',
      body: JSON.stringify({ gula: 6000, kolesterol: 12000, asam_urat: 8000 }),
    });
    assert.equal(set.status, 200, JSON.stringify(set.body));

    const r = await call(`/events/${eventId}/recap`);
    assert.deepEqual(r.body.hargaBelumDiatur, []);
    // 1 peserta aktif × strip gula
    assert.equal(r.body.estimasiConsumable, 6000);

    // Kembalikan ke keadaan semula agar uji ini tidak mengubah cabang sungguhan.
    const reset = await call('/tenant/consumable-prices', {
      method: 'PATCH',
      body: JSON.stringify({ gula: null, kolesterol: null, asam_urat: null }),
    });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.body.consumablePrice, {});
  });

  it('konflik muncul di daftar dan bisa diselesaikan', async () => {
    const list = await call('/conflicts');
    assert.equal(list.status, 200);
    const group = list.body.conflicts.find((g) => g.hp === HP);
    assert.ok(group, 'grup konflik harus ada');
    assert.equal(group.records.length, 2);

    const keep = group.records[0];
    const drop = group.records[1];
    const r = await call('/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ keepId: keep.id, dropIds: [drop.id] }),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.archived, 1);

    const after = await call('/conflicts');
    assert.ok(!after.body.conflicts.some((g) => g.hp === HP), 'konflik harus hilang');
  });

  it('status membeli tanpa produk ditolak', async () => {
    const list = await call(`/participants?eventId=${eventId}`);
    const p = list.body.participants[0];
    const r = await call(`/participants/${p.id}/conversion`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'membeli', nilaiTransaksi: 0 }),
    });
    assert.equal(r.status, 400);
  });

  it('konversi membeli tercatat dan masuk rekap', async () => {
    const list = await call(`/participants?eventId=${eventId}`);
    const p = list.body.participants[0];
    const r = await call(`/participants/${p.id}/conversion`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'membeli', nilaiTransaksi: 1400000, produk: 'Paket herbal sendi' }),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const recap = await call(`/events/${eventId}/recap`);
    assert.equal(recap.body.membeli, 1);
    assert.equal(recap.body.penjualan, 1400000);
    assert.equal(recap.body.rasioKonversi, 1);
  });

  it('pendapatan biaya event dihitung terpisah dari penjualan produk', async () => {
    const r = await call(`/events/${eventId}/recap`);
    // Event berbayar Rp 35.000. Peserta yang menolak consent tetap dilayani
    // dan tetap membayar, jadi tally anonim ikut dihitung.
    assert.equal(r.body.pendapatanEvent, 2 * 35000);
    assert.equal(r.body.penjualan, 1400000, 'penjualan produk dari konversi');
    assert.equal(r.body.pendapatanTotal, 2 * 35000 + 1400000);
  });

  it('ekspor CSV berisi header dan baris peserta', async () => {
    const res = await fetch(`${API}/events/${eventId}/export.csv`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/csv/);
    const csv = await res.text();
    const lines = csv.trim().split('\r\n');
    assert.match(lines[0], /nama;jenis_kelamin;tanggal_lahir;tanggal_lahir_taksiran;usia;no_hp/);
    // Kolom date dibaca lewat to_char; tanpa itu ia bergeser sehari di WIB.
    assert.match(lines[1], /;1963-08-17;tidak;/, 'tanggal lahir tercetak apa adanya, bukan taksiran');
    assert.equal(lines.length, 2, 'header + 1 peserta aktif');
    assert.match(lines[1], /Paket herbal sendi/);
  });

  it('teks consent aktif tersedia dengan versinya', async () => {
    const r = await call('/consent-text');
    assert.equal(r.status, 200);
    assert.equal(r.body.versi, 'v3');
    assert.match(r.body.isi, /nama, jenis kelamin, tanggal lahir/);
    // Tautan hasil adalah perlakuan baru atas data peserta, dan teks yang
    // aktif harus menyebutnya — termasuk masa berlakunya.
    assert.match(r.body.isi, /tautan pribadi yang berlaku 30 hari/);
  });

  it('audit log mencatat tindakan koordinator', async () => {
    const r = await call('/audit?limit=50');
    assert.equal(r.status, 200);
    const actions = r.body.entries.map((e) => e.action);
    assert.ok(actions.includes('event.create'), 'pembuatan event tercatat');
    assert.ok(actions.includes('conflict.resolve'), 'resolusi konflik tercatat');
    assert.ok(actions.includes('event.export_csv'), 'ekspor CSV tercatat');
  });

  it('rekap satu peserta memuat nilai tiap parameter, bukan hanya IMT', async () => {
    const list = await call(`/participants?eventId=${eventId}`);
    const p = list.body.participants[0];

    const r = await call(`/participants/${p.id}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const d = r.body;

    assert.equal(d.id, p.id);
    assert.equal(d.event.id, eventId);
    assert.ok(d.consent, 'record persetujuan ikut');
    assert.equal(d.consent.granted, true);
    assert.equal(d.consent.versiTeks, 'v3');

    assert.ok(d.screening, 'hasil pengukuran ikut');
    assert.equal(Number(d.screening.tinggi), 156);
    assert.equal(Number(d.screening.berat), 61);
    assert.equal(Number(d.screening.imt), 25.1);
    assert.equal(d.screening.sistolik, 128);
    assert.equal(d.screening.gula, 112);
    assert.equal(d.screening.kolesterol, null, 'parameter yang dilewati tetap null');
    assert.ok(d.screening.paramsDiambil.includes('gula'));

    assert.ok(d.conversion, 'status konversi ikut');
  });

  it('rekap peserta yang tidak ada mengembalikan 404', async () => {
    const r = await call('/participants/00000000-0000-0000-0000-000000000000');
    assert.equal(r.status, 404);
  });

  it('sync menautkan peserta ke pelanggan dan mencerminkan screening jadi pengukuran', async () => {
    // Perangkat lapangan masih mengirim satu objek screening. Server yang
    // memecahnya jadi baris per parameter, supaya riwayat lintas kunjungan
    // terbentuk tanpa perangkat perlu tahu soal entitas pelanggan.
    const list = await call(`/participants?eventId=${eventId}`);
    const p = list.body.participants[0];
    const d = await call(`/participants/${p.id}`);
    assert.ok(d.body.pelangganId, 'peserta hasil sync harus tertaut ke pelanggan');
    pelangganId = d.body.pelangganId;

    const ukur = await call(`/pelanggan/${pelangganId}/pengukuran`);
    assert.equal(ukur.status, 200, JSON.stringify(ukur.body));
    const jenis = ukur.body.pengukuran.map((x) => x.jenis);
    assert.ok(jenis.includes('tinggi') && jenis.includes('berat') && jenis.includes('gula'));

    const gula = ukur.body.pengukuran.find((x) => x.jenis === 'gula');
    assert.equal(gula.konteks, 'sewaktu', 'gula tanpa konteks dianggap sewaktu');
  });

  it('pengukuran bisa dicatat, diubah, dan dihapus', async () => {
    const buat = await call('/pengukuran', {
      method: 'POST',
      body: JSON.stringify({
        pelangganId, jenis: 'gula', konteks: 'puasa', nilai: 96, outOfRange: false,
      }),
    });
    assert.equal(buat.status, 201, JSON.stringify(buat.body));
    const id = buat.body.id;

    const ubah = await call(`/pengukuran/${id}`, {
      method: 'PATCH', body: JSON.stringify({ nilai: 104 }),
    });
    assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
    assert.equal(Number(ubah.body.nilai), 104);

    // Puasa dan sewaktu hidup berdampingan — inilah yang tidak bisa dilakukan
    // model lama, yang hanya punya satu kolom gula per peserta.
    const semua = await call(`/pelanggan/${pelangganId}/pengukuran`);
    const konteks = semua.body.pengukuran
      .filter((x) => x.jenis === 'gula').map((x) => x.konteks).sort();
    assert.deepEqual(konteks, ['puasa', 'sewaktu']);

    const hapus = await call(`/pengukuran/${id}`, { method: 'DELETE' });
    assert.equal(hapus.status, 200);
    const lagi = await call(`/pengukuran/${id}`, { method: 'DELETE' });
    assert.equal(lagi.status, 404, 'menghapus dua kali tidak berpura-pura berhasil');
  });

  it('data yang baru dibuat langsung bisa dibaca kembali (balapan commit)', async () => {
    // Regresi: balasan 201 pernah dikirim dari DALAM transaksi, sementara
    // `withTenant` baru meng-commit setelah callback selesai. Klien yang
    // langsung menindaklanjuti 201-nya bisa mendapat 404 atas barisnya sendiri
    // — dan di lapangan itu berarti pengukuran yang tampak tersimpan lalu
    // hilang. Uji ini menembak celah itu: baca tanpa jeda apa pun.
    for (let i = 0; i < 5; i++) {
      const buat = await call('/pengukuran', {
        method: 'POST',
        body: JSON.stringify({ pelangganId, jenis: 'nadi', nilai: 70 + i }),
      });
      assert.equal(buat.status, 201, JSON.stringify(buat.body));

      const baca = await call(`/pengukuran/${buat.body.id}`, {
        method: 'PATCH', body: JSON.stringify({ nilai: 80 + i }),
      });
      assert.equal(baca.status, 200, `percobaan ${i}: ${JSON.stringify(baca.body)}`);

      await call(`/pengukuran/${buat.body.id}`, { method: 'DELETE' });
    }
  });

  it('konteks gula ditolak untuk parameter selain gula darah', async () => {
    const r = await call('/pengukuran', {
      method: 'POST',
      body: JSON.stringify({ pelangganId, jenis: 'berat', konteks: 'puasa', nilai: 61 }),
    });
    assert.equal(r.status, 400, JSON.stringify(r.body));
  });

  it('transaksi tercatat dengan total yang dihitung server', async () => {
    const r = await call('/transaksi', {
      method: 'POST',
      body: JSON.stringify({
        pelangganId, jenis: 'terapi', nama: '__uji_terapi', jumlah: 2, hargaSatuan: 150000,
      }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(Number(r.body.total), 300000, 'total tidak diambil dari input klien');

    const daftar = await call(`/pelanggan/${pelangganId}/transaksi`);
    assert.ok(daftar.body.total >= 300000);

    await call(`/transaksi/${r.body.id}`, { method: 'DELETE' });
  });

  it('menghapus pengukuran menyembunyikannya, bukan membuangnya', async () => {
    // Hasil pengukuran adalah fakta pada satu momen dan tidak bisa diulang.
    // Kalau yang terhapus ternyata bukan yang dimaksud, harus ada jalan pulang.
    const buat = await call('/pengukuran', {
      method: 'POST',
      body: JSON.stringify({ pelangganId, jenis: 'kolesterol', nilai: 188 }),
    });
    assert.equal(buat.status, 201, JSON.stringify(buat.body));
    const id = buat.body.id;

    const adaSebelum = (await call(`/pelanggan/${pelangganId}/pengukuran`))
      .body.pengukuran.some((x) => x.id === id);
    assert.ok(adaSebelum);

    assert.equal((await call(`/pengukuran/${id}`, { method: 'DELETE' })).status, 200);

    const adaSesudah = (await call(`/pelanggan/${pelangganId}/pengukuran`))
      .body.pengukuran.some((x) => x.id === id);
    assert.equal(adaSesudah, false, 'yang terhapus tidak boleh ikut terbaca');

    // Menghapus dua kali tidak berpura-pura berhasil.
    assert.equal((await call(`/pengukuran/${id}`, { method: 'DELETE' })).status, 404);

    // ...tapi barisnya masih ada dan bisa dipulihkan.
    assert.equal((await call(`/pengukuran/${id}/pulihkan`, { method: 'POST' })).status, 200);
    const adaLagi = (await call(`/pelanggan/${pelangganId}/pengukuran`))
      .body.pengukuran.find((x) => x.id === id);
    assert.ok(adaLagi, 'pengukuran harus bisa dipulihkan');
    assert.equal(Number(adaLagi.nilai), 188, 'nilainya kembali utuh');

    await call(`/pengukuran/${id}`, { method: 'DELETE' });
  });

  it('data terhapus bisa ditemukan kembali beserta siapa yang menghapusnya', async () => {
    // Hapus lunak tanpa cara melihatnya kembali sama saja dengan hapus biasa.
    // Uji ini menjaga janji "bisa dipulihkan" tetap bisa ditepati dari layar,
    // bukan hanya benar di tingkat basis data.
    const buat = await call('/pengukuran', {
      method: 'POST',
      body: JSON.stringify({ pelangganId, jenis: 'lingkar_perut', nilai: 84 }),
    });
    assert.equal(buat.status, 201, JSON.stringify(buat.body));
    const id = buat.body.id;

    const kosong = await call(`/pelanggan/${pelangganId}/terhapus`);
    assert.equal(kosong.status, 200, JSON.stringify(kosong.body));
    assert.equal(kosong.body.pengukuran.some((x) => x.id === id), false,
      'yang belum dihapus tidak boleh muncul di daftar terhapus');

    await call(`/pengukuran/${id}`, { method: 'DELETE' });

    const isi = await call(`/pelanggan/${pelangganId}/terhapus`);
    const item = isi.body.pengukuran.find((x) => x.id === id);
    assert.ok(item, 'yang dihapus harus bisa ditemukan kembali');
    assert.equal(Number(item.nilai), 84, 'nilainya utuh, siap dipulihkan');
    assert.ok(item.dihapusPada, 'waktu penghapusan ikut tercatat');
    assert.ok(item.dihapusOlehNama, 'siapa yang menghapus ikut tercatat');

    await call(`/pengukuran/${id}/pulihkan`, { method: 'POST' });
    const sesudah = await call(`/pelanggan/${pelangganId}/terhapus`);
    assert.equal(sesudah.body.pengukuran.some((x) => x.id === id), false,
      'yang sudah dipulihkan keluar dari daftar terhapus');

    await call(`/pengukuran/${id}`, { method: 'DELETE' });
  });

  it('transaksi yang dihapus tidak ikut dihitung dalam total', async () => {
    const awal = (await call(`/pelanggan/${pelangganId}/transaksi`)).body.total;
    const r = await call('/transaksi', {
      method: 'POST',
      body: JSON.stringify({ pelangganId, nama: '__uji_hapus', jumlah: 1, hargaSatuan: 500000 }),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal((await call(`/pelanggan/${pelangganId}/transaksi`)).body.total, awal + 500000);

    await call(`/transaksi/${r.body.id}`, { method: 'DELETE' });
    assert.equal(
      (await call(`/pelanggan/${pelangganId}/transaksi`)).body.total, awal,
      'total harus kembali seperti sebelum transaksi dibuat',
    );

    await call(`/transaksi/${r.body.id}/pulihkan`, { method: 'POST' });
    assert.equal((await call(`/pelanggan/${pelangganId}/transaksi`)).body.total, awal + 500000);
    await call(`/transaksi/${r.body.id}`, { method: 'DELETE' });
  });

  it('daftar rekan hanya memuat nama dan peran, bukan email', async () => {
    const r = await call('/rekan');
    assert.equal(r.status, 200);
    assert.ok(r.body.rekan.length > 0);
    assert.equal(r.body.rekan[0].email, undefined, 'email rekan tidak ikut dibocorkan');
    assert.ok(r.body.rekan[0].nama);
  });

  it('penugasan petugas event tersimpan dan bersifat menggantikan', async () => {
    const rekan = (await call('/rekan')).body.rekan;
    const ids = rekan.slice(0, 2).map((x) => x.id);
    const set = await call(`/events/${eventId}/petugas`, {
      method: 'PUT', body: JSON.stringify({ userIds: ids }),
    });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body.jumlah, ids.length);

    const baca = await call(`/events/${eventId}/petugas`);
    assert.deepEqual(baca.body.petugas.map((x) => x.id).sort(), [...ids].sort());

    // Mengirim ulang daftar yang lebih pendek harus mengurangi, bukan menumpuk.
    await call(`/events/${eventId}/petugas`, {
      method: 'PUT', body: JSON.stringify({ userIds: ids.slice(0, 1) }),
    });
    const lagi = await call(`/events/${eventId}/petugas`);
    assert.equal(lagi.body.petugas.length, 1);
  });

  it('katalog menolak nama kembar dalam satu cabang dan jenis', async () => {
    // Inilah alasan katalog ada: `transaksi.nama` teks bebas membuat
    // "Paket A" dan "paket a" menjadi dua barang berbeda. Kalau katalognya
    // sendiri boleh menumbuhkan duplikat, tidak ada yang terselesaikan.
    const buat = await call('/katalog', {
      method: 'POST',
      body: JSON.stringify({ jenis: 'produk', nama: '__uji_katalog', harga: 125000 }),
    });
    assert.equal(buat.status, 201, JSON.stringify(buat.body));
    katalogId = buat.body.id;

    const kembar = await call('/katalog', {
      method: 'POST',
      body: JSON.stringify({ jenis: 'produk', nama: '__UJI_KATALOG', harga: 999 }),
    });
    assert.equal(kembar.status, 409, 'nama kembar tanpa memandang huruf besar-kecil ditolak');
    assert.match(kembar.body.message, /sudah ada/i, 'pesannya bisa dibaca Koordinator');

    // Jenis berbeda bukan duplikat: "Paket A" sebagai produk dan sebagai
    // terapi memang dua hal yang berbeda.
    const lainJenis = await call('/katalog', {
      method: 'POST',
      body: JSON.stringify({ jenis: 'terapi', nama: '__uji_katalog', harga: 200000 }),
    });
    assert.equal(lainJenis.status, 201, JSON.stringify(lainJenis.body));
    await call(`/katalog/${lainJenis.body.id}`, { method: 'DELETE' });
  });

  it('katalog yang sudah dipakai transaksi tidak bisa dihapus, hanya dinonaktifkan', async () => {
    const trx = await call('/transaksi', {
      method: 'POST',
      body: JSON.stringify({
        pelangganId, katalogId, jenis: 'produk',
        nama: '__uji_katalog', jumlah: 1, hargaSatuan: 125000,
      }),
    });
    assert.equal(trx.status, 201, JSON.stringify(trx.body));

    const tolak = await call(`/katalog/${katalogId}`, { method: 'DELETE' });
    assert.equal(tolak.status, 409, 'menghapus akan memutus riwayat belanja dari nama barangnya');
    assert.match(tolak.body.message, /nonaktifkan/i, 'pesannya menunjukkan jalan keluarnya');

    const nonaktif = await call(`/katalog/${katalogId}`, {
      method: 'PATCH', body: JSON.stringify({ aktif: false }),
    });
    assert.equal(nonaktif.status, 200);
    assert.equal(nonaktif.body.aktif, false);

    // Yang nonaktif keluar dari pilihan form belanja, tapi tetap ada di daftar.
    const aktifSaja = await call('/katalog?aktif=true');
    assert.equal(aktifSaja.body.katalog.some((k) => k.id === katalogId), false);
    const semuanya = await call('/katalog');
    assert.ok(semuanya.body.katalog.some((k) => k.id === katalogId));

    await call(`/transaksi/${trx.body.id}`, { method: 'DELETE' });
  });

  it('Petugas boleh membaca katalog tetapi tidak mengubahnya', async () => {
    // Form belanja dipakai petugas, jadi membacanya harus terbuka. Yang
    // dibatasi peran adalah menulisnya.
    const rekan = (await call('/rekan')).body.rekan;
    assert.ok(rekan.length > 0);

    const tulis = await call('/katalog', {
      method: 'POST',
      headers: { authorization: 'Bearer tidak-berlaku' },
      body: JSON.stringify({ jenis: 'produk', nama: '__uji_tanpa_izin', harga: 1 }),
    });
    assert.equal(tulis.status, 401, 'token tidak berlaku ditolak sebelum menyentuh basis data');
  });

  it('cabang bisa dibuat dan diganti namanya, tapi tidak menonaktifkan diri sendiri', async () => {
    const r = await call('/cabang');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const sendiri = r.body.cabang.find((c) => c.nama === (process.env.BOOTSTRAP_TENANT ?? 'Cabang Uji'));
    assert.ok(sendiri, 'cabang milik akun uji ikut terdaftar');
    assert.equal(typeof sendiri.pelanggan, 'number');

    const tolak = await call(`/cabang/${sendiri.id}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'inactive' }),
    });
    assert.equal(tolak.status, 400, 'menonaktifkan cabang sendiri mengunci akunnya keluar');
  });

  it('ringkasan pusat memberi angka agregat, bukan daftar orang', async () => {
    const r = await call('/pusat/ringkasan');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.cabang.length > 0);
    assert.equal(typeof r.body.total.pelanggan, 'number');
    // Riwayat tetap per cabang: layar ini tidak boleh membawa identitas apa pun.
    const teks = JSON.stringify(r.body);
    assert.ok(!teks.includes('"hp"'), 'nomor HP tidak boleh muncul di ringkasan pusat');
    assert.ok(!teks.includes('"nama":"' + EMAIL), 'identitas orang tidak ikut');

    const audit = await call('/audit?limit=20');
    assert.ok(
      audit.body.entries.some((e) => e.action === 'pusat.ringkasan'),
      'pembacaan lintas cabang wajib meninggalkan jejak',
    );
  });

  it('US-01 — event berpeserta diarsipkan, bukan dihapus, dan hilang dari daftar', async () => {
    // Tidak ada endpoint hapus sama sekali — satu-satunya jalan keluar adalah arsip.
    const sebelum = await call('/events');
    assert.ok(sebelum.body.events.some((e) => e.id === eventId), 'event masih di daftar aktif');

    const r = await call(`/events/${eventId}/archive`, { method: 'POST' });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const sesudah = await call('/events');
    assert.ok(!sesudah.body.events.some((e) => e.id === eventId), 'event arsip hilang dari daftar');

    // Yang penting: pesertanya tidak ikut hilang.
    const peserta = await call(`/participants?eventId=${eventId}`);
    assert.ok(peserta.body.participants.length > 0, 'data peserta tetap tersimpan setelah arsip');

    const recap = await call(`/events/${eventId}/recap`);
    assert.equal(recap.status, 200, 'rekap event arsip tetap bisa dibuka');
  });

  it('§4.5.8 — akses BACA Admin Pusat ke data peserta ikut tercatat', async () => {
    // Akun uji berperan admin_pusat, jadi pembacaan daftar peserta dan daftar
    // konflik wajib meninggalkan jejak — bukan hanya operasi tulis.
    const me = await call('/auth/me');
    assert.equal(me.body.user.role, 'admin_pusat', 'uji ini mengandaikan peran admin_pusat');

    await call(`/participants?eventId=${eventId}`);
    await call('/conflicts');

    const r = await call('/audit?limit=50');
    const baca = r.body.entries.filter((e) => e.action === 'participant.read');
    const konflik = r.body.entries.filter((e) => e.action === 'conflict.read');
    assert.ok(baca.length > 0, 'pembacaan daftar peserta harus tercatat');
    assert.ok(konflik.length > 0, 'pembacaan daftar konflik harus tercatat');

    const entri = baca[0];
    assert.equal(entri.actorRole, 'admin_pusat');
    assert.equal(typeof entri.meta.jumlah, 'number', 'jumlah record yang diakses ikut dicatat');
    assert.equal(typeof entri.meta.lintasCabang, 'boolean', 'penanda lintas cabang ikut dicatat');
  });

  /**
   * Sengaja diletakkan paling akhir.
   *
   * Uji ini menambah dua peserta ke event yang sama, dan beberapa uji di
   * atasnya menghitung jumlah peserta event itu secara persis ("tetap dua,
   * bukan empat"). Menyisipkannya di tengah membuat uji yang tidak ada
   * hubungannya ikut gagal — dan yang gagal bukan yang rusak.
   */
  it('mode sync cabang bisa diubah dan ikut di profil', async () => {
    // Bawaannya 'online', termasuk untuk cabang yang dibuat sebelum kolomnya
    // ada — migrasi 017 memberi DEFAULT, bukan NULL.
    const awal = await call('/auth/me');
    assert.equal(awal.body.user.modeSync, 'online', 'bawaan harus online');

    const ubah = await call('/tenant/mode-sync', {
      method: 'PATCH', body: JSON.stringify({ modeSync: 'offline' }),
    });
    assert.equal(ubah.status, 200, JSON.stringify(ubah.body));
    assert.equal(ubah.body.modeSync, 'offline');

    const sesudah = await call('/auth/me');
    assert.equal(sesudah.body.user.modeSync, 'offline', 'profil ikut berubah');

    const salah = await call('/tenant/mode-sync', {
      method: 'PATCH', body: JSON.stringify({ modeSync: 'kadang-kadang' }),
    });
    assert.equal(salah.status, 400, 'mode di luar dua pilihan ditolak');

    // Dikembalikan agar uji ini tidak mengubah cabang sungguhan.
    const balik = await call('/tenant/mode-sync', {
      method: 'PATCH', body: JSON.stringify({ modeSync: 'online' }),
    });
    assert.equal(balik.body.modeSync, 'online');
  });

  it('peserta tanpa nomor HP diterima dan tidak pernah ditandai kembar', async () => {
    const now = new Date().toISOString();
    // DUA peserta tanpa nomor di event yang sama. Sebelum migrasi 016 keduanya
    // akan saling menandai "nomor kembar" lewat string kosong yang sama —
    // persis kesalahan yang membuat tujuh orang di lapangan mengaku duplikat.
    const mk = (nama) => ({
      clientId: randomUUID(), eventClientId, nama, gender: 'L', usia: 40,
      hp: null, updatedAt: now,
      consent: { granted: true, versiTeks: 'v3', ts: now },
    });
    const r = await call('/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        batchId: randomUUID(), events: [],
        participants: [mk('__e2e Tanpa HP A'), mk('__e2e Tanpa HP B')],
        anonTallies: [],
      }),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.accepted.participants.length, 2, 'keduanya tersimpan');
    assert.equal(r.body.conflicts.length, 0, 'tanpa nomor tidak pernah bentrok dedup');

    const list = await call(`/participants?eventId=${eventId}`);
    const tanpa = list.body.participants.filter((p) => p.nama.startsWith('__e2e Tanpa HP'));
    assert.equal(tanpa.length, 2);
    for (const p of tanpa) {
      assert.equal(p.hp, null, 'nomornya null, bukan string kosong');
      assert.equal(p.needsReview, false);
    }
  });
});
