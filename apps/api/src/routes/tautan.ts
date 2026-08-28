/**
 * Tautan hasil yang bisa dibagikan ke peserta.
 *
 * Peserta tidak punya akun. Supaya ia bisa membaca hasilnya sendiri dan
 * mencetaknya jadi PDF di HP-nya, hasilnya harus bisa dibuka tanpa login —
 * dan itu berarti menerbitkan data kesehatan ke sebuah URL. Pagarnya ada di
 * migrasi 014; berkas ini yang menegakkannya.
 */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ctxOf, requireAuth } from '../auth.js';
import { audit, withTenant, withoutTenant, type RequestContext } from '../db.js';

/** Umur tautan bawaan. Bisa dipendekkan pemanggil, tidak bisa diperpanjang. */
const HARI_BAWAAN = 30;
const HARI_MAKS = 90;

/**
 * 32 byte acak, base64url. Bukan id pelanggan, dan bukan turunan apa pun yang
 * bisa ditebak dari data lain — satu-satunya jalan masuk ke halaman publik
 * adalah memegang tokennya.
 */
const tokenBaru = () => randomBytes(32).toString('base64url');

export default async function tautanRoutes(app: FastifyInstance) {
  /** Tautan aktif milik seorang pelanggan, bila ada. */
  app.get('/pelanggan/:id/tautan', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return withTenant(ctxOf(req), async (tx) => {
      const { rows } = await tx.query(
        `select id, token, kedaluwarsa, dibuka_kali as "dibukaKali",
                dibuka_terakhir as "dibukaTerakhir", created_at as "createdAt"
           from tautan_hasil
          where pelanggan_id = $1 and dicabut_at is null and kedaluwarsa > now()`,
        [id],
      );
      return { tautan: rows[0] ?? null };
    });
  });

  /**
   * Membuat tautan, atau memperbarui yang sudah ada.
   *
   * Membagikan ulang TIDAK menerbitkan token kedua. Indeks parsial di migrasi
   * 014 hanya mengizinkan satu tautan aktif per pelanggan, dan itu disengaja:
   * tautan lama yang tetap hidup di percakapan WhatsApp lama adalah pintu yang
   * tidak diketahui siapa pun masih terbuka.
   */
  app.post('/pelanggan/:id/tautan', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      hari: z.number().int().min(1).max(HARI_MAKS).default(HARI_BAWAAN),
    }).safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    }
    const ctx = ctxOf(req);

    return withTenant(ctx, async (tx) => {
      const ada = await tx.query<{ id: string }>(
        'select id from pelanggan where id = $1 and erased_at is null', [id],
      );
      if (!ada.rowCount) return reply.code(404).send({ error: 'not_found' });

      const { rows } = await tx.query(
        `insert into tautan_hasil (tenant_id, pelanggan_id, token, kedaluwarsa, dibuat_oleh)
         values ($1,$2,$3, now() + ($4 || ' days')::interval, $5)
         on conflict (pelanggan_id) where dicabut_at is null
         do update set kedaluwarsa = excluded.kedaluwarsa
         returning id, token, kedaluwarsa, dibuka_kali as "dibukaKali",
                   dibuka_terakhir as "dibukaTerakhir", created_at as "createdAt"`,
        [ctx.tenantId, id, tokenBaru(), String(parsed.data.hari), ctx.userId],
      );
      // Membagikan hasil kesehatan seseorang adalah tindakan yang harus bisa
      // ditelusuri, sama seperti mengekspor CSV satu event.
      await audit(tx, ctx, 'tautan.bagikan', 'pelanggan', id, { hari: parsed.data.hari });
      return { tautan: rows[0] };
    });
  });

  /** Mencabut tautan. Setelah ini URL-nya mati, bukan menunggu kedaluwarsa. */
  app.delete('/pelanggan/:id/tautan', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rowCount } = await tx.query(
        'update tautan_hasil set dicabut_at = now() where pelanggan_id = $1 and dicabut_at is null',
        [id],
      );
      if (!rowCount) return reply.code(404).send({ error: 'not_found' });
      await audit(tx, ctx, 'tautan.cabut', 'pelanggan', id, null);
      return { ok: true };
    });
  });

  /* ============================ rute publik ============================ */

  /**
   * Dibuka peserta tanpa login. SATU-SATUNYA rute tanpa `requireAuth` selain
   * login, dan karena itu yang paling perlu dibaca ulang tiap kali disunting.
   *
   * Tokennya ditukar menjadi tenant_id lewat satu query tanpa konteks, lalu
   * SELURUH pembacaan berikutnya lewat `withTenant` seperti rute biasa. Kalau
   * suatu saat ada kekeliruan di sini, RLS yang menahannya — bukan kebenaran
   * satu baris kode.
   *
   * Yang dikirim sengaja lebih sedikit daripada yang dilihat petugas: nomor HP
   * tidak ikut. Peserta tahu nomornya sendiri, dan sebuah URL yang bisa
   * diteruskan tidak perlu ikut membawanya.
   */
  app.get('/publik/hasil/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
      return reply.code(404).send({ error: 'not_found' });
    }

    const tautan = await withoutTenant(async (tx) => {
      const { rows } = await tx.query<{ tenantId: string; pelangganId: string }>(
        `update tautan_hasil
            set dibuka_kali = dibuka_kali + 1, dibuka_terakhir = now()
          where token = $1 and dicabut_at is null and kedaluwarsa > now()
          returning tenant_id as "tenantId", pelanggan_id as "pelangganId"`,
        [token],
      );
      return rows[0] ?? null;
    });
    // Pesan yang sama untuk token salah, dicabut, dan kedaluwarsa: membedakannya
    // memberi tahu penebak bahwa tokennya PERNAH benar.
    if (!tautan) return reply.code(404).send({ error: 'not_found' });

    /**
     * Peran serendah mungkin, dan tanpa identitas pengguna.
     *
     * `userId` kosong karena memang tidak ada yang login; `app_user_id()`
     * mengubah string kosong menjadi NULL, dan tidak ada satu pun policy yang
     * memakainya — hanya `app_tenant_id()` dan `app_role()`. Kalau suatu saat
     * ada policy yang bergantung pada identitas pengguna, rute ini akan menolak
     * membaca, bukan diam-diam membaca sebagai orang lain.
     */
    const ctx: RequestContext = {
      tenantId: tautan.tenantId, role: 'petugas', userId: '',
    };

    return withTenant(ctx, async (tx) => {
      const p = await tx.query(
        `select p.nama, p.gender, p.usia,
                to_char(p.tanggal_lahir,'YYYY-MM-DD') as "tanggalLahir",
                t.nama as cabang
           from pelanggan p join tenants t on t.id = p.tenant_id
          where p.id = $1 and p.erased_at is null`,
        [tautan.pelangganId],
      );
      if (!p.rowCount) return reply.code(404).send({ error: 'not_found' });

      const ukur = await tx.query(
        `select pg.id, pg.jenis, pg.konteks, pg.nilai,
                pg.out_of_range as "outOfRange", pg.diukur_pada as "diukurPada"
           from pengukuran pg
          where pg.pelanggan_id = $1 and pg.deleted_at is null
          order by pg.diukur_pada desc`,
        [tautan.pelangganId],
      );

      return { pelanggan: p.rows[0], pengukuran: ukur.rows };
    });
  });
}
