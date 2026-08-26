import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth, requireRole } from '../auth.js';
import { adminPool, audit, withTenant } from '../db.js';
import { CONSUMABLE_PARAMS, PARAM_RANGE } from '../domain.js';

export default async function metaRoutes(app: FastifyInstance) {
  /**
   * Health check sekaligus penanda revisi. Sejak deploy berjalan otomatis dari
   * GitHub, pertanyaan "commit mana yang sekarang live?" harus bisa dijawab
   * tanpa menebak dari waktu deploy — Railway menyuntikkan RAILWAY_GIT_* saat
   * service tersambung ke repo.
   */
  app.get('/health', async (_req, reply) => {
    const revisi = {
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.RAILWAY_GIT_BRANCH ?? null,
      lingkungan: process.env.RAILWAY_ENVIRONMENT_NAME ?? 'lokal',
    };
    try {
      await adminPool.query('select 1');
      return { ok: true, db: 'up', revisi };
    } catch (err) {
      return reply.code(503).send({ ok: false, db: 'down', revisi, message: (err as Error).message });
    }
  });

  /** Teks consent yang berlaku. Versinya direkam di setiap record consent (§4.5.6). */
  app.get('/consent-text', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        'select versi, isi from consent_texts where active order by created_at desc limit 1',
      );
      return rows[0] ?? null;
    });
  });

  /** Aturan domain agar aplikasi web tidak menyimpan salinan yang bisa menyimpang. */
  app.get('/config', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ consumable_prices: Record<string, number> }>(
        'select consumable_prices from tenants where id = $1', [ctx.tenantId],
      );
      return {
        paramRange: PARAM_RANGE,
        consumableParams: CONSUMABLE_PARAMS,
        consumablePrice: rows[0]?.consumable_prices ?? {},
      };
    });
  });

  /**
   * Harga consumable per cabang. Dipakai rekap untuk menghitung estimasi biaya
   * (US-06); tanpa ini rekap jujur bilang "harga belum diatur" alih-alih
   * menampilkan Rp 0 yang menyesatkan.
   */
  app.patch('/tenant/consumable-prices',
    { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const shape = z.object(
        Object.fromEntries(
          CONSUMABLE_PARAMS.map((k) => [k, z.number().int().min(0).max(10_000_000).nullable().optional()]),
        ),
      ).strict();
      const parsed = shape.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
      }
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        // null menghapus kunci — kembali ke keadaan "belum diatur".
        const bersih = Object.fromEntries(
          Object.entries(parsed.data).filter(([, v]) => typeof v === 'number'),
        );
        const { rows } = await tx.query<{ consumable_prices: Record<string, number> }>(
          `update tenants set consumable_prices = $2::jsonb, updated_at = now()
            where id = $1 returning consumable_prices`,
          [ctx.tenantId, JSON.stringify(bersih)],
        );
        if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
        await audit(tx, ctx, 'tenant.consumable_prices', 'tenant', ctx.tenantId, bersih);
        return { consumablePrice: rows[0].consumable_prices };
      });
    });

  app.get('/audit', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req) => {
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 100), 500);
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select a.id, a.action, a.entity, a.entity_id as "entityId", a.meta,
                a.created_at as "createdAt", a.actor_role as "actorRole", u.nama as "actorNama"
           from audit_log a left join users u on u.id = a.actor_user_id
          order by a.created_at desc limit $1`,
        [limit],
      );
      return { entries: rows };
    });
  });
}
