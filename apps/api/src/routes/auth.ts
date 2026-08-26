import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashToken, newRefreshToken, refreshExpiry, requireAuth, claimsOf, type Role } from '../auth.js';
import { withoutTenant } from '../db.js';
import { verifyPassword } from '../password.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().uuid(),
  deviceLabel: z.string().max(120).optional(),
});

const refreshBody = z.object({
  refreshToken: z.string().min(10),
});

type UserRow = {
  id: string; tenant_id: string; email: string; password_hash: string;
  nama: string; role: Role; active: boolean; tenant_nama: string;
};

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    }
    const { email, password, deviceId, deviceLabel } = parsed.data;

    return withoutTenant(async (tx) => {
      const { rows } = await tx.query<UserRow>(
        `select u.*, t.nama as tenant_nama
           from users u join tenants t on t.id = u.tenant_id
          where lower(u.email) = lower($1)`,
        [email],
      );
      const user = rows[0];
      // Pesan sama untuk email tidak ada / password salah, agar tidak bocor
      // email mana yang terdaftar.
      const invalid = { error: 'invalid_credentials', message: 'Email atau kata sandi salah.' };
      if (!user) {
        await verifyPassword(password, 'scrypt$32768$8$1$AAAA$AAAA'); // samakan waktu respons
        return reply.code(401).send(invalid);
      }
      if (!(await verifyPassword(password, user.password_hash))) return reply.code(401).send(invalid);
      if (!user.active) {
        return reply.code(403).send({ error: 'user_disabled', message: 'Akun dinonaktifkan.' });
      }

      const { token, hash } = newRefreshToken();
      const { rows: sess } = await tx.query<{ id: string }>(
        `insert into device_sessions (tenant_id, user_id, device_id, device_label, refresh_token_hash)
         values ($1,$2,$3,$4,$5)
         on conflict (user_id, device_id) do update
            set refresh_token_hash = excluded.refresh_token_hash,
                device_label = coalesce(excluded.device_label, device_sessions.device_label),
                revoked_at = null, wipe_requested = false, wiped_at = null,
                last_seen_at = now()
         returning id`,
        [user.tenant_id, user.id, deviceId, deviceLabel ?? null, hash],
      );
      const sessionId = sess[0]!.id;

      await tx.query(
        `insert into audit_log (tenant_id, actor_user_id, actor_role, action, entity, entity_id, meta)
         values ($1,$2,$3,'auth.login','device_session',$4,$5)`,
        [user.tenant_id, user.id, user.role, sessionId, JSON.stringify({ deviceId })],
      );

      return {
        accessToken: app.jwt.sign(
          { sub: user.id, tid: user.tenant_id, role: user.role, sid: sessionId, did: deviceId },
        ),
        refreshToken: token,
        refreshExpiresAt: refreshExpiry().toISOString(),
        user: {
          id: user.id, nama: user.nama, email: user.email, role: user.role,
          tenantId: user.tenant_id, tenantNama: user.tenant_nama,
        },
      };
    });
  });

  app.post('/auth/refresh', async (req, reply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    return withoutTenant(async (tx) => {
      const { rows } = await tx.query<{
        id: string; user_id: string; tenant_id: string; device_id: string;
        revoked_at: Date | null; wipe_requested: boolean; role: Role; active: boolean;
        nama: string; email: string; tenant_nama: string;
      }>(
        `select s.id, s.user_id, s.tenant_id, s.device_id, s.revoked_at, s.wipe_requested,
                u.role, u.active, u.nama, u.email, t.nama as tenant_nama
           from device_sessions s
           join users u on u.id = s.user_id
           join tenants t on t.id = s.tenant_id
          where s.refresh_token_hash = $1`,
        [hashToken(parsed.data.refreshToken)],
      );
      const s = rows[0];
      if (!s) return reply.code(401).send({ error: 'invalid_refresh', message: 'Sesi tidak dikenal.' });
      if (s.wipe_requested) {
        await tx.query('update device_sessions set wiped_at = now() where id = $1', [s.id]);
        return reply.code(409).send({
          error: 'wipe_required', wipe: true,
          message: 'Perangkat ini diminta menghapus data lokal.',
        });
      }
      if (s.revoked_at || !s.active) {
        return reply.code(401).send({ error: 'session_revoked', wipe: true, message: 'Sesi sudah dicabut.' });
      }

      // Rotasi: refresh token lama langsung tidak berlaku.
      const { token, hash } = newRefreshToken();
      await tx.query(
        'update device_sessions set refresh_token_hash = $1, last_seen_at = now() where id = $2',
        [hash, s.id],
      );

      return {
        accessToken: app.jwt.sign(
          { sub: s.user_id, tid: s.tenant_id, role: s.role, sid: s.id, did: s.device_id },
        ),
        refreshToken: token,
        refreshExpiresAt: refreshExpiry().toISOString(),
        user: {
          id: s.user_id, nama: s.nama, email: s.email, role: s.role,
          tenantId: s.tenant_id, tenantNama: s.tenant_nama,
        },
      };
    });
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req) => {
    const c = claimsOf(req);
    await withoutTenant(async (tx) => {
      await tx.query('update device_sessions set revoked_at = now() where id = $1', [c.sid]);
    });
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (req) => {
    const c = claimsOf(req);
    return withoutTenant(async (tx) => {
      const { rows } = await tx.query(
        `select u.id, u.nama, u.email, u.role, u.tenant_id as "tenantId", t.nama as "tenantNama"
           from users u join tenants t on t.id = u.tenant_id where u.id = $1`,
        [c.sub],
      );
      return { user: rows[0], deviceId: c.did, sessionId: c.sid };
    });
  });
}
