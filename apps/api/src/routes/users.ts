import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { claimsOf, ctxOf, requireAuth, requireRole } from '../auth.js';
import { audit, withTenant, withoutTenant } from '../db.js';
import { hashPassword, verifyPassword } from '../password.js';

const createBody = z.object({
  nama: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8, 'kata sandi minimal 8 karakter'),
  /**
   * `admin_pusat` ikut diterima di sini, tetapi hanya Admin Pusat yang boleh
   * mengirimkannya — dijaga oleh `bolehBeriPeran` di bawah, bukan oleh skema.
   * Zod tidak tahu siapa pemanggilnya.
   */
  role: z.enum(['petugas', 'koordinator', 'admin_pusat']),
  /** Cabang tujuan. Hanya dihormati bagi Admin Pusat; lihat `tenantTujuan`. */
  tenantId: z.string().uuid().optional(),
});

/**
 * Peran yang boleh DIBERIKAN oleh pemanggil.
 *
 * Koordinator mengelola cabangnya sendiri dan tidak boleh mengangkat Admin
 * Pusat — itu peran yang membaca seluruh cabang. Kalau ini hanya dijaga di
 * tampilan, satu permintaan HTTP langsung sudah cukup untuk melewatinya.
 */
function bolehBeriPeran(pemanggil: string, diminta: string): boolean {
  return diminta === 'admin_pusat' ? pemanggil === 'admin_pusat' : true;
}

/**
 * Cabang tempat akun akan dibuat.
 *
 * Sebelum ini nilainya selalu cabang si pembuat, sehingga cabang yang baru
 * dibuka tidak pernah bisa mendapatkan koordinator pertamanya lewat aplikasi.
 * `tenantId` dari badan permintaan hanya dihormati bagi Admin Pusat; bagi peran
 * lain ia diabaikan diam-diam agar tidak menjadi petunjuk bahwa ada pintu di
 * sana.
 */
function tenantTujuan(ctx: { tenantId: string; role: string }, diminta?: string): string {
  return ctx.role === 'admin_pusat' && diminta ? diminta : ctx.tenantId;
}

/**
 * Kata sandi sementara yang dibacakan lewat telepon.
 *
 * Abjadnya membuang 0/O dan 1/I/L: sandi ini dieja ke petugas di lapangan, dan
 * "nol atau huruf O" adalah percakapan yang tidak perlu terjadi. Dikelompokkan
 * bertiga karena itu yang bisa ditahan orang di kepala antar-jeda.
 *
 * 15 karakter dari abjad 31 huruf ≈ 74 bit — jauh di atas kebutuhan sandi yang
 * umurnya hanya sampai orangnya masuk dan menggantinya.
 *
 * Byte di atas `batas` dibuang, bukan di-modulo. 256 tidak habis dibagi 31,
 * jadi modulo langsung akan membuat delapan huruf pertama sedikit lebih sering
 * muncul. Selisihnya kecil, tetapi membuang sisa tidak lebih mahal.
 */
function sandiAcak(): string {
  const abjad = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const batas = 256 - (256 % abjad.length);
  const huruf: string[] = [];
  while (huruf.length < 15) {
    for (const b of randomBytes(32)) {
      if (b >= batas) continue;
      huruf.push(abjad[b % abjad.length]!);
      if (huruf.length === 15) break;
    }
  }
  const s = huruf.join('');
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10)}`;
}

export default async function userRoutes(app: FastifyInstance) {
  /**
   * Daftar akun.
   *
   * Kolom cabang ikut dikirim, dan itu bukan hiasan: RLS memberi Admin Pusat
   * baris dari SEMUA cabang, sehingga daftar tanpa kolom cabang menyajikan
   * beberapa "Budi · Petugas · Aktif" yang tidak bisa dibedakan satu sama lain.
   */
  app.get('/users', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req) => {
    const ctx = ctxOf(req);
    const q = req.query as { cabang?: string; cari?: string };
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select u.id, u.nama, u.email, u.role, u.active,
                u.tenant_id as "tenantId", t.nama as "cabang",
                u.created_at as "createdAt"
           from users u join tenants t on t.id = u.tenant_id
          where ($1::uuid is null or u.tenant_id = $1)
            and ($2::text is null
                 or lower(u.nama) like '%' || lower($2) || '%'
                 or lower(u.email) like '%' || lower($2) || '%')
          order by t.nama, u.role, u.nama`,
        [q.cabang ?? null, q.cari?.trim() || null],
      );
      return { users: rows };
    });
  });

  /**
   * Daftar rekan satu cabang, untuk dropdown "diukur oleh". Sengaja terpisah
   * dari GET /users: petugas perlu memilih siapa yang mengukur, tapi tidak
   * perlu — dan tidak boleh — melihat email atau status akun rekannya.
   */
  app.get('/rekan', { preHandler: requireAuth }, async (req) => {
    const ctx = ctxOf(req);
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select id, nama, role from users
          where active and tenant_id = $1 order by nama`,
        [ctx.tenantId],
      );
      return { rekan: rows };
    });
  });

  /**
   * Membuat akun. Koordinator untuk cabangnya sendiri; Admin Pusat boleh
   * menyebut cabang tujuan — tanpa itu cabang yang baru dibuka tidak akan
   * pernah punya koordinator pertama (lihat migrasi 007).
   */
  app.post('/users', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });
    const u = parsed.data;
    const ctx = ctxOf(req);

    if (!bolehBeriPeran(ctx.role, u.role)) {
      return reply.code(403).send({
        error: 'forbidden',
        message: 'Hanya Admin Pusat yang dapat mengangkat Admin Pusat.',
      });
    }
    const tenantId = tenantTujuan(ctx, u.tenantId);

    // Balasan dikirim setelah transaksi selesai — lihat catatan di db.ts:
    // commit terjadi setelah callback, jadi 201 dari dalam bisa mendahului
    // commit-nya, dan klien yang langsung memakai akun baru itu akan gagal.
    try {
      const hasil = await withTenant(ctx, async (tx) => {
        const { rows } = await tx.query(
          `insert into users (tenant_id, email, password_hash, nama, role)
           values ($1,$2,$3,$4,$5::user_role)
           returning id, nama, email, role, active, tenant_id as "tenantId"`,
          [tenantId, u.email, await hashPassword(u.password), u.nama, u.role],
        );
        // Cabang tujuan ikut dicatat: penulisan lintas cabang harus terbaca di
        // audit log tanpa perlu menelusuri id akunnya dulu.
        await audit(tx, ctx, 'user.create', 'user', rows[0]!.id, { role: u.role, tenantId });
        return rows[0];
      });
      return reply.code(201).send(hasil);
    } catch (err) {
      // Email unik SELURUH sistem, bukan per cabang. Koordinator yang memakai
      // email rekan yang sudah terdaftar di cabang lain tidak akan bisa
      // menebaknya dari "duplicate key" — dan tidak boleh diberi tahu di
      // cabang mana email itu terpakai.
      if ((err as { code?: string }).code === '23505') {
        return reply.code(409).send({
          error: 'sudah_ada',
          message: `Email ${u.email} sudah terdaftar. Satu email hanya untuk satu akun.`,
        });
      }
      throw err;
    }
  });

  app.patch('/users/:id', { preHandler: requireRole('koordinator', 'admin_pusat') }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({
      active: z.boolean().optional(),
      role: z.enum(['petugas', 'koordinator', 'admin_pusat']).optional(),
      nama: z.string().min(1).max(120).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const ctx = ctxOf(req);
    if (id === ctx.userId && parsed.data.active === false) {
      return reply.code(400).send({ error: 'bad_request', message: 'Tidak bisa menonaktifkan akun sendiri.' });
    }
    if (parsed.data.role && !bolehBeriPeran(ctx.role, parsed.data.role)) {
      return reply.code(403).send({
        error: 'forbidden',
        message: 'Hanya Admin Pusat yang dapat mengangkat Admin Pusat.',
      });
    }
    /**
     * Peran sendiri tidak boleh diubah sendiri.
     *
     * Bukan sekadar mencegah kekeliruan: karena hanya Admin Pusat yang bisa
     * mengangkat Admin Pusat, seorang Admin Pusat yang menurunkan perannya
     * sendiri tidak punya jalan untuk menaikkannya kembali. Bila ia yang
     * terakhir, jabatan itu lenyap dari sistem dan hanya bisa dipulihkan lewat
     * CLI di server. Aturan ini menjamin selalu tersisa minimal satu.
     */
    if (id === ctx.userId && parsed.data.role && parsed.data.role !== ctx.role) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Tidak bisa mengubah peran akun sendiri. Minta rekan dengan peran setara melakukannya.',
      });
    }

    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query(
        `update users
            set active = coalesce($2, active),
                role = coalesce($3::user_role, role),
                nama = coalesce($4, nama),
                updated_at = now()
          where id = $1
          returning id, nama, email, role, active, tenant_id as "tenantId"`,
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
   * Menyetel ulang kata sandi orang lain.
   *
   * Ada karena tidak ada surel di sistem ini: tidak ada tautan "lupa sandi"
   * yang bisa dikirim, jadi satu-satunya pemulihan sebelumnya adalah membuat
   * akun baru dan meninggalkan yang lama menggantung.
   *
   * Sandinya DIBANGKITKAN server, bukan diketik koordinator. Sandi yang diketik
   * di kolom akan menjadi sandi yang sama untuk semua orang di cabang itu —
   * itulah yang selalu terjadi. Hasilnya dikembalikan satu kali dalam balasan
   * dan tidak disimpan di mana pun, termasuk tidak di audit log.
   */
  app.post('/users/:id/reset-password', {
    preHandler: requireRole('koordinator', 'admin_pusat'),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ctx = ctxOf(req);

    // Sandi sendiri diganti lewat Pengaturan, yang menuntut sandi lama. Rute
    // ini sengaja tidak menjadi jalan pintas yang melewati tuntutan itu.
    if (id === ctx.userId) {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'Ganti kata sandi sendiri lewat Pengaturan → Akun.',
      });
    }

    const sandi = sandiAcak();
    return withTenant(ctx, async (tx) => {
      const { rows } = await tx.query<{ nama: string }>(
        'update users set password_hash = $2, updated_at = now() where id = $1 returning nama',
        [id, await hashPassword(sandi)],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      // Semua sesinya dicabut tanpa wipe: perangkatnya tidak dicurigai, hanya
      // sandinya yang berganti. Menghapus data lokal petugas yang lupa sandi
      // adalah hukuman yang tidak diminta siapa pun.
      const { rowCount } = await tx.query(
        `update device_sessions set revoked_at = now()
          where user_id = $1 and revoked_at is null`,
        [id],
      );
      // Sandinya TIDAK ikut dicatat. Audit log dibaca koordinator lain.
      await audit(tx, ctx, 'user.reset_password', 'user', id, { sesiDicabut: rowCount });
      return { ok: true, nama: rows[0].nama, password: sandi, sesiDicabut: rowCount };
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
