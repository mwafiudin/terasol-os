import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { claimsOf, ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, withTenant } from '../db.js';

export default async function deviceRoutes(app: FastifyInstance) {
  app.get('/devices', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select s.id, s.device_id as "deviceId", s.device_label as "deviceLabel",
                s.revoked_at as "revokedAt", s.wipe_requested as "wipeRequested",
                s.wiped_at as "wipedAt", s.last_seen_at as "lastSeenAt", s.created_at as "createdAt",
                u.id as "userId", u.nama as "userNama", u.role
           from device_sessions s join users u on u.id = s.user_id
          order by s.last_seen_at desc`,
      );
      return { devices: rows };
    });
  });

  /**
   * §4.5.4 — remote wipe. Sesi dicabut sekarang juga (access token ikut mati
   * karena setiap request memeriksa sesi), dan perintah hapus data lokal
   * tersampaikan saat perangkat berikutnya online.
   */
  app.post('/devices/:id/revoke', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const wipe = z.object({ wipe: z.boolean().default(true) }).safeParse(req.body ?? {});
    const shouldWipe = wipe.success ? wipe.data.wipe : true;
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rowCount } = await tx.query(
        `update device_sessions
            set revoked_at = now(), wipe_requested = $2
          where id = $1 and revoked_at is null`,
        [id, shouldWipe],
      );
      if (!rowCount) return reply.code(404).send({ error: 'not_found', message: 'Sesi tidak ada atau sudah dicabut.' });
      await audit(tx, ctx, 'device.revoke', 'device_session', id, { wipe: shouldWipe });
      return { ok: true, wipe: shouldWipe };
    });
  });

  /** Perangkat mengonfirmasi data lokal sudah dihapus. */
  app.post('/devices/wipe-ack', { preHandler: requireAuth }, async (req) => {
    const claims = claimsOf(req);
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      await tx.query('update device_sessions set wiped_at = now() where id = $1', [claims.sid]);
      await audit(tx, ctx, 'device.wipe_ack', 'device_session', claims.sid);
      return { ok: true };
    });
  });
}
