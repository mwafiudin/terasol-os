/**
 * Migrasi dijalankan pemilik database yang BUKAN superuser (rencana self-host:
 * role pemilik ber-CREATEROLE, bukan `postgres`). Postgres menolak
 * `alter role ... nosuperuser nobypassrls ...` dari role non-superuser walau
 * nilainya tidak berubah, jadi migrasi kedua dulu gagal. Jaminan RLS tetap
 * harus utuh: role aplikasi yang entah bagaimana punya BYPASSRLS atau
 * SUPERUSER wajib membuat migrasi gagal keras, bukan diam-diam lolos.
 *
 * Pemilik diberi BYPASSRLS: tabel memakai FORCE ROW LEVEL SECURITY, dan
 * migrasi 001/011/015 menyisipkan teks consent yang policy-nya menuntut
 * app.role admin_pusat. Ini tidak menambah kuasa nyata — pemilik tabel toh
 * bisa mematikan FORCE RLS sendiri — tapi hanya superuser yang bisa
 * memberikannya, jadi role pemilik dibuat sekali oleh superuser saat setup.
 *
 * Butuh DATABASE_URL superuser (seperti CI). Memakai database dan role
 * sendiri yang dibuang di akhir, jadi tidak menyentuh terasol_app.
 *
 *   npm run build && node --env-file=.env --test test/migrate-pemilik.test.js
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';

const run = promisify(execFile);
const CLI = fileURLToPath(new URL('../dist/cli-migrate.js', import.meta.url));

const PEMILIK = 'uji_pemilik_migrasi';
const APP = 'uji_app_migrasi';
const DB = 'uji_migrasi_pemilik';
const SANDI = 'sandi-uji-pemilik-yang-panjang';

const superUrl = process.env.DATABASE_URL;
const admin = new pg.Pool({ connectionString: superUrl, max: 1 });

const pemilikUrl = (() => {
  const u = new URL(superUrl);
  u.username = PEMILIK;
  u.password = SANDI;
  u.pathname = '/' + DB;
  return u.toString();
})();

/** Menjalankan `npm run migrate` sebagai pemilik non-superuser. */
function migrasiSebagaiPemilik() {
  return run(process.execPath, [CLI], {
    env: {
      ...process.env,
      DATABASE_URL: pemilikUrl,
      APP_DB_USER: APP,
      APP_DB_PASSWORD: 'sandi-app-uji-yang-panjang',
    },
  });
}

async function bersihkan() {
  await admin.query(`drop database if exists ${DB} with (force)`);
  for (const r of [APP, PEMILIK]) await admin.query(`drop role if exists ${r}`);
}

before(async () => {
  await bersihkan();
  await admin.query(`create role ${PEMILIK} login createrole bypassrls password '${SANDI}'`);
  await admin.query(`create database ${DB} owner ${PEMILIK}`);
});

after(async () => {
  await bersihkan();
  await admin.end();
});

describe('migrasi oleh pemilik non-superuser', () => {
  it('membuat role aplikasi pada jalan pertama', async () => {
    const { stdout } = await migrasiSebagaiPemilik();
    assert.match(stdout, new RegExp(`role aplikasi '${APP}' siap \\(create\\)`));
  });

  it('lolos pada jalan kedua (cabang alter)', async () => {
    const { stdout } = await migrasiSebagaiPemilik();
    assert.match(stdout, new RegExp(`role aplikasi '${APP}' siap \\(alter\\)`));
  });

  it('role aplikasi tetap tanpa hak yang melewati RLS', async () => {
    const { rows } = await admin.query(
      'select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb from pg_roles where rolname = $1', [APP],
    );
    assert.deepEqual(rows[0], { rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false });
  });

  it('gagal keras bila role aplikasi ternyata punya BYPASSRLS', async () => {
    await admin.query(`alter role ${APP} bypassrls`);
    try {
      await assert.rejects(migrasiSebagaiPemilik(), (err) => {
        assert.match(err.stderr, /bypassrls/i);
        return true;
      });
    } finally {
      await admin.query(`alter role ${APP} nobypassrls`);
    }
  });
});
