/**
 * Uji /health saat basis data tidak terjangkau. Endpoint ini publik (dipakai
 * Docker HEALTHCHECK, Railway, dan uptime monitor), jadi pesan galat Postgres
 * tidak boleh ikut ke balasan: isinya bisa memuat nama host, port, atau nama
 * role. Detailnya cukup di log server.
 *
 * Tidak butuh Postgres sungguhan — justru sengaja diarahkan ke host yang tidak
 * ada, dengan nama yang gampang dicari di balasan.
 *
 *   npm run build && node --test test/health.test.js
 */
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { after, before, describe, it } from 'node:test';
import Fastify from 'fastify';

const HOST_RAHASIA = 'db-rahasia-uji.invalid';
const ROLE_RAHASIA = 'role_rahasia_uji';

// env.js dibaca saat modul dimuat, jadi semua nilai dipasang sebelum import.
Object.assign(process.env, {
  DATABASE_URL: `postgresql://${ROLE_RAHASIA}:sandi@${HOST_RAHASIA}:5432/terasol`,
  APP_DB_PASSWORD: 'tidak-dipakai-di-uji-ini',
  JWT_SECRET: 'tidak-dipakai-di-uji-ini',
  GIT_COMMIT_SHA: 'abcdef0123456789',
  GIT_BRANCH: 'main',
  APP_ENV: 'vps-uji',
});
for (const k of ['RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_GIT_BRANCH', 'RAILWAY_ENVIRONMENT_NAME']) {
  delete process.env[k];
}

const { default: metaRoutes } = await import('../dist/routes/meta.js');
const { closePools } = await import('../dist/db.js');

let app;
let log = '';

before(async () => {
  const stream = new Writable({
    write(chunk, _enc, cb) { log += chunk.toString(); cb(); },
  });
  app = Fastify({ logger: { level: 'info', stream } });
  await app.register(metaRoutes);
  await app.ready();
});

after(async () => {
  await app.close();
  await closePools();
});

describe('/health saat basis data mati', () => {
  let res;
  before(async () => {
    res = await app.inject({ method: 'GET', url: '/health' });
  });

  it('membalas 503 dengan bentuk yang tetap', () => {
    assert.equal(res.statusCode, 503);
    const body = res.json();
    assert.deepEqual(Object.keys(body).sort(), ['db', 'ok', 'revisi']);
    assert.equal(body.ok, false);
    assert.equal(body.db, 'down');
  });

  it('tidak membocorkan host, role, atau kode galat', () => {
    for (const jejak of [HOST_RAHASIA, ROLE_RAHASIA, 'ENOTFOUND', 'getaddrinfo', 'message']) {
      assert.ok(!res.body.includes(jejak), `'${jejak}' bocor ke balasan: ${res.body}`);
    }
  });

  it('detail galatnya tetap tercatat di log server', () => {
    assert.ok(log.includes(HOST_RAHASIA), 'log server tidak memuat detail galat basis data');
  });

  it('revisi dibaca dari env generik bila RAILWAY_GIT_* tidak ada', () => {
    assert.deepEqual(res.json().revisi, { commit: 'abcdef0', branch: 'main', lingkungan: 'vps-uji' });
  });
});
