import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, withTenant, type Tx } from '../db.js';
import { CONSUMABLE_PARAMS, PARAM_KEYS, type ParamKey } from '../domain.js';

const eventBody = z.object({
  clientId: z.string().uuid(),
  nama: z.string().min(1).max(160),
  lokasi: z.string().min(1).max(160),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipe: z.enum(['gratis', 'berbayar']),
  hargaPaket: z.number().int().min(0).default(0),
  petugas: z.string().max(160).nullish(),
  status: z.enum(['planned', 'active', 'done', 'archived']).default('active'),
});

export default async function eventRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      // Hitungan ikut di daftar supaya perangkat yang baru login tetap
      // menampilkan angka event yang benar, bukan hanya yang dicatat sendiri.
      const { rows } = await tx.query(
        `select e.id, e.client_id as "clientId", e.nama, e.lokasi,
                to_char(e.tanggal,'YYYY-MM-DD') as tanggal, e.tipe,
                e.harga_paket as "hargaPaket", e.petugas, e.status,
                count(p.id) filter (where p.deleted_at is null and not p.needs_review)::int as peserta,
                count(p.id) filter (where p.deleted_at is null and not p.needs_review and cv.berminat)::int as berminat,
                coalesce(t.jumlah, 0)::int as tally
           from events e
           left join participants p on p.event_id = e.id
           left join conversions cv on cv.participant_id = p.id
           left join (
             select event_id, count(*) as jumlah from anon_tallies group by event_id
           ) t on t.event_id = e.id
          where e.status <> 'archived'
          group by e.id, t.jumlah
          order by (e.status = 'active') desc, e.tanggal desc`,
      );
      return { events: rows };
    });
  });

  app.post('/events', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const parsed = eventBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const e = parsed.data;
    const ctx = ctxOf(req);

    // Balasan sengaja dikirim setelah transaksi selesai — lihat catatan di
    // db.ts: commit terjadi setelah callback, jadi 201 yang dikirim dari dalam
    // bisa mendahului commit-nya sendiri.
    const id = await withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into events (tenant_id, client_id, nama, lokasi, tanggal, tipe, harga_paket, petugas, status, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (tenant_id, client_id) do update set nama = excluded.nama
         returning id`,
        [ctx.tenantId, e.clientId, e.nama, e.lokasi, e.tanggal, e.tipe,
         e.hargaPaket, e.petugas ?? null, e.status, ctx.userId],
      );
      await audit(tx, ctx, 'event.create', 'event', rows[0]!.id, { nama: e.nama });
      return rows[0]!.id;
    });
    return reply.code(201).send({ id, clientId: e.clientId });
  });

  /**
   * US-01: event yang sudah punya peserta tidak dapat dihapus, hanya diarsipkan.
   */
  app.post('/events/:id/archive', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rowCount } = await tx.query(
        `update events set status = 'archived', archived_at = now() where id = $1`, [id],
      );
      if (!rowCount) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'event.archive', 'event', id);
      return { ok: true };
    });
  });

  /**
   * Menghapus event yang BELUM punya jejak apa pun.
   *
   * US-01 menyatakan event yang sudah punya peserta tidak boleh dihapus, hanya
   * diarsipkan — menghapusnya akan ikut menarik peserta, consent, dan hasil
   * pengukuran mereka lewat cascade, dan itu menghapus catatan pelayanan orang
   * sungguhan demi merapikan daftar.
   *
   * Yang tersisa adalah kasus yang justru paling sering: event salah ketik atau
   * event percobaan yang belum pernah dipakai. Untuk itu mengarsipkan hanya
   * memindahkan sampah, bukan membuangnya.
   */
  app.delete('/events/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows: jejak } = await tx.query<{ peserta: number; tally: number }>(
        `select (select count(*) from participants where event_id = $1)::int as peserta,
                (select count(*) from anon_tallies where event_id = $1)::int as tally`,
        [id],
      );
      const j = jejak[0]!;
      if (j.peserta > 0 || j.tally > 0) {
        return reply.code(409).send({
          error: 'ada_jejak',
          message: j.peserta > 0
            ? `Event ini sudah punya ${j.peserta} peserta. Arsipkan saja agar catatannya tetap utuh.`
            : `Event ini sudah punya ${j.tally} tally anonim. Arsipkan saja agar hitungannya tetap utuh.`,
        });
      }

      const { rows } = await tx.query<{ nama: string }>(
        'delete from events where id = $1 returning nama', [id],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'event.delete', 'event', id, { nama: rows[0].nama });
      return { ok: true };
    });
  });

  app.get('/events/:id/recap', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const recap = await buildRecap(tx, id);
      if (!recap) return reply.code(404).send({ error: 'not_found' });
      return recap;
    });
  });

  /** US-06: ekspor CSV oleh Koordinator dan Admin Pusat. */
  app.get('/events/:id/export.csv', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const ev = await tx.query<{ nama: string }>('select nama from events where id = $1', [id]);
      if (!ev.rowCount) return reply.code(404).send({ error: 'not_found' });

      const { rows } = await tx.query(
        `select p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as tanggal_lahir,
                p.tanggal_lahir_asumsi, p.hp, p.needs_review,
                c.granted as consent_granted, c.versi_teks, c.ts as consent_ts,
                s.tinggi, s.berat, s.imt, s.sistolik, s.diastolik, s.gula, s.kolesterol, s.asam_urat,
                cv.berminat, cv.status as conv_status, cv.nilai_transaksi, cv.produk
           from participants p
           left join lateral (
             select * from consents where participant_id = p.id order by ts desc limit 1
           ) c on true
           left join screenings s on s.participant_id = p.id
           left join conversions cv on cv.participant_id = p.id
          where p.event_id = $1 and p.deleted_at is null
          order by p.created_at`,
        [id],
      );

      // Setiap ekspor data peserta dicatat (§4.5.8).
      await audit(tx, ctx, 'event.export_csv', 'event', id, { baris: rows.length });

      const head = ['nama', 'jenis_kelamin', 'tanggal_lahir', 'tanggal_lahir_taksiran', 'usia', 'no_hp', 'perlu_ditinjau', 'consent', 'consent_versi',
        'consent_waktu', 'tinggi_cm', 'berat_kg', 'imt', 'sistolik', 'diastolik', 'gula_mgdl',
        'kolesterol_mgdl', 'asam_urat_mgdl', 'berminat', 'status_konversi', 'nilai_transaksi', 'produk'];
      const cell = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = rows.map((r) => [
        // Kolomnya sendiri, bukan tanda kurung pada tanggalnya: yang membaca
        // CSV ini adalah spreadsheet, dan "1963-08-17 (taksiran)" berhenti
        // menjadi tanggal begitu ada kata di belakangnya.
        r.nama, r.gender, r.tanggal_lahir ?? '',
        r.tanggal_lahir ? (r.tanggal_lahir_asumsi ? 'ya' : 'tidak') : '',
        r.usia, r.hp,
        r.needs_review ? 'ya' : 'tidak',
        r.consent_granted ? 'setuju' : 'tolak', r.versi_teks,
        r.consent_ts ? new Date(r.consent_ts).toISOString() : '',
        r.tinggi, r.berat, r.imt, r.sistolik, r.diastolik, r.gula, r.kolesterol, r.asam_urat,
        r.berminat ? 'ya' : 'tidak', r.conv_status ?? '', r.nilai_transaksi ?? '', r.produk ?? '',
      ].map(cell).join(';'));

      const slug = ev.rows[0]!.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      reply.header('content-type', 'text/csv; charset=utf-8');
      reply.header('content-disposition', `attachment; filename="${slug || 'event'}-rekap.csv"`);
      // BOM agar Excel di Windows membaca UTF-8 dengan benar.
      return '﻿' + [head.join(';'), ...lines].join('\r\n');
    });
  });
}

export async function buildRecap(tx: Tx, eventId: string) {
  const ev = await tx.query<{
    id: string; tipe: 'gratis' | 'berbayar'; hargaPaket: number; tenantId: string;
  }>(
    `select id, nama, lokasi, to_char(tanggal,'YYYY-MM-DD') as tanggal, tipe,
            harga_paket as "hargaPaket", petugas, status, tenant_id as "tenantId"
       from events where id = $1`,
    [eventId],
  );
  if (!ev.rowCount) return null;
  const event = ev.rows[0]!;

  const stats = await tx.query<{
    peserta: number; berminat: number; membeli: number; penjualan: number;
    perlu_tinjau: number; consent_setuju: number;
  }>(
    `select
       count(*) filter (where not p.needs_review)::int as peserta,
       count(*) filter (where not p.needs_review and cv.berminat)::int as berminat,
       count(*) filter (where not p.needs_review and cv.status = 'membeli')::int as membeli,
       coalesce(sum(cv.nilai_transaksi) filter (where not p.needs_review and cv.status = 'membeli'),0)::bigint as penjualan,
       count(*) filter (where p.needs_review)::int as perlu_tinjau,
       count(*) filter (where not p.needs_review and c.granted)::int as consent_setuju
     from participants p
     left join conversions cv on cv.participant_id = p.id
     left join lateral (select granted from consents where participant_id = p.id order by ts desc limit 1) c on true
    where p.event_id = $1 and p.deleted_at is null`,
    [eventId],
  );

  // Hitung pemakaian per parameter dari params_diambil (dasar biaya consumable).
  const params = await tx.query<{ param: ParamKey; jumlah: number }>(
    `select unnest(s.params_diambil) as param, count(*)::int as jumlah
       from screenings s
       join participants p on p.id = s.participant_id
      where p.event_id = $1 and p.deleted_at is null and not p.needs_review
      group by 1`,
    [eventId],
  );
  const anon = await tx.query<{ jumlah: number }>(
    'select count(*)::int as jumlah from anon_tallies where event_id = $1', [eventId],
  );

  // Harga consumable diambil per cabang (migrasi 003), bukan konstanta di kode.
  const prices = await tx.query<{ consumable_prices: Record<string, unknown> }>(
    'select consumable_prices from tenants where id = $1', [event.tenantId],
  );
  const tarif = prices.rows[0]?.consumable_prices ?? {};

  const byParam = new Map(params.rows.map((r) => [r.param, r.jumlah]));
  const consumable = PARAM_KEYS.map((k) => {
    const jumlah = byParam.get(k) ?? 0;
    // Tinggi, berat, dan tensi tidak memakai strip — biayanya nol, bukan
    // "belum diatur". Hanya parameter ber-strip yang butuh harga.
    if (!CONSUMABLE_PARAMS.includes(k)) {
      return { param: k, jumlah, pakaiStrip: false, hargaSatuan: 0, biaya: 0 };
    }
    const raw = tarif[k];
    // null = belum diatur, berbeda maknanya dari 0 yang berarti memang gratis.
    const hargaSatuan = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null;
    return {
      param: k, jumlah, pakaiStrip: true, hargaSatuan,
      biaya: hargaSatuan === null ? null : jumlah * hargaSatuan,
    };
  });
  const hargaBelumDiatur = consumable
    .filter((c) => c.pakaiStrip && c.jumlah > 0 && c.hargaSatuan === null)
    .map((c) => c.param);

  const s = stats.rows[0]!;
  const anonJumlah = anon.rows[0]?.jumlah ?? 0;

  // Pendapatan biaya screening untuk event berbayar. Tally anonim tetap
  // dilayani dan tetap membayar, jadi ikut dihitung.
  const pesertaBerbayar = s.peserta + anonJumlah;
  const pendapatanEvent = event.tipe === 'berbayar' ? pesertaBerbayar * event.hargaPaket : 0;
  const penjualanProduk = Number(s.penjualan);

  return {
    event: ev.rows[0],
    peserta: s.peserta,
    berminat: s.berminat,
    membeli: s.membeli,
    penjualan: penjualanProduk,
    rataRataTransaksi: s.membeli ? Math.round(penjualanProduk / s.membeli) : 0,
    rasioKonversi: s.peserta ? s.membeli / s.peserta : 0,
    perluDitinjau: s.perlu_tinjau,
    consentSetuju: s.consent_setuju,
    tallyAnonim: anonJumlah,
    pendapatanEvent,
    pendapatanTotal: pendapatanEvent + penjualanProduk,
    consumable,
    hargaBelumDiatur,
    estimasiConsumable: consumable.reduce((a, c) => a + (c.biaya ?? 0), 0),
  };
}
