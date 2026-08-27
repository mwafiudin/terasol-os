import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, withTenant } from '../db.js';

const JENIS = ['produk', 'terapi', 'paket'] as const;

const katalogBody = z.object({
  jenis: z.enum(JENIS).default('produk'),
  nama: z.string().min(1).max(200),
  harga: z.number().int().min(0).default(0),
  catatan: z.string().max(500).nullish(),
  /**
   * Cabang tujuan. Hanya dihormati untuk Admin Pusat — Koordinator selalu
   * menulis ke cabangnya sendiri, apa pun yang dikirim klien.
   */
  tenantId: z.string().uuid().optional(),
});

export default async function masterRoutes(app: FastifyInstance) {
  /* ============================ katalog ============================ */

  /**
   * Katalog produk dan layanan.
   *
   * Petugas ikut membacanya — form belanja memilih dari sini. Yang dibatasi
   * peran adalah menulisnya, bukan melihatnya.
   */
  app.get('/katalog', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { semua?: string; aktif?: string };
    const ctx = ctxOf(req);
    // Admin Pusat boleh melihat lintas cabang, tapi hanya bila memintanya:
    // secara default ia tetap bekerja di cabangnya sendiri, supaya layar
    // sehari-hari tidak diam-diam mencampur data cabang lain.
    const lintas = ctx.role === 'admin_pusat' && q.semua === 'true';

    return withTenant(ctx, async (tx) => {
      const syarat: string[] = [];
      const args: unknown[] = [];
      if (!lintas) { args.push(ctx.tenantId); syarat.push(`k.tenant_id = $${args.length}`); }
      if (q.aktif === 'true') syarat.push('k.aktif');
      const where = syarat.length ? `where ${syarat.join(' and ')}` : '';

      const { rows } = await tx.query(
        `select k.id, k.tenant_id as "tenantId", t.nama as "tenantNama",
                k.jenis, k.nama, k.harga, k.catatan, k.aktif,
                (select count(*) from transaksi x
                  where x.katalog_id = k.id and x.deleted_at is null)::int as terpakai
           from katalog k
           join tenants t on t.id = k.tenant_id
           ${where}
          order by t.nama, k.jenis, k.nama`,
        args,
      );
      if (lintas) {
        await audit(tx, ctx, 'katalog.read_semua', 'katalog', null, { jumlah: rows.length });
      }
      return { katalog: rows, lintasCabang: lintas };
    });
  });

  app.post('/katalog', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const parsed = katalogBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const k = parsed.data;
    const ctx = ctxOf(req);
    const tujuan = ctx.role === 'admin_pusat' ? (k.tenantId ?? ctx.tenantId) : ctx.tenantId;

    try {
      const hasil = await withTenant(ctx, async (tx) => {
        const { rows } = await tx.query(
          `insert into katalog (tenant_id, jenis, nama, harga, catatan)
           values ($1,$2::jenis_transaksi,$3,$4,$5)
           returning id, tenant_id as "tenantId", jenis, nama, harga, catatan, aktif`,
          [tujuan, k.jenis, k.nama.trim(), k.harga, k.catatan ?? null],
        );
        await audit(tx, ctx, 'katalog.create', 'katalog', rows[0]!.id, { nama: k.nama, tenantId: tujuan });
        return rows[0];
      });
      return reply.code(201).send(hasil);
    } catch (err) {
      // Nama kembar ditolak basis data. Pesannya dijelaskan di sini karena
      // "duplicate key" bukan kalimat yang berguna bagi Koordinator.
      if ((err as { code?: string }).code === '23505') {
        return reply.code(409).send({
          error: 'sudah_ada',
          message: `"${k.nama.trim()}" sudah ada di katalog untuk jenis ini.`,
        });
      }
      throw err;
    }
  });

  app.patch('/katalog/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      jenis: z.enum(JENIS).optional(),
      nama: z.string().min(1).max(200).optional(),
      harga: z.number().int().min(0).optional(),
      catatan: z.string().max(500).nullish(),
      aktif: z.boolean().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const d = parsed.data;
    const ctx = ctxOf(req);

    try {
      const hasil = await withTenant(ctx, async (tx) => {
        const { rows } = await tx.query(
          `update katalog
              set jenis = coalesce($2::jenis_transaksi, jenis),
                  nama = coalesce($3::text, nama),
                  harga = coalesce($4::bigint, harga),
                  catatan = case when $5::boolean then $6::text else catatan end,
                  aktif = coalesce($7::boolean, aktif)
            where id = $1
            returning id, tenant_id as "tenantId", jenis, nama, harga, catatan, aktif`,
          [id, d.jenis ?? null, d.nama?.trim() ?? null, d.harga ?? null,
           Object.hasOwn(d, 'catatan'), d.catatan ?? null, d.aktif ?? null],
        );
        if (!rows[0]) return null;
        await audit(tx, ctx, 'katalog.update', 'katalog', id, d);
        return rows[0];
      });
      if (!hasil) return reply.code(404).send({ error: 'not_found' });
      return hasil;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return reply.code(409).send({
          error: 'sudah_ada',
          message: `"${d.nama?.trim()}" sudah ada di katalog untuk jenis ini.`,
        });
      }
      throw err;
    }
  });

  /**
   * Menghapus entri katalog hanya bila belum pernah dipakai.
   *
   * Yang sudah menempel pada transaksi dinonaktifkan saja: menghapusnya akan
   * memutus riwayat belanja dari nama barangnya, dan riwayat yang kehilangan
   * nama barang berhenti menjadi riwayat.
   */
  app.delete('/katalog/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const dipakai = await tx.query<{ n: number }>(
        'select count(*)::int as n from transaksi where katalog_id = $1', [id],
      );
      if ((dipakai.rows[0]?.n ?? 0) > 0) {
        return reply.code(409).send({
          error: 'sedang_dipakai',
          message: `Sudah dipakai di ${dipakai.rows[0]!.n} transaksi. Nonaktifkan saja agar riwayatnya tetap utuh.`,
        });
      }
      const { rows } = await tx.query<{ nama: string }>(
        'delete from katalog where id = $1 returning nama', [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'katalog.delete', 'katalog', id, rows[0]);
      return { ok: true };
    });
  });

  /* ============================= cabang ============================= */

  app.get('/cabang', { preHandler: requireRole('admin_pusat') }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select t.id, t.nama, t.status, t.created_at as "createdAt",
                (select count(*) from users u where u.tenant_id = t.id and u.active)::int as pengguna,
                (select count(*) from events e where e.tenant_id = t.id and e.status <> 'archived')::int as event,
                (select count(*) from pelanggan p
                  where p.tenant_id = t.id and p.erased_at is null)::int as pelanggan
           from tenants t order by t.nama`,
      );
      return { cabang: rows };
    });
  });

  app.post('/cabang', { preHandler: requireRole('admin_pusat') }, async (req, reply) => {
    const parsed = z.object({ nama: z.string().min(1).max(160) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const ctx = ctxOf(req);

    const hasil = await withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        'insert into tenants (nama) values ($1) returning id, nama, status',
        [parsed.data.nama.trim()],
      );
      await audit(tx, ctx, 'cabang.create', 'tenant', rows[0]!.id, { nama: parsed.data.nama });
      return rows[0];
    });
    return reply.code(201).send(hasil);
  });

  app.patch('/cabang/:id', { preHandler: requireRole('admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      nama: z.string().min(1).max(160).optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const d = parsed.data;
    const ctx = ctxOf(req);

    // Cabang sendiri tidak boleh dinonaktifkan dari dalam: itu mengunci
    // Admin Pusat keluar dari cabang tempat akunnya berada.
    if (d.status === 'inactive' && id === ctx.tenantId) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Tidak bisa menonaktifkan cabang tempat akun Anda berada.',
      });
    }

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update tenants set nama = coalesce($2::text, nama),
                            status = coalesce($3::text, status),
                            updated_at = now()
          where id = $1 returning id, nama, status`,
        [id, d.nama?.trim() ?? null, d.status ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'cabang.update', 'tenant', id, d);
      return rows[0];
    });
  });
}
