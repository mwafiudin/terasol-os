import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { claimsOf, ctxOf, requireAuth, touchSession } from '../auth.js';
import { auditAdminRead, withTenant, type Tx } from '../db.js';
import { cerminkanScreening, pelangganUntuk } from '../pelanggan-link.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format tanggal harus YYYY-MM-DD');

const eventIn = z.object({
  clientId: z.string().uuid(),
  nama: z.string().min(1).max(160),
  lokasi: z.string().min(1).max(160),
  tanggal: isoDate,
  tipe: z.enum(['gratis', 'berbayar']),
  hargaPaket: z.number().int().min(0).default(0),
  petugas: z.string().max(160).nullish(),
  status: z.enum(['planned', 'active', 'done', 'archived']).default('active'),
  updatedAt: z.string().datetime(),
});

const screeningIn = z.object({
  clientId: z.string().uuid(),
  tinggi: z.number().nullish(),
  berat: z.number().nullish(),
  sistolik: z.number().int().nullish(),
  diastolik: z.number().int().nullish(),
  gula: z.number().int().nullish(),
  kolesterol: z.number().int().nullish(),
  asamUrat: z.number().nullish(),
  // Parameter baru dan konteks gula darah opsional: perangkat versi lama tetap
  // boleh mengirim payload tanpa field ini.
  lingkarPerut: z.number().nullish(),
  nadi: z.number().int().nullish(),
  konteksGula: z.enum(['puasa', 'sewaktu', '2jam_pp']).nullish(),
  diukurOleh: z.string().uuid().nullish(),
  paramsDiambil: z.array(z.string()).default([]),
  outOfRange: z.boolean().default(false),
  measuredAt: z.string().datetime(),
});

const participantIn = z.object({
  clientId: z.string().uuid(),
  eventClientId: z.string().uuid(),
  nama: z.string().min(1).max(160),
  gender: z.enum(['P', 'L']),
  usia: z.number().int().min(0).max(130),
  hp: z.string().min(3).max(32),
  updatedAt: z.string().datetime(),
  consent: z.object({
    granted: z.boolean(),
    versiTeks: z.string().min(1),
    ts: z.string().datetime(),
  }),
  screening: screeningIn.nullish(),
  conversion: z.object({
    berminat: z.boolean().default(false),
    status: z.enum(['baru', 'dihubungi', 'membeli', 'batal']).default('baru'),
    nilaiTransaksi: z.number().int().min(0).default(0),
    produk: z.string().max(200).nullish(),
    updatedAt: z.string().datetime(),
  }).nullish(),
});

const pushBody = z.object({
  batchId: z.string().uuid(),
  events: z.array(eventIn).default([]),
  participants: z.array(participantIn).default([]),
  anonTallies: z.array(z.object({
    clientId: z.string().uuid(),
    eventClientId: z.string().uuid(),
    paramsDiambil: z.array(z.string()).default([]),
    createdAt: z.string().datetime(),
  })).default([]),
});

type Conflict = {
  kind: 'dedup' | 'unknown_event' | 'rejected';
  entity: 'participant' | 'event' | 'anonTally';
  clientId: string;
  message: string;
};

export default async function syncRoutes(app: FastifyInstance) {
  /**
   * Push inkremental. Idempoten pada batchId: batch yang sama dikirim ulang
   * (mis. respons hilang saat sinyal putus) mengembalikan hasil yang sama
   * tanpa menduplikasi data.
   */
  app.post('/sync/push', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = pushBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    }
    const body = parsed.data;
    const ctx = ctxOf(req);
    const claims = claimsOf(req);

    return withTenant(ctx, async (tx) => {
      const prior = await tx.query<{ detail: unknown }>(
        'select detail from sync_log where tenant_id = $1 and batch_id = $2',
        [ctx.tenantId, body.batchId],
      );
      if (prior.rowCount) {
        return { ...(prior.rows[0]!.detail as object), replayed: true };
      }

      const conflicts: Conflict[] = [];
      const accepted = { events: [] as string[], participants: [] as string[], anonTallies: [] as string[] };

      // ---------------- events ----------------
      for (const e of body.events) {
        const { rows } = await tx.query<{ id: string }>(
          `insert into events (tenant_id, client_id, nama, lokasi, tanggal, tipe, harga_paket, petugas, status, created_by)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           on conflict (tenant_id, client_id) do update
              set nama = excluded.nama, lokasi = excluded.lokasi, tanggal = excluded.tanggal,
                  tipe = excluded.tipe, harga_paket = excluded.harga_paket,
                  petugas = excluded.petugas, status = excluded.status
           returning id`,
          [ctx.tenantId, e.clientId, e.nama, e.lokasi, e.tanggal, e.tipe,
           e.hargaPaket, e.petugas ?? null, e.status, ctx.userId],
        );
        if (rows[0]) accepted.events.push(e.clientId);
      }

      const eventIdOf = await eventIdResolver(tx, ctx.tenantId);

      // ---------------- participants ----------------
      for (const p of body.participants) {
        const eventId = await eventIdOf(p.eventClientId);
        if (!eventId) {
          conflicts.push({
            kind: 'unknown_event', entity: 'participant', clientId: p.clientId,
            message: 'Event untuk peserta ini belum tersinkron.',
          });
          continue;
        }

        const existing = await tx.query<{ id: string }>(
          'select id from participants where tenant_id = $1 and client_id = $2',
          [ctx.tenantId, p.clientId],
        );

        let participantId: string;
        if (existing.rowCount) {
          participantId = existing.rows[0]!.id;
          await tx.query(
            `update participants set nama = $1, gender = $2, usia = $3, hp = $4 where id = $5`,
            [p.nama, p.gender, p.usia, p.hp, participantId],
          );
        } else {
          // §4.3 — kunci dedup event_id + nomor HP. Bentrok TIDAK ditimpa:
          // kedua record disimpan, yang baru ditandai needs_review agar
          // Koordinator memilih secara sadar. Hasil pengukuran adalah fakta
          // pada satu momen; menimpanya menghilangkan data yang tak bisa diulang.
          const dup = await tx.query(
            `select 1 from participants
              where event_id = $1 and hp = $2 and deleted_at is null limit 1`,
            [eventId, p.hp],
          );
          const needsReview = (dup.rowCount ?? 0) > 0;
          const ins = await tx.query<{ id: string }>(
            `insert into participants
               (tenant_id, event_id, client_id, nama, gender, usia, hp, needs_review, created_by, device_id)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             returning id`,
            [ctx.tenantId, eventId, p.clientId, p.nama, p.gender, p.usia, p.hp,
             needsReview, ctx.userId, claims.did],
          );
          participantId = ins.rows[0]!.id;
          if (needsReview) {
            conflicts.push({
              kind: 'dedup', entity: 'participant', clientId: p.clientId,
              message: `Nomor ${p.hp} sudah ada di event ini — ditandai perlu ditinjau.`,
            });
          }
        }

        // Setiap peserta event adalah satu kunjungan milik seorang pelanggan
        // cabang ini. Ditautkan di sini supaya riwayat lintas-event terbentuk
        // sendiri, tanpa perangkat lapangan perlu tahu soal entitas pelanggan.
        const pelangganId = await pelangganUntuk(tx, ctx.tenantId, {
          nama: p.nama, gender: p.gender, usia: p.usia, hp: p.hp,
        });
        await tx.query(
          'update participants set pelanggan_id = $2 where id = $1 and pelanggan_id is distinct from $2',
          [participantId, pelangganId],
        );

        // consent immutable: hanya insert bila peserta ini belum punya.
        const hasConsent = await tx.query(
          'select 1 from consents where participant_id = $1 limit 1', [participantId],
        );
        if (!hasConsent.rowCount) {
          await tx.query(
            `insert into consents (tenant_id, participant_id, granted, versi_teks, ts)
             values ($1,$2,$3,$4,$5)`,
            [ctx.tenantId, participantId, p.consent.granted, p.consent.versiTeks, p.consent.ts],
          );
        }

        if (p.screening) {
          const s = p.screening;
          await tx.query(
            `insert into screenings (tenant_id, participant_id, client_id, tinggi, berat, sistolik,
                                     diastolik, gula, kolesterol, asam_urat, lingkar_perut, nadi,
                                     konteks_gula, params_diambil, out_of_range, measured_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             on conflict (participant_id) do update
                set tinggi = excluded.tinggi, berat = excluded.berat, sistolik = excluded.sistolik,
                    diastolik = excluded.diastolik, gula = excluded.gula, kolesterol = excluded.kolesterol,
                    asam_urat = excluded.asam_urat, lingkar_perut = excluded.lingkar_perut,
                    nadi = excluded.nadi, konteks_gula = excluded.konteks_gula,
                    params_diambil = excluded.params_diambil,
                    out_of_range = excluded.out_of_range, measured_at = excluded.measured_at`,
            [ctx.tenantId, participantId, s.clientId, s.tinggi ?? null, s.berat ?? null,
             s.sistolik ?? null, s.diastolik ?? null, s.gula ?? null, s.kolesterol ?? null,
             s.asamUrat ?? null, s.lingkarPerut ?? null, s.nadi ?? null,
             s.konteksGula ?? null, s.paramsDiambil, s.outOfRange, s.measuredAt],
          );
          await cerminkanScreening(tx, ctx.tenantId, pelangganId, participantId, s);
        }

        if (p.conversion) {
          const c = p.conversion;
          // Field non-konflik: last-write-wins berdasarkan updated_at (§4.3.5).
          await tx.query(
            `insert into conversions (tenant_id, participant_id, berminat, status, nilai_transaksi, produk, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7)
             on conflict (participant_id) do update
                set berminat = excluded.berminat, status = excluded.status,
                    nilai_transaksi = excluded.nilai_transaksi, produk = excluded.produk,
                    updated_at = excluded.updated_at
              where excluded.updated_at >= conversions.updated_at`,
            [ctx.tenantId, participantId, c.berminat, c.status, c.nilaiTransaksi,
             c.produk ?? null, c.updatedAt],
          );
        }

        accepted.participants.push(p.clientId);
      }

      // ---------------- tally anonim ----------------
      for (const a of body.anonTallies) {
        const eventId = await eventIdOf(a.eventClientId);
        if (!eventId) {
          conflicts.push({
            kind: 'unknown_event', entity: 'anonTally', clientId: a.clientId,
            message: 'Event untuk tally ini belum tersinkron.',
          });
          continue;
        }
        await tx.query(
          `insert into anon_tallies (tenant_id, event_id, client_id, params_diambil, device_id, created_at)
           values ($1,$2,$3,$4,$5,$6)
           on conflict (tenant_id, client_id) do nothing`,
          [ctx.tenantId, eventId, a.clientId, a.paramsDiambil, claims.did, a.createdAt],
        );
        accepted.anonTallies.push(a.clientId);
      }

      const result = {
        batchId: body.batchId,
        serverTime: new Date().toISOString(),
        accepted,
        conflicts,
      };

      await tx.query(
        `insert into sync_log (tenant_id, device_id, user_id, batch_id, status, accepted, conflicts, detail)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ctx.tenantId, claims.did, ctx.userId, body.batchId,
         conflicts.length ? 'partial' : 'ok',
         accepted.events.length + accepted.participants.length + accepted.anonTallies.length,
         conflicts.length, JSON.stringify(result)],
      );
      await touchSession(tx, claims.sid);
      return result;
    });
  });

  /**
   * Pull inkremental — hanya record yang berubah sejak `since`.
   * Dipakai perangkat lain untuk melihat perubahan status konversi yang
   * dilakukan Koordinator setelah event.
   */
  app.get('/sync/pull', { preHandler: requireAuth }, async (req) => {
    const since = z.string().datetime().safeParse((req.query as { since?: string }).since);
    const sinceTs = since.success ? since.data : new Date(0).toISOString();
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const events = await tx.query(
        `select id, client_id as "clientId", nama, lokasi, to_char(tanggal,'YYYY-MM-DD') as tanggal,
                tipe, harga_paket as "hargaPaket", petugas, status, updated_at as "updatedAt"
           from events where updated_at > $1 order by updated_at`,
        [sinceTs],
      );
      const participants = await tx.query<{ tenantId: string }>(
        `select p.id, p.client_id as "clientId", e.client_id as "eventClientId", p.tenant_id as "tenantId",
                p.nama, p.gender, p.usia, p.hp, p.needs_review as "needsReview",
                p.updated_at as "updatedAt", p.deleted_at as "deletedAt",
                s.tinggi, s.berat, s.sistolik, s.diastolik, s.gula, s.kolesterol,
                s.asam_urat as "asamUrat", s.imt, s.params_diambil as "paramsDiambil",
                c.berminat, c.status as "convStatus", c.nilai_transaksi as "nilaiTransaksi",
                c.produk, c.updated_at as "convUpdatedAt"
           from participants p
           join events e on e.id = p.event_id
           left join screenings s on s.participant_id = p.id
           left join conversions c on c.participant_id = p.id
          where greatest(p.updated_at, coalesce(s.updated_at, p.updated_at), coalesce(c.updated_at, p.updated_at)) > $1
          order by p.updated_at`,
        [sinceTs],
      );
      // Pull juga mengalirkan data peserta identifiable, jadi ikut tercatat (§4.5.8).
      await auditAdminRead(tx, ctx, 'participant.pull', {
        jumlah: participants.rowCount ?? 0,
        tenantIds: participants.rows.map((r) => r.tenantId),
        since: sinceTs,
      });
      await touchSession(tx, claimsOf(req).sid);
      return { serverTime: new Date().toISOString(), events: events.rows, participants: participants.rows };
    });
  });

  /** Status antrean dari sisi server — berapa yang sudah diterima dari perangkat ini. */
  app.get('/sync/status', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    const claims = claimsOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select count(*)::int as batches, coalesce(sum(accepted),0)::int as records,
                max(created_at) as "lastSyncAt"
           from sync_log where device_id = $1`,
        [claims.did],
      );
      return rows[0];
    });
  });
}

/** Cache clientId → id agar batch besar tidak menembak DB berulang kali. */
async function eventIdResolver(tx: Tx, tenantId: string) {
  const cache = new Map<string, string | null>();
  return async (clientId: string): Promise<string | null> => {
    if (cache.has(clientId)) return cache.get(clientId)!;
    const { rows } = await tx.query<{ id: string }>(
      'select id from events where tenant_id = $1 and client_id = $2',
      [tenantId, clientId],
    );
    const id = rows[0]?.id ?? null;
    cache.set(clientId, id);
    return id;
  };
}
