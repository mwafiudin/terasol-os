/**
 * Akun dan data DEMO.
 *
 * Semuanya masuk ke tenant terpisah ("Cabang Demo") supaya tidak pernah
 * tercampur dengan data cabang sungguhan — pemisahannya ditegakkan RLS yang
 * sama seperti antar-cabang asli, bukan sekadar konvensi penamaan.
 *
 * Angkanya disamakan dengan kanvas desain (Bazar: 48 peserta, 17 berminat,
 * 6 membeli, Rp 8.400.000, consumable Rp 662.000) agar hasil rekap bisa
 * diverifikasi dengan mata.
 *
 *   DEMO_PASSWORD=... npm run seed
 *   DEMO_PASSWORD=... npm run seed -- --reset   (isi ulang data demo saja)
 */
import { randomUUID } from 'node:crypto';
import { closePools, withoutTenant, type Tx } from './db.js';
import { hashPassword } from './password.js';

const RESET = process.argv.includes('--reset');
const TENANT = 'Cabang Demo';
const PASSWORD = process.env.DEMO_PASSWORD;

if (!PASSWORD || PASSWORD.length < 12) {
  console.error(
    'DEMO_PASSWORD belum disetel (minimal 12 karakter).\n' +
    'Akun demo tetap tinggal di basis data produksi, jadi kata sandinya harus\n' +
    'acak dan panjang — bukan tebakan. Simpan di apps/api/.env (tidak masuk git).',
  );
  process.exit(2);
}

const DEMO_USERS = [
  { email: 'petugas.demo@terasol.id', nama: 'Petugas Demo', role: 'petugas' },
  { email: 'koordinator.demo@terasol.id', nama: 'Koordinator Demo', role: 'koordinator' },
  { email: 'pusat.demo@terasol.id', nama: 'Admin Pusat Demo', role: 'admin_pusat' },
] as const;

const NAMES_P = ['Ibu Sari', 'Ibu Wati', 'Ibu Endang', 'Ibu Yuni', 'Ibu Lastri', 'Ibu Rohaya', 'Ibu Nurul', 'Ibu Tuti', 'Ibu Maryam', 'Ibu Siti', 'Ibu Aminah', 'Ibu Dewi', 'Ibu Halimah', 'Ibu Kartini', 'Ibu Sumarni', 'Ibu Warsih', 'Ibu Jumiati', 'Ibu Ningsih', 'Ibu Rahayu', 'Ibu Painem'];
const NAMES_L = ['Bapak Slamet', 'Bapak Agus', 'Bapak Joko', 'Bapak Bambang', 'Bapak Tono', 'Bapak Udin', 'Bapak Karno', 'Bapak Yanto', 'Bapak Sugeng', 'Bapak Rahmat', 'Bapak Dedi', 'Bapak Wahyu', 'Bapak Herman', 'Bapak Salim', 'Bapak Anwar'];
const PRODUCTS = ['Paket herbal sendi', 'Madu Terasol', 'Paket terapi 4 sesi', 'Minyak urut Terasol', 'Paket herbal gula'];
const SALES = [2_100_000, 1_750_000, 1_400_000, 1_400_000, 1_050_000, 700_000]; // total 8.400.000

// PRNG deterministik — seed selalu menghasilkan data yang sama.
let rng = 42;
const rand = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length)]!;
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

async function seed(tx: Tx) {
  let tenantId = (await tx.query<{ id: string }>(
    'select id from tenants where nama = $1', [TENANT],
  )).rows[0]?.id;

  if (tenantId && RESET) {
    // Consent hanya boleh terhapus lewat purge resmi (migrasi 002).
    await tx.query(`select set_config('app.purge','on',true)`);
    // Dibatasi tenant demo — data cabang sungguhan tidak tersentuh.
    await tx.query('delete from participants where tenant_id = $1', [tenantId]);
    await tx.query('delete from anon_tallies where tenant_id = $1', [tenantId]);
    await tx.query('delete from events where tenant_id = $1', [tenantId]);
    await tx.query('delete from sync_log where tenant_id = $1', [tenantId]);
    console.log(`seed: data demo di "${TENANT}" dikosongkan`);
  }

  if (!tenantId) {
    tenantId = (await tx.query<{ id: string }>(
      'insert into tenants (nama) values ($1) returning id', [TENANT],
    )).rows[0]!.id;
    console.log(`seed: tenant "${TENANT}" dibuat`);
  }

  // Harga consumable untuk cabang demo. Angka ini KARANGAN untuk keperluan
  // demo — cabang sungguhan mengisinya sendiri lewat Pengaturan, dan sebelum
  // diisi rekap akan menyebut "harga belum diatur", bukan Rp 0.
  await tx.query(
    `update tenants set consumable_prices = '{"gula":6000,"kolesterol":12000,"asam_urat":8000}'::jsonb
      where id = $1`,
    [tenantId],
  );

  const hash = await hashPassword(PASSWORD!);
  const userIds: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const { rows } = await tx.query<{ id: string }>(
      `insert into users (tenant_id, email, password_hash, nama, role)
       values ($1,$2,$3,$4,$5::user_role)
       on conflict (lower(email)) do update
          set nama = excluded.nama, password_hash = excluded.password_hash, active = true
       returning id`,
      [tenantId, u.email, hash, u.nama, u.role],
    );
    userIds[u.role] = rows[0]!.id;
  }
  console.log(`seed: ${DEMO_USERS.length} akun demo siap`);

  if ((await tx.query('select 1 from events where tenant_id = $1 limit 1', [tenantId])).rowCount) {
    console.log('seed: event demo sudah ada — dilewati (pakai --reset untuk isi ulang)');
    return;
  }

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const minus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };

  const mkEvent = async (e: {
    nama: string; lokasi: string; tanggal: string;
    tipe: 'gratis' | 'berbayar'; harga: number; status: string;
  }) => (await tx.query<{ id: string }>(
    `insert into events (tenant_id, client_id, nama, lokasi, tanggal, tipe, harga_paket, petugas, status, created_by)
     values ($1,$2,$3,$4,$5,$6::event_tipe,$7,'2 petugas cabang',$8::event_status,$9) returning id`,
    [tenantId, randomUUID(), e.nama, e.lokasi, e.tanggal, e.tipe, e.harga, e.status, userIds.koordinator],
  )).rows[0]!.id;

  const evPosyandu = await mkEvent({
    nama: 'Screening Posyandu Lansia', lokasi: 'Menteng',
    tanggal: iso(today), tipe: 'gratis', harga: 0, status: 'active',
  });
  const evBazar = await mkEvent({
    nama: 'Bazar Sehat Kelapa Gading', lokasi: 'Kelapa Gading',
    tanggal: iso(minus(4)), tipe: 'berbayar', harga: 35_000, status: 'done',
  });

  const addParticipant = async (opts: {
    eventId: string; nama?: string; gender?: 'P' | 'L'; usia?: number; hp?: string;
    gula?: boolean; kol?: boolean; asam?: boolean;
    berminat?: boolean; convStatus?: string; nilai?: number; produk?: string;
    needsReview?: boolean; createdAt?: Date;
  }) => {
    const gender = opts.gender ?? (rand() < 0.6 ? 'P' : 'L');
    const nama = opts.nama ?? pick(gender === 'P' ? NAMES_P : NAMES_L);
    const usia = opts.usia ?? int(50, 74);
    const hp = opts.hp ?? '08' + String(int(1_200_000_000, 1_999_999_999));
    const createdAt = opts.createdAt ?? minus(int(0, 3));
    // Sebagian peserta demo sengaja TANPA tanggal lahir: itulah keadaan setiap
    // orang yang terdaftar sebelum kolomnya ada, dan tampilan yang jatuh ke
    // usia tersimpan harus ikut terlihat saat demo, bukan hanya di produksi.
    const tglLahir = rand() < 0.75
      ? `${new Date().getFullYear() - usia}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`
      : null;

    const pid = (await tx.query<{ id: string }>(
      `insert into participants (tenant_id, event_id, client_id, nama, gender, usia, tanggal_lahir,
                                 hp, needs_review, created_by, created_at)
       values ($1,$2,$3,$4,$5::gender,$6,$7,$8,$9,$10,$11) returning id`,
      [tenantId, opts.eventId, randomUUID(), nama, gender, usia, tglLahir, hp,
       opts.needsReview ?? false, userIds.petugas, createdAt],
    )).rows[0]!.id;

    await tx.query(
      `insert into consents (tenant_id, participant_id, granted, versi_teks) values ($1,$2,true,'v3')`,
      [tenantId, pid],
    );

    const params = ['tinggi', 'berat', 'sistolik', 'diastolik'];
    if (opts.gula) params.push('gula');
    if (opts.kol) params.push('kolesterol');
    if (opts.asam) params.push('asam_urat');

    await tx.query(
      `insert into screenings (tenant_id, participant_id, client_id, tinggi, berat, sistolik, diastolik,
                               gula, kolesterol, asam_urat, params_diambil, measured_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [tenantId, pid, randomUUID(), int(148, 170), int(48, 78), int(110, 160), int(70, 95),
       opts.gula ? int(85, 175) : null, opts.kol ? int(150, 260) : null,
       opts.asam ? Number((4 + rand() * 4).toFixed(1)) : null, params, createdAt],
    );

    if (opts.berminat) {
      await tx.query(
        `insert into conversions (tenant_id, participant_id, berminat, status, nilai_transaksi, produk)
         values ($1,$2,true,$3::conv_status,$4,$5)`,
        [tenantId, pid, opts.convStatus ?? 'baru', opts.nilai ?? 0, opts.produk ?? null],
      );
    }
    return { pid, hp };
  };

  // Bazar: 48 peserta — 41 gula / 22 kolesterol / 19 asam urat,
  // 17 berminat, 6 membeli senilai Rp 8.400.000.
  for (let i = 0; i < 48; i++) {
    const membeli = i >= 1 && i <= 6;
    await addParticipant({
      eventId: evBazar,
      nama: i === 0 ? 'Bapak Hasan' : undefined,
      gender: i === 0 ? 'L' : undefined,
      usia: i === 0 ? 68 : undefined,
      gula: i < 41, kol: i < 22, asam: i < 19,
      berminat: i < 17,
      convStatus: membeli ? 'membeli' : i <= 9 ? 'dihubungi' : 'baru',
      nilai: membeli ? SALES[i - 1] : 0,
      produk: membeli ? pick(PRODUCTS) : undefined,
      createdAt: minus(4),
    });
  }
  await tx.query(
    `insert into anon_tallies (tenant_id, event_id, client_id, params_diambil)
     select $1, $2, gen_random_uuid(), array['tinggi','berat'] from generate_series(1,2)`,
    [tenantId, evBazar],
  );

  // Posyandu (berlangsung): 12 peserta, 5 berminat, 1 tally anonim.
  let hpKembar = '';
  for (let i = 0; i < 12; i++) {
    const r = await addParticipant({
      eventId: evPosyandu,
      nama: i === 0 ? 'Ibu Ratna' : undefined,
      gender: i === 0 ? 'P' : undefined,
      usia: i === 0 ? 62 : undefined,
      hp: i === 0 ? '081234567890' : undefined,
      gula: i < 8,
      berminat: i < 5,
      createdAt: today,
    });
    if (i === 3) hpKembar = r.hp;
  }
  await tx.query(
    `insert into anon_tallies (tenant_id, event_id, client_id, params_diambil)
     values ($1,$2,gen_random_uuid(),array['tinggi','berat'])`,
    [tenantId, evPosyandu],
  );

  // Satu konflik dedup (§4.3) supaya layar resolusi konflik ada isinya saat demo.
  await addParticipant({
    eventId: evPosyandu, nama: 'Bapak Slamet', gender: 'L', usia: 67,
    hp: hpKembar, gula: true, needsReview: true, createdAt: today,
  });

  console.log('seed: 2 event, 61 peserta, 3 tally anonim, 1 konflik dedup');
}

withoutTenant(seed)
  .then(async () => {
    await closePools();
    console.log('\nAkun demo (tenant "%s"):', TENANT);
    for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(12)} ${u.email}`);
    console.log('Kata sandi: dari DEMO_PASSWORD — tersimpan di apps/api/.env, tidak masuk git.');
    process.exit(0);
  })
  .catch(async (err) => { console.error(err); await closePools(); process.exit(1); });
