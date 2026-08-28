import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, auditAdminRead, withTenant } from '../db.js';

const conversionBody = z.object({
  berminat: z.boolean().optional(),
  status: z.enum(['baru', 'dihubungi', 'membeli', 'batal']),
  nilaiTransaksi: z.number().int().min(0).default(0),
  produk: z.string().max(200).nullish(),
});

export default async function participantRoutes(app: FastifyInstance) {
  /** Daftar peserta untuk tindak lanjut Koordinator. */
  app.get('/participants', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { eventId?: string; status?: string; berminat?: string; limit?: string };
    const ctx = ctxOf(req);
    const limit = Math.min(Number(q.limit ?? 100), 500);

    return withTenant(ctx, async (tx) => {
      const where: string[] = ['p.deleted_at is null'];
      const args: unknown[] = [];
      if (q.eventId) { args.push(q.eventId); where.push(`p.event_id = $${args.length}`); }
      if (q.status) { args.push(q.status); where.push(`cv.status = $${args.length}`); }
      if (q.berminat === 'true') where.push('cv.berminat');
      args.push(limit);

      const { rows } = await tx.query<{ tenantId: string }>(
        `select p.id, p.client_id as "clientId", p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir",
                p.tanggal_lahir_asumsi as "tanggalLahirAsumsi", p.hp,
                p.needs_review as "needsReview", p.erased_at as "erasedAt",
                p.tenant_id as "tenantId",
                -- Ikut dikirim supaya perangkat bisa menyalinnya: tanpa ini,
                -- pelangganId hanya ada di /participants/:id, dan petugas yang
                -- offline tidak pernah bisa mencatat pengukuran.
                p.pelanggan_id as "pelangganId",
                e.id as "eventId", e.nama as "eventNama",
                to_char(e.tanggal,'YYYY-MM-DD') as "eventTanggal", e.status as "eventStatus",
                s.imt, s.params_diambil as "paramsDiambil",
                -- Nilai pemeriksaan ikut dikirim supaya penyaring temuan pada
                -- daftar peserta bisa dihitung di perangkat, termasuk saat
                -- offline dari salinan lokal.
                s.sistolik, s.diastolik, s.gula, s.kolesterol,
                s.asam_urat as "asamUrat", s.lingkar_perut as "lingkarPerut",
                s.konteks_gula as "konteksGula",
                -- US-04: jejak peserta — tanggal screening sesungguhnya, bukan
                -- tanggal event, agar event multi-hari tetap terbaca benar.
                s.measured_at as "measuredAt",
                coalesce(cv.berminat,false) as berminat,
                coalesce(cv.status,'baru') as "convStatus",
                coalesce(cv.nilai_transaksi,0) as "nilaiTransaksi", cv.produk,
                cv.updated_at as "convUpdatedAt",
                p.created_at as "createdAt"
           from participants p
           join events e on e.id = p.event_id
           left join screenings s on s.participant_id = p.id
           left join conversions cv on cv.participant_id = p.id
          where ${where.join(' and ')}
          order by p.created_at desc
          limit $${args.length}`,
        args,
      );
      await auditAdminRead(tx, ctx, 'participant.read', {
        jumlah: rows.length,
        tenantIds: rows.map((r) => r.tenantId),
        filter: { eventId: q.eventId ?? null, status: q.status ?? null, berminat: q.berminat ?? null },
      });
      return { participants: rows };
    });
  });

  /**
   * Rekap satu peserta — identitas, persetujuan, seluruh nilai pengukuran,
   * dan status konversinya. Daftar peserta hanya membawa ringkasan; detail
   * per orang butuh nilai tiap parameter, bukan sekadar IMT-nya.
   */
  app.get('/participants/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ tenantId: string }>(
        `select p.id, p.client_id as "clientId", p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir",
                p.tanggal_lahir_asumsi as "tanggalLahirAsumsi", p.hp,
                p.needs_review as "needsReview", p.erased_at as "erasedAt",
                p.created_at as "createdAt", p.device_id as "deviceId",
                p.tenant_id as "tenantId", p.pelanggan_id as "pelangganId",
                json_build_object(
                  'id', e.id, 'nama', e.nama, 'lokasi', e.lokasi,
                  'tanggal', to_char(e.tanggal,'YYYY-MM-DD'),
                  'tipe', e.tipe, 'hargaPaket', e.harga_paket, 'status', e.status
                ) as event,
                case when c.id is null then null else json_build_object(
                  'granted', c.granted, 'versiTeks', c.versi_teks, 'ts', c.ts
                ) end as consent,
                case when s.id is null then null else json_build_object(
                  'tinggi', s.tinggi, 'berat', s.berat, 'imt', s.imt,
                  'lingkarPerut', s.lingkar_perut, 'nadi', s.nadi,
                  'konteksGula', s.konteks_gula,
                  'sistolik', s.sistolik, 'diastolik', s.diastolik,
                  'gula', s.gula, 'kolesterol', s.kolesterol, 'asamUrat', s.asam_urat,
                  'paramsDiambil', s.params_diambil, 'outOfRange', s.out_of_range,
                  'measuredAt', s.measured_at
                ) end as screening,
                case when cv.id is null then null else json_build_object(
                  'berminat', cv.berminat, 'status', cv.status,
                  'nilaiTransaksi', cv.nilai_transaksi, 'produk', cv.produk,
                  'updatedAt', cv.updated_at
                ) end as conversion
           from participants p
           join events e on e.id = p.event_id
           left join lateral (
             select * from consents where participant_id = p.id order by ts desc limit 1
           ) c on true
           left join screenings s on s.participant_id = p.id
           left join conversions cv on cv.participant_id = p.id
          where p.id = $1 and p.deleted_at is null`,
        [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });

      await auditAdminRead(tx, ctx, 'participant.read_detail', {
        jumlah: 1, tenantIds: [rows[0].tenantId], participantId: id,
      });
      return rows[0];
    });
  });

  /**
   * US-04: perubahan status konversi oleh Koordinator setelah event.
   * Aturan "membeli wajib nilai + produk" ditegakkan CHECK constraint di DB,
   * jadi tidak bisa ditembus lewat jalur lain.
   */
  app.patch('/participants/:id/conversion',
    { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = conversionBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
      const c = parsed.data;
      if (c.status === 'membeli' && (!c.nilaiTransaksi || !c.produk?.trim())) {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'Status membeli wajib menyertakan nilai transaksi dan produk.',
        });
      }
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        const exists = await tx.query('select 1 from participants where id = $1 and deleted_at is null', [id]);
        if (!exists.rowCount) return reply.code(404).send({ error: 'not_found' });

        const { rows } = await tx.query(
          `insert into conversions (tenant_id, participant_id, berminat, status, nilai_transaksi, produk, updated_at)
           values ($1,$2,coalesce($3,true),$4,$5,$6,now())
           on conflict (participant_id) do update
              set berminat = coalesce($3, conversions.berminat),
                  status = excluded.status,
                  nilai_transaksi = excluded.nilai_transaksi,
                  produk = excluded.produk,
                  updated_at = now()
           returning status, nilai_transaksi as "nilaiTransaksi", produk, berminat`,
          [ctx.tenantId, id, c.berminat ?? null, c.status, c.nilaiTransaksi, c.produk ?? null],
        );
        await audit(tx, ctx, 'conversion.update', 'participant', id, { status: c.status });
        return rows[0];
      });
    });

  /**
   * §4.3 — daftar konflik dedup yang menunggu resolusi manual.
   * Setiap grup berisi record yang bentrok pada kunci event_id + nomor HP.
   */
  app.get('/conflicts', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ tenantId: string; records: unknown[] }>(
        `with flagged as (
           select distinct event_id, hp from participants
            where needs_review and deleted_at is null
         )
         select f.event_id as "eventId", f.hp, e.nama as "eventNama", e.tenant_id as "tenantId",
                json_agg(json_build_object(
                  'id', p.id, 'clientId', p.client_id, 'nama', p.nama, 'gender', p.gender,
                  'usia', p.usia, 'tanggalLahir', to_char(p.tanggal_lahir,'YYYY-MM-DD'),
                  'needsReview', p.needs_review, 'deviceId', p.device_id,
                  'createdAt', p.created_at,
                  'screening', case when s.id is null then null else json_build_object(
                    'tinggi', s.tinggi, 'berat', s.berat, 'imt', s.imt,
                  'lingkarPerut', s.lingkar_perut, 'nadi', s.nadi,
                  'konteksGula', s.konteks_gula,
                    'sistolik', s.sistolik, 'diastolik', s.diastolik,
                    'gula', s.gula, 'kolesterol', s.kolesterol, 'asamUrat', s.asam_urat,
                    'paramsDiambil', s.params_diambil) end
                ) order by p.created_at) as records
           from flagged f
           join participants p
             on p.event_id = f.event_id and p.hp = f.hp and p.deleted_at is null
           join events e on e.id = f.event_id
           left join screenings s on s.participant_id = p.id
          group by f.event_id, f.hp, e.nama, e.tenant_id`,
      );
      await auditAdminRead(tx, ctx, 'conflict.read', {
        jumlah: rows.reduce((a, r) => a + (r.records?.length ?? 0), 0),
        tenantIds: rows.map((r) => r.tenantId),
      });
      return { conflicts: rows };
    });
  });

  /** Koordinator memilih record yang dipertahankan; sisanya diarsipkan. */
  app.post('/conflicts/resolve',
    { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const parsed = z.object({
        keepId: z.string().uuid(),
        dropIds: z.array(z.string().uuid()).min(1),
      }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
      const { keepId, dropIds } = parsed.data;
      if (dropIds.includes(keepId)) {
        return reply.code(400).send({ error: 'bad_request', message: 'keepId tidak boleh ikut di dropIds.' });
      }
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        const keep = await tx.query<{ event_id: string; hp: string }>(
          'select event_id, hp from participants where id = $1 and deleted_at is null', [keepId],
        );
        if (!keep.rowCount) return reply.code(404).send({ error: 'not_found' });

        // Hanya record dalam grup bentrok yang sama yang boleh diarsipkan.
        const { rowCount } = await tx.query(
          `update participants set deleted_at = now(), needs_review = false
            where id = any($1::uuid[]) and event_id = $2 and hp = $3 and deleted_at is null`,
          [dropIds, keep.rows[0]!.event_id, keep.rows[0]!.hp],
        );
        await tx.query('update participants set needs_review = false where id = $1', [keepId]);
        await audit(tx, ctx, 'conflict.resolve', 'participant', keepId, { dropIds, diarsipkan: rowCount });
        return { ok: true, kept: keepId, archived: rowCount };
      });
    });

  /**
   * §4.5.7 — penghapusan data peserta atas permintaan. Identitas dibersihkan
   * dan hasil pengukuran dihapus; baris tetap ada agar rekap historis tidak
   * berubah diam-diam. Seluruh tindakan tercatat di audit_log.
   */
  app.post('/participants/:id/erase',
    { preHandler: requireRole('koordinator', 'admin_pusat') },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const alasan = (req.body as { alasan?: string } | undefined)?.alasan ?? null;
      const ctx = ctxOf(req);

      return withTenant(ctx, async (tx) => {
        const { rowCount } = await tx.query(
          `update participants
              set nama = '[dihapus atas permintaan]', hp = '', erased_at = now()
            where id = $1 and erased_at is null`,
          [id],
        );
        if (!rowCount) return reply.code(404).send({ error: 'not_found', message: 'Peserta tidak ada atau sudah dihapus.' });
        await tx.query('delete from screenings where participant_id = $1', [id]);
        await audit(tx, ctx, 'participant.erase', 'participant', id, { alasan });
        return { ok: true };
      });
    });
}
