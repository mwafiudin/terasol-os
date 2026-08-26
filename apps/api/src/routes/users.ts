import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { claimsOf, ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, withTenant, withoutTenant } from '../db.js';
import { hashPassword, verifyPassword } from '../password.js';

const createBody = z.object({
  nama: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8, 'kata sandi minimal 8 karakter'),
  role: z.enum(['petugas', 'koordinator']),
});

export default async function userRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select id, nama, email, role, active, created_at as "createdAt"
           from users order by role, nama`,
      );
      return { users: rows };
    });
  });

  /** Koordinator membuat akun petugas untuk cabangnya sendiri. */
  app.post('/users', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const u = parsed.data;
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `insert into users (tenant_id, email, password_hash, nama, role)
         values ($1,$2,$3,$4,$5::user_role)
         returning id, nama, email, role, active`,
        [ctx.tenantId, u.email, await hashPassword(u.password), u.nama, u.role],
      );
      await audit(tx, ctx, 'user.create', 'user', rows[0]!.id, { role: u.role });
      return reply.code(201).send(rows[0]);
    });
  });

  app.patch('/users/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      active: z.boolean().optional(),
      role: z.enum(['petugas', 'koordinator']).optional(),
      nama: z.string().min(1).max(120).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const ctx = ctxOf(req);
    if (id === ctx.userId && parsed.data.active === false) {
      return reply.code(400).send({ error: 'bad_request', message: 'Tidak bisa menonaktifkan akun sendiri.' });
    }

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update users
            set active = coalesce($2, active),
                role = coalesce($3::user_role, role),
                nama = coalesce($4, nama),
                updated_at = now()
          where id = $1
          returning id, nama, email, role, active`,
        [id, parsed.data.active ?? null, parsed.data.role ?? null, parsed.data.nama ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      // Akun yang dinonaktifkan tidak boleh tetap hidup lewat sesi lama.
      if (parsed.data.active === false) {
        await tx.query(
          `update device_sessions set revoked_at = now(), wipe_requested = true
            where user_id = $1 and revoked_at is null`,
          [id],
        );
      }
      await audit(tx, ctx, 'user.update', 'user', id, parsed.data);
      return rows[0];
    });
  });

  /**
   * Ganti kata sandi sendiri. Sesi perangkat lain dicabut — kata sandi diganti
   * biasanya justru karena ada perangkat yang tidak lagi dipercaya.
   */
  app.post('/auth/change-password', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'kata sandi baru minimal 8 karakter'),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });

    const claims = claimsOf(req);
    return withoutTenant(async (tx) => {
      const { rows } = await tx.query<{ password_hash: string }>(
        'select password_hash from users where id = $1', [claims.sub],
      );
      if (!rows[0] || !(await verifyPassword(parsed.data.currentPassword, rows[0].password_hash))) {
        return reply.code(401).send({ error: 'invalid_credentials', message: 'Kata sandi lama salah.' });
      }
      await tx.query(
        'update users set password_hash = $2, updated_at = now() where id = $1',
        [claims.sub, await hashPassword(parsed.data.newPassword)],
      );
      const { rowCount } = await tx.query(
        `update device_sessions set revoked_at = now()
          where user_id = $1 and id <> $2 and revoked_at is null`,
        [claims.sub, claims.sid],
      );
      await tx.query(
        `insert into audit_log (tenant_id, actor_user_id, actor_role, action, entity, entity_id, meta)
         values ($1,$2,$3,'auth.change_password','user',$2,$4)`,
        [claims.tid, claims.sub, claims.role, JSON.stringify({ sesiDicabut: rowCount })],
      );
      return { ok: true, sesiLainDicabut: rowCount };
    });
  });
}
