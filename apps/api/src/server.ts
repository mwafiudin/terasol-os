import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import type { AccessClaims } from './auth.js';
import { adminPool, closePools, withoutTenant } from './db.js';
import { env } from './env.js';
import { migrate } from './migrate.js';
import { hashPassword } from './password.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import eventRoutes from './routes/events.js';
import metaRoutes from './routes/meta.js';
import participantRoutes from './routes/participants.js';
import syncRoutes from './routes/sync.js';
import userRoutes from './routes/users.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: { adminPool: typeof adminPool };
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessClaims;
    user: AccessClaims;
  }
}

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.nodeEnv === 'production' ? 'info' : 'debug' },
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024, // batch sync dari perangkat yang lama offline
  });

  await app.register(cors, {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: env.accessTokenTtl },
  });
  app.decorate('db', { adminPool });

  /**
   * Beberapa endpoint (arsip event, logout, wipe-ack) tidak butuh body sama
   * sekali. Parser bawaan Fastify menolak `content-type: application/json`
   * dengan body kosong — jebakan yang mudah dikenai klien mana pun yang
   * menyetel header itu secara default. Body kosong diperlakukan sebagai {};
   * JSON yang benar-benar rusak tetap ditolak.
   */
  app.addContentTypeParser('application/json', { parseAs: 'string' },
    (_req, body: string, done) => {
      if (!body || !body.trim()) return done(null, {});
      try {
        done(null, JSON.parse(body));
      } catch {
        const err = new Error('Body bukan JSON yang valid.') as Error & { statusCode?: number };
        err.statusCode = 400;
        done(err);
      }
    });

  app.setErrorHandler((raw, req, reply) => {
    const err = raw as Error & { statusCode?: number; code?: string; constraint?: string };
    // Pelanggaran CHECK/unique/FK dari Postgres adalah kesalahan input, bukan bug server.
    if (err.code === '23514' || err.code === '23505' || err.code === '23503') {
      req.log.warn({ err }, 'pelanggaran constraint');
      return reply.code(400).send({
        error: 'constraint_violation',
        message: 'Data ditolak aturan basis data.',
        detail: err.constraint,
      });
    }
    req.log.error({ err }, 'error tidak tertangani');
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    return reply.code(status).send({
      error: 'internal_error',
      message: env.nodeEnv === 'production' ? 'Terjadi kesalahan di server.' : err.message,
    });
  });

  await app.register(metaRoutes);
  await app.register(authRoutes);
  await app.register(eventRoutes);
  await app.register(participantRoutes);
  await app.register(syncRoutes);
  await app.register(deviceRoutes);
  await app.register(userRoutes);

  return app;
}

/**
 * Membuat tenant + akun pertama saat deploy perdana. Dilewati bila sudah ada
 * user, sehingga aman dijalankan setiap boot.
 */
async function bootstrap(log: (m: string) => void) {
  const { email, password, tenant, nama } = env.bootstrap;
  if (!email || !password || !tenant) return;

  await withoutTenant(async (tx) => {
    const existing = await tx.query('select 1 from users limit 1');
    if (existing.rowCount) return;

    const t = await tx.query<{ id: string }>(
      'insert into tenants (nama) values ($1) returning id', [tenant],
    );
    await tx.query(
      `insert into users (tenant_id, email, password_hash, nama, role)
       values ($1,$2,$3,$4,'admin_pusat')`,
      [t.rows[0]!.id, email, await hashPassword(password), nama],
    );
    log(`bootstrap: tenant "${tenant}" dan akun admin ${email} dibuat`);
  });
}

async function main() {
  const app = await buildServer();
  try {
    await migrate((m) => app.log.info(m));
    await bootstrap((m) => app.log.info(m));
  } catch (err) {
    app.log.error({ err }, 'migrasi gagal — server tidak dijalankan');
    await closePools();
    process.exit(1);
  }

  await app.listen({ port: env.port, host: '0.0.0.0' });

  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, async () => {
      app.log.info(`${sig} diterima — menutup server`);
      await app.close();
      await closePools();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
