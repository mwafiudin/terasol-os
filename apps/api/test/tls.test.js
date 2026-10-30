/**
 * Aturan TLS ke Postgres (src/tls.ts), dua arah: salah ke satu arah, koneksi
 * di VPS gagal karena TLS dipaksa ke server yang tidak menyediakannya; salah ke
 * arah lain, kata sandi basis data dikirim ke server yang tidak diverifikasi.
 *
 *   npm run build && node --test test/tls.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { opsiPool } from '../dist/tls.js';

const proxy = 'postgresql://u:p@shinkansen.proxy.rlwy.net:41234/railway';
const neon = 'postgres://u:p@ep-x.ap-southeast-1.aws.neon.tech/db?sslmode=require';
const NYALA = { DATABASE_TLS_TANPA_VERIFIKASI: '1' };

describe('TLS ke Postgres', () => {
  it('host privat tanpa TLS, walau env tanpa-verifikasi dipasang', () => {
    for (const url of [
      'postgresql://u:p@postgres.railway.internal:5432/railway',
      'postgres://u:p@localhost:55432/railway',
      'postgres://u:p@127.0.0.1:5432/x',
      'postgres://u:p@[::1]:5432/x',
      'postgres://u:p@postgres:5432/terasol',
    ]) {
      assert.deepEqual(opsiPool(url, NYALA), { connectionString: url, ssl: false }, url);
    }
  });

  it('sslmode=disable dihormati di host publik', () => {
    assert.equal(opsiPool('postgres://u:p@db.contoh.com:5432/x?sslmode=disable', {}).ssl, false);
  });

  it('host publik diverifikasi secara bawaan', () => {
    for (const url of [
      neon,
      proxy,
      'postgres://u:p@localhost.contoh.com:5432/x',
      'postgres://u:p@x.railway.internal.contoh.com:5432/x',
      'postgres://u:p@10.0.0.5:5432/x',
    ]) {
      assert.deepEqual(opsiPool(url, {}).ssl, { rejectUnauthorized: true }, url);
    }
  });

  it('sslmode di URL dibuang supaya tidak menimpa opsi ssl di pg', () => {
    const { connectionString } = opsiPool(neon, {});
    assert.ok(!connectionString.includes('sslmode'), connectionString);
    assert.ok(connectionString.includes('neon.tech/db'));
  });

  it('DATABASE_TLS_TANPA_VERIFIKASI=1 mematikan verifikasi dan memperingatkan tanpa URL', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    assert.deepEqual(opsiPool(proxy, NYALA).ssl, { rejectUnauthorized: false });
    assert.equal(warn.mock.callCount(), 1);
    assert.doesNotMatch(String(warn.mock.calls[0].arguments), /rlwy|u:p/);
  });

  it('nilai env selain 1 tidak mematikan verifikasi', () => {
    for (const v of ['true', '0', '']) {
      assert.deepEqual(opsiPool(proxy, { DATABASE_TLS_TANPA_VERIFIKASI: v }).ssl, { rejectUnauthorized: true }, v);
    }
  });

  it('DATABASE_CA_CERT dipakai sebagai CA', () => {
    const ca = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
    assert.deepEqual(opsiPool(neon, { DATABASE_CA_CERT: ca }).ssl, { rejectUnauthorized: true, ca });
  });
});
