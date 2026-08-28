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
                k.kode, k.sumber,
                (select count(*) from transaksi x
                  where x.katalog_id = k.id and x.deleted_at is null)::int as terpakai,
                -- Isi paket ikut di daftar, bukan lewat panggilan terpisah per
                -- baris: paket tanpa isinya adalah nama tanpa arti, dan layar
                -- yang menampilkannya selalu butuh keduanya sekaligus.
                coalesce((
                  select json_agg(json_build_object(
                    'katalogId', pi.katalog_id, 'nama', a.nama,
                    'jenis', a.jenis, 'harga', a.harga, 'jumlah', pi.jumlah
                  ) order by a.jenis, a.nama)
                    from paket_isi pi join katalog a on a.id = pi.katalog_id
                   where pi.paket_id = k.id
                ), '[]'::json) as isi
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

/**
   * Mengimpor daftar produk KK ke katalog cabang.
   *
   * Daftarnya dikirim perangkat, bukan disimpan di server. Ia hidup sebagai
   * data di aplikasi web (`lib/produk.ts`) lengkap dengan kandungan, aturan
   * pakai, dan peringatan — dan menyalin seribu baris itu ke sini hanya untuk
   * mengambil nama dan harganya akan melahirkan salinan kedua yang harus
   * dijaga tetap sama, yaitu persis masalah yang sedang dibereskan.
   *
   * Idempoten pada `(tenant_id, kode)`: impor kesepuluh menghasilkan katalog
   * yang sama dengan impor pertama. Harga dan nama DIPERBARUI, karena daftar
   * resminya memang berubah dari waktu ke waktu — tetapi `aktif` tidak
   * disentuh: barang yang sengaja dinonaktifkan cabang tidak boleh hidup lagi
   * hanya karena seseorang menekan Impor.
   */
  app.post('/katalog/impor', { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const parsed = z.object({
        items: z.array(z.object({
          kode: z.string().min(1).max(80),
          nama: z.string().min(1).max(200),
          jenis: z.enum(JENIS).default('produk'),
          harga: z.number().int().min(0).default(0),
        })).min(1).max(500),
      }).safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
      }
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        let baru = 0;
        let diperbarui = 0;
        for (const it of parsed.data.items) {
          const { rows } = await tx.query<{ baru: boolean }>(
            `insert into katalog (tenant_id, kode, sumber, jenis, nama, harga)
             values ($1,$2,'kk',$3::jenis_transaksi,$4,$5)
             on conflict (tenant_id, kode) where kode is not null
             do update set nama = excluded.nama, harga = excluded.harga,
                           jenis = excluded.jenis, updated_at = now()
             returning (xmax = 0) as baru`,
            [ctx.tenantId, it.kode, it.jenis, it.nama.trim(), it.harga],
          );
          if (rows[0]?.baru) baru++; else diperbarui++;
        }
        await audit(tx, ctx, 'katalog.impor', 'tenant', ctx.tenantId, { baru, diperbarui });
        return { baru, diperbarui };
      });
    });

  /**
   * Menetapkan isi sebuah paket. Menggantikan seluruhnya, bukan menambah:
   * layar penyuntingnya menampilkan daftar utuh, dan menyimpan yang terlihat
   * di layar adalah satu-satunya perilaku yang tidak mengejutkan.
   */
  app.put('/katalog/:id/isi', { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = z.object({
        isi: z.array(z.object({
          katalogId: z.string().uuid(),
          jumlah: z.number().int().min(1).max(999).default(1),
        })).max(50),
      }).safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
      }
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        const paket = await tx.query<{ jenis: string }>(
          'select jenis from katalog where id = $1', [id],
        );
        if (!paket.rowCount) return reply.code(404).send({ error: 'not_found' });
        if (paket.rows[0]!.jenis !== 'paket') {
          return reply.code(400).send({
            error: 'bad_request',
            message: 'Hanya baris berjenis paket yang bisa memuat isi.',
          });
        }
        // Paket di dalam paket ditolak. CHECK di basis data hanya menahan
        // paket yang memuat dirinya sendiri; lingkaran yang lebih panjang
        // tidak bisa ditelusuri dari sana, dan cara termurah menutupnya
        // adalah tidak mengizinkan paket menjadi isi sama sekali.
        for (const x of parsed.data.isi) {
          const a = await tx.query<{ jenis: string }>(
            'select jenis from katalog where id = $1', [x.katalogId],
          );
          if (!a.rowCount) return reply.code(400).send({ error: 'bad_request', message: 'Isi paket tidak ditemukan.' });
          if (a.rows[0]!.jenis === 'paket') {
            return reply.code(400).send({
              error: 'bad_request',
              message: 'Paket tidak bisa memuat paket lain.',
            });
          }
        }

        await tx.query('delete from paket_isi where paket_id = $1', [id]);
        for (const x of parsed.data.isi) {
          await tx.query(
            'insert into paket_isi (paket_id, katalog_id, jumlah) values ($1,$2,$3)',
            [id, x.katalogId, x.jumlah],
          );
        }
        await audit(tx, ctx, 'katalog.isi_paket', 'katalog', id, { jumlahIsi: parsed.data.isi.length });
        return { ok: true, jumlahIsi: parsed.data.isi.length };
      });
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
