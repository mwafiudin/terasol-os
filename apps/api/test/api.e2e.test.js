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

let token, eventClientId, eventId;
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
      clientId, eventClientId, nama, gender: 'P', usia: 62, hp: HP, updatedAt: now,
      consent: { granted: true, versiTeks: 'v1', ts: now },
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
    assert.match(lines[0], /nama;jenis_kelamin;usia;no_hp/);
    assert.equal(lines.length, 2, 'header + 1 peserta aktif');
    assert.match(lines[1], /Paket herbal sendi/);
  });

  it('teks consent aktif tersedia dengan versinya', async () => {
    const r = await call('/consent-text');
    assert.equal(r.status, 200);
    assert.equal(r.body.versi, 'v1');
    assert.match(r.body.isi, /nama, jenis kelamin, usia/);
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
    assert.equal(d.consent.versiTeks, 'v1');

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
});
