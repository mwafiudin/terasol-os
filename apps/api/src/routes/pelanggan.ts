import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, auditAdminRead, withTenant } from '../db.js';

const JENIS = [
  'tinggi', 'berat', 'lingkar_perut', 'sistolik', 'diastolik', 'nadi',
  'gula', 'kolesterol', 'asam_urat',
] as const;
const KONTEKS = ['puasa', 'sewaktu', '2jam_pp'] as const;

const pengukuranBody = z.object({
  clientId: z.string().uuid().optional(),
  pelangganId: z.string().uuid(),
  participantId: z.string().uuid().nullish(),
  jenis: z.enum(JENIS),
  konteks: z.enum(KONTEKS).nullish(),
  nilai: z.number().min(0).max(1000),
  diukurPada: z.string().datetime().optional(),
  diukurOleh: z.string().uuid().nullish(),
  outOfRange: z.boolean().default(false),
  catatan: z.string().max(500).nullish(),
}).refine((v) => v.konteks == null || v.jenis === 'gula', {
  message: 'konteks hanya berlaku untuk gula darah',
  path: ['konteks'],
});

const transaksiBody = z.object({
  clientId: z.string().uuid().optional(),
  pelangganId: z.string().uuid(),
  participantId: z.string().uuid().nullish(),
  /**
   * Asal katalog, bila dipilih dari daftar. Boleh kosong: barang di luar
   * katalog tetap harus bisa dicatat — menolak mencatat penjualan yang sudah
   * terjadi adalah kehilangan data, bukan penegakan disiplin.
   */
  katalogId: z.string().uuid().nullish(),
  jenis: z.enum(['produk', 'terapi', 'paket']).default('produk'),
  nama: z.string().min(1).max(200),
  jumlah: z.number().int().min(1).default(1),
  hargaSatuan: z.number().int().min(0),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  catatan: z.string().max(500).nullish(),
});

export default async function pelangganRoutes(app: FastifyInstance) {
  /* ============================== pelanggan ============================== */

  app.get('/pelanggan', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { cari?: string; limit?: string };
    const ctx = ctxOf(req);
    const limit = Math.min(Number(q.limit ?? 50), 200);

    return withTenant(ctx, async (tx) => {
      const args: unknown[] = [];
      let filter = 'p.erased_at is null';
      if (q.cari?.trim()) {
        args.push(`%${q.cari.trim().toLowerCase()}%`);
        filter += ` and (lower(p.nama) like $${args.length} or p.hp like $${args.length})`;
      }
      args.push(limit);

      const { rows } = await tx.query<{ tenantId: string }>(
        `select p.id, p.tenant_id as "tenantId", p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir",
                p.hp, p.created_at as "createdAt",
                (select count(*) from participants k where k.pelanggan_id = p.id
                   and k.deleted_at is null)::int as kunjungan,
                (select coalesce(sum(t.total),0) from transaksi t where t.pelanggan_id = p.id and t.deleted_at is null)::bigint as "totalBelanja",
                (select max(pg.diukur_pada) from pengukuran pg where pg.pelanggan_id = p.id and pg.deleted_at is null) as "terakhirDiukur"
           from pelanggan p
          where ${filter}
          order by p.nama
          limit $${args.length}`,
        args,
      );
      await auditAdminRead(tx, ctx, 'pelanggan.read', {
        jumlah: rows.length, tenantIds: rows.map((r) => r.tenantId), cari: q.cari ?? null,
      });
      return { pelanggan: rows };
    });
  });

  app.get('/pelanggan/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ tenantId: string }>(
        `select p.id, p.tenant_id as "tenantId", p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir", p.hp, p.catatan,
                p.created_at as "createdAt", p.erased_at as "erasedAt"
           from pelanggan p where p.id = $1`,
        [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });

      // Riwayat kunjungan: tiap kali orang ini dilayani, di event mana.
      const kunjungan = await tx.query(
        `select k.id, k.needs_review as "needsReview", k.created_at as "createdAt",
                e.id as "eventId", e.nama as "eventNama",
                to_char(e.tanggal,'YYYY-MM-DD') as "eventTanggal", e.status as "eventStatus",
                (select json_build_object('granted', c.granted, 'versiTeks', c.versi_teks, 'ts', c.ts)
                   from consents c where c.participant_id = k.id order by c.ts desc limit 1) as consent,
                coalesce(cv.berminat,false) as berminat,
                coalesce(cv.status,'baru') as "convStatus"
           from participants k
           join events e on e.id = k.event_id
           left join conversions cv on cv.participant_id = k.id
          where k.pelanggan_id = $1 and k.deleted_at is null
          order by e.tanggal desc, k.created_at desc`,
        [id],
      );

      await auditAdminRead(tx, ctx, 'pelanggan.read_detail', {
        jumlah: 1, tenantIds: [rows[0].tenantId], pelangganId: id,
      });
      return { ...rows[0], kunjungan: kunjungan.rows };
    });
  });

  app.patch('/pelanggan/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      nama: z.string().min(1).max(160).optional(),
      gender: z.enum(['P', 'L']).optional(),
      usia: z.number().int().min(0).max(130).nullish(),
      tanggalLahir: z.string().date()
        .refine((s) => s <= new Date().toISOString().slice(0, 10), 'Tanggal lahir di masa depan')
        .nullish(),
      hp: z.string().min(3).max(32).optional(),
      catatan: z.string().max(1000).nullish(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const d = parsed.data;
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update pelanggan
            set nama = coalesce($2::text, nama), gender = coalesce($3::gender, gender),
                usia = coalesce($4::smallint, usia), hp = coalesce($5::text, hp),
                catatan = coalesce($6::text, catatan),
                tanggal_lahir = coalesce($7::date, tanggal_lahir)
          where id = $1 and erased_at is null
          returning id, nama, gender, usia,
                    to_char(tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir", hp, catatan`,
        [id, d.nama ?? null, d.gender ?? null, d.usia ?? null, d.hp ?? null, d.catatan ?? null,
         d.tanggalLahir ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'pelanggan.update', 'pelanggan', id, d);
      return rows[0];
    });
  });

  /* ============================== pengukuran ============================== */

  app.get('/pelanggan/:id/pengukuran', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select pg.id, pg.jenis, pg.konteks, pg.nilai, pg.out_of_range as "outOfRange",
                pg.catatan, pg.diukur_pada as "diukurPada",
                pg.participant_id as "participantId",
                pg.diukur_oleh as "diukurOleh", u.nama as "diukurOlehNama",
                e.nama as "eventNama"
           from pengukuran pg
           left join users u on u.id = pg.diukur_oleh
           left join participants k on k.id = pg.participant_id
           left join events e on e.id = k.event_id
          where pg.pelanggan_id = $1 and pg.deleted_at is null
          order by pg.diukur_pada desc, pg.jenis`,
        [id],
      );
      return { pengukuran: rows };
    });
  });

  /**
   * Daftar data terhapus milik seorang pelanggan.
   *
   * Hapus lunak tanpa cara melihatnya kembali sama saja dengan hapus biasa —
   * hanya lebih boros ruang. Endpoint ini yang membuat "bisa dipulihkan"
   * menjadi janji yang bisa ditepati petugas, bukan sekadar sifat basis data.
   *
   * Aksesnya sama dengan yang boleh menghapus: siapa yang bisa membuang harus
   * bisa mengembalikan, dan tidak lebih dari itu.
   */
  app.get('/pelanggan/:id/terhapus', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const pengukuran = await tx.query(
        `select pg.id, pg.jenis, pg.konteks, pg.nilai,
                pg.diukur_pada as "diukurPada", pg.deleted_at as "dihapusPada",
                u.nama as "dihapusOlehNama"
           from pengukuran pg
           left join users u on u.id = pg.deleted_by
          where pg.pelanggan_id = $1 and pg.deleted_at is not null
          order by pg.deleted_at desc
          limit 100`,
        [id],
      );
      const transaksi = await tx.query(
        `select t.id, t.jenis, t.nama, t.jumlah, t.total,
                to_char(t.tanggal,'YYYY-MM-DD') as tanggal,
                t.deleted_at as "dihapusPada", u.nama as "dihapusOlehNama"
           from transaksi t
           left join users u on u.id = t.deleted_by
          where t.pelanggan_id = $1 and t.deleted_at is not null
          order by t.deleted_at desc
          limit 100`,
        [id],
      );
      return { pengukuran: pengukuran.rows, transaksi: transaksi.rows };
    });
  });

  app.post('/pengukuran', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = pengukuranBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const m = parsed.data;
    const ctx = ctxOf(req);

    // Balasan dikirim SETELAH withTenant selesai, bukan di dalamnya. Lihat
    // catatan di db.ts: commit terjadi setelah callback, jadi mengirim 201 dari
    // dalam berarti klien bisa langsung meminta baris yang belum ter-commit.
    const hasil = await withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `insert into pengukuran (tenant_id, pelanggan_id, participant_id, client_id, jenis,
                                 konteks, nilai, diukur_pada, diukur_oleh, out_of_range, catatan)
         values ($1,$2,$3,$4,$5::jenis_ukur,$6,$7,coalesce($8::timestamptz, now()),$9,$10,$11)
         on conflict (tenant_id, client_id) do update
            set nilai = excluded.nilai, konteks = excluded.konteks,
                diukur_pada = excluded.diukur_pada, diukur_oleh = excluded.diukur_oleh,
                out_of_range = excluded.out_of_range, catatan = excluded.catatan
         returning id, jenis, konteks, nilai, diukur_pada as "diukurPada"`,
        [ctx.tenantId, m.pelangganId, m.participantId ?? null, m.clientId ?? crypto.randomUUID(),
         m.jenis, m.konteks ?? null, m.nilai, m.diukurPada ?? null,
         m.diukurOleh ?? ctx.userId, m.outOfRange, m.catatan ?? null],
      );
      await audit(tx, ctx, 'pengukuran.create', 'pengukuran', rows[0]!.id, { jenis: m.jenis });
      return rows[0];
    });
    return reply.code(201).send(hasil);
  });

  app.patch('/pengukuran/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      nilai: z.number().min(0).max(1000).optional(),
      konteks: z.enum(KONTEKS).nullish(),
      diukurPada: z.string().datetime().optional(),
      diukurOleh: z.string().uuid().nullish(),
      outOfRange: z.boolean().optional(),
      catatan: z.string().max(500).nullish(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const d = parsed.data;
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update pengukuran
            set nilai = coalesce($2, nilai),
                konteks = case when $3::boolean then $4::text else konteks end,
                diukur_pada = coalesce($5::timestamptz, diukur_pada),
                diukur_oleh = coalesce($6::uuid, diukur_oleh),
                out_of_range = coalesce($7::boolean, out_of_range),
                catatan = case when $8::boolean then $9::text else catatan end
          where id = $1
          returning id, jenis, konteks, nilai, diukur_pada as "diukurPada"`,
        [id, d.nilai ?? null,
         Object.hasOwn(d, 'konteks'), d.konteks ?? null,
         d.diukurPada ?? null, d.diukurOleh ?? null, d.outOfRange ?? null,
         Object.hasOwn(d, 'catatan'), d.catatan ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'pengukuran.update', 'pengukuran', id, d);
      return rows[0];
    });
  });

  /**
   * Menghapus pengukuran hanya untuk Koordinator, dan hanya secara lunak.
   *
   * Hasil pengukuran adalah fakta pada satu momen dan tidak bisa diulang.
   * Angka yang salah ketik memang harus bisa dibuang, tapi kalau yang terhapus
   * ternyata bukan yang dimaksud, harus ada jalan pulang.
   */
  app.delete('/pengukuran/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ jenis: string; nilai: string }>(
        `update pengukuran set deleted_at = now(), deleted_by = $2
          where id = $1 and deleted_at is null
          returning jenis, nilai`,
        [id, ctx.userId],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'pengukuran.delete', 'pengukuran', id, rows[0]);
      return { ok: true };
    });
  });

  /** Membatalkan penghapusan. Inilah yang membuat hapus lunak berarti. */
  app.post('/pengukuran/:id/pulihkan', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ jenis: string; nilai: string }>(
        `update pengukuran set deleted_at = null, deleted_by = null
          where id = $1 and deleted_at is not null
          returning jenis, nilai`,
        [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'pengukuran.restore', 'pengukuran', id, rows[0]);
      return { ok: true };
    });
  });

  /* ============================== transaksi ============================== */

  app.get('/pelanggan/:id/transaksi', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select t.id, t.jenis, t.nama, t.jumlah, t.harga_satuan as "hargaSatuan", t.total,
                to_char(t.tanggal,'YYYY-MM-DD') as tanggal, t.catatan,
                t.dicatat_oleh as "dicatatOleh", u.nama as "dicatatOlehNama",
                e.nama as "eventNama"
           from transaksi t
           left join users u on u.id = t.dicatat_oleh
           left join participants k on k.id = t.participant_id
           left join events e on e.id = k.event_id
          where t.pelanggan_id = $1 and t.deleted_at is null
          order by t.tanggal desc, t.created_at desc`,
        [id],
      );
      const total = rows.reduce((a, r) => a + Number(r.total), 0);
      return { transaksi: rows, total };
    });
  });

  app.post('/transaksi', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = transaksiBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const t = parsed.data;
    const ctx = ctxOf(req);

    const hasil = await withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `insert into transaksi (tenant_id, pelanggan_id, participant_id, client_id, jenis,
                                nama, jumlah, harga_satuan, tanggal, dicatat_oleh, catatan,
                                katalog_id)
         values ($1,$2,$3,$4,$5::jenis_transaksi,$6,$7,$8,coalesce($9::date, current_date),$10,$11,$12)
         on conflict (tenant_id, client_id) do update
            set nama = excluded.nama, jumlah = excluded.jumlah,
                harga_satuan = excluded.harga_satuan, tanggal = excluded.tanggal,
                jenis = excluded.jenis, catatan = excluded.catatan,
                katalog_id = excluded.katalog_id
         returning id, jenis, nama, jumlah, harga_satuan as "hargaSatuan", total,
                   to_char(tanggal,'YYYY-MM-DD') as tanggal`,
        [ctx.tenantId, t.pelangganId, t.participantId ?? null, t.clientId ?? crypto.randomUUID(),
         t.jenis, t.nama, t.jumlah, t.hargaSatuan, t.tanggal ?? null, ctx.userId, t.catatan ?? null,
         t.katalogId ?? null],
      );
      await audit(tx, ctx, 'transaksi.create', 'transaksi', rows[0]!.id, { nama: t.nama, total: rows[0]!.total });
      return rows[0];
    });
    return reply.code(201).send(hasil);
  });

  app.patch('/transaksi/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      jenis: z.enum(['produk', 'terapi', 'paket']).optional(),
      nama: z.string().min(1).max(200).optional(),
      jumlah: z.number().int().min(1).optional(),
      hargaSatuan: z.number().int().min(0).optional(),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      catatan: z.string().max(500).nullish(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const d = parsed.data;
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update transaksi
            set jenis = coalesce($2::jenis_transaksi, jenis), nama = coalesce($3::text, nama),
                jumlah = coalesce($4::integer, jumlah), harga_satuan = coalesce($5::bigint, harga_satuan),
                tanggal = coalesce($6::date, tanggal),
                catatan = case when $7::boolean then $8::text else catatan end
          where id = $1
          returning id, jenis, nama, jumlah, harga_satuan as "hargaSatuan", total,
                    to_char(tanggal,'YYYY-MM-DD') as tanggal`,
        [id, d.jenis ?? null, d.nama ?? null, d.jumlah ?? null, d.hargaSatuan ?? null,
         d.tanggal ?? null, Object.hasOwn(d, 'catatan'), d.catatan ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'transaksi.update', 'transaksi', id, d);
      return rows[0];
    });
  });

  app.delete('/transaksi/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ nama: string; total: string }>(
        `update transaksi set deleted_at = now(), deleted_by = $2
          where id = $1 and deleted_at is null
          returning nama, total`,
        [id, ctx.userId],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'transaksi.delete', 'transaksi', id, rows[0]);
      return { ok: true };
    });
  });

  app.post('/transaksi/:id/pulihkan', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ nama: string; total: string }>(
        `update transaksi set deleted_at = null, deleted_by = null
          where id = $1 and deleted_at is not null
          returning nama, total`,
        [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'transaksi.restore', 'transaksi', id, rows[0]);
      return { ok: true };
    });
  });

  /* ======================= dashboard lintas cabang ======================= */

  /**
   * Ringkasan seluruh cabang — khusus Admin Pusat.
   *
   * Riwayat pelanggan tetap per cabang (keputusan pemilik produk): layar ini
   * memberi ANGKA per cabang, bukan daftar orangnya. Perbandingan antarcabang
   * tidak membutuhkan nama siapa pun, dan setiap pembukaan halaman ini dicatat
   * di audit log.
   */
  app.get('/pusat/ringkasan', { preHandler: requireRole('admin_pusat') }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select t.id, t.nama,
                (select count(*) from pelanggan p
                  where p.tenant_id = t.id and p.erased_at is null)::int as pelanggan,
                (select count(*) from participants k
                  where k.tenant_id = t.id and k.deleted_at is null)::int as kunjungan,
                (select count(*) from pengukuran g where g.tenant_id = t.id and g.deleted_at is null)::int as pengukuran,
                (select count(*) from events e
                  where e.tenant_id = t.id and e.status = 'active')::int as "eventAktif",
                (select count(*) from events e
                  where e.tenant_id = t.id and e.status <> 'archived')::int as event,
                (select coalesce(sum(x.total),0) from transaksi x where x.tenant_id = t.id and x.deleted_at is null)::bigint as "totalBelanja",
                (select count(*) from transaksi x where x.tenant_id = t.id and x.deleted_at is null)::int as transaksi,
                (select count(*) from users u where u.tenant_id = t.id and u.active)::int as petugas,
                (select count(*) from participants k
                  where k.tenant_id = t.id and k.needs_review and k.deleted_at is null)::int as "perluDitinjau"
           from tenants t
          order by t.nama`,
      );

      await audit(tx, ctx, 'pusat.ringkasan', 'tenant', null, {
        cabang: rows.length, lintasCabang: true,
      });

      const jumlah = (k: string) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
      return {
        cabang: rows,
        total: {
          cabang: rows.length,
          pelanggan: jumlah('pelanggan'),
          kunjungan: jumlah('kunjungan'),
          pengukuran: jumlah('pengukuran'),
          eventAktif: jumlah('eventAktif'),
          transaksi: jumlah('transaksi'),
          totalBelanja: jumlah('totalBelanja'),
          perluDitinjau: jumlah('perluDitinjau'),
        },
      };
    });
  });

  /* ========================= petugas ditugaskan ========================= */

  app.put('/events/:id/petugas', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({ userIds: z.array(z.string().uuid()).max(20) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const ada = await tx.query('select 1 from events where id = $1', [id]);
      if (!ada.rowCount) return reply.code(404).send({ error: 'not_found' });

      await tx.query('delete from event_petugas where event_id = $1', [id]);
      for (const uid of parsed.data.userIds) {
        await tx.query(
          `insert into event_petugas (event_id, user_id, tenant_id) values ($1,$2,$3)
           on conflict do nothing`,
          [id, uid, ctx.tenantId],
        );
      }
      await audit(tx, ctx, 'event.petugas', 'event', id, { jumlah: parsed.data.userIds.length });
      return { ok: true, jumlah: parsed.data.userIds.length };
    });
  });

  app.get('/events/:id/petugas', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select u.id, u.nama, u.role
           from event_petugas ep join users u on u.id = ep.user_id
          where ep.event_id = $1 order by u.nama`,
        [id],
      );
      return { petugas: rows };
    });
  });
}
