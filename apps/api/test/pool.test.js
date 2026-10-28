/**
 * Koneksi idle di pool yang diputus Postgres (restart, failover, admin)
 * memicu event 'error' pada Pool. Tanpa listener, Node menganggapnya galat
 * tak tertangani dan seluruh proses API mati — ketahuan saat container
 * Postgres dihentikan sementara API masih jalan.
 *
 *   npm run build && node --env-file=.env --test test/pool.test.js
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

const { adminPool, appPool, closePools } = await import('../dist/db.js');

after(() => closePools());

describe('pool basis data', () => {
  it('proses tetap hidup saat koneksi idle diputus server', async () => {
    await appPool.query('select 1');
    assert.equal(appPool.idleCount, 1, 'butuh satu koneksi idle untuk diputus');

    const { rows } = await adminPool.query(
      `select count(pg_terminate_backend(pid))::int as n
         from pg_stat_activity where usename = $1 and pid <> pg_backend_pid()`,
      [process.env.APP_DB_USER ?? 'terasol_app'],
    );
    assert.ok(rows[0].n >= 1, 'tidak ada koneksi role aplikasi yang diputus');

    // Beri waktu pesan FATAL dari server sampai ke klien.
    await new Promise((r) => setTimeout(r, 300));

    // Pool membuang klien yang rusak dan membuka koneksi baru.
    const { rows: lagi } = await appPool.query('select 1 as ok');
    assert.equal(lagi[0].ok, 1);
  });
});
