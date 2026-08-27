import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Postgres mengembalikan numeric sebagai string agar presisi tidak hilang.
// Kolom numerik kita (tinggi, berat, imt, asam_urat) aman di float64.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// int8 (bigint) — nilai transaksi rupiah, jauh di bawah MAX_SAFE_INTEGER.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

function sslFor(url: string) {
  const host = new URL(url).hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.railway.internal');
  return isLocal ? undefined : { rejectUnauthorized: false };
}

/** Ganti kredensial pada DATABASE_URL menjadi role aplikasi (non-superuser). */
function appUrl(): string {
  const u = new URL(env.databaseUrl);
  u.username = env.appDbUser;
  u.password = env.appDbPassword;
  return u.toString();
}

/** Superuser — hanya untuk migrasi dan pembuatan role. Jangan dipakai request. */
export const adminPool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslFor(env.databaseUrl),
  max: 2,
});

/** Role aplikasi — semua request lewat sini, sehingga RLS selalu berlaku. */
export const appPool = new Pool({
  connectionString: appUrl(),
  ssl: sslFor(env.databaseUrl),
  max: 10,
  idleTimeoutMillis: 30_000,
});

export type RequestContext = {
  tenantId: string;
  userId: string;
  role: 'petugas' | 'koordinator' | 'admin_pusat';
};

export type Tx = pg.PoolClient;

/**
 * Menjalankan fn di dalam satu transaksi dengan konteks tenant tersetel.
 * SET LOCAL membuat konteks otomatis hilang saat transaksi selesai, jadi
 * koneksi yang kembali ke pool tidak pernah membawa tenant sebelumnya.
 */
/**
 * Menjalankan `fn` dalam satu transaksi dengan konteks tenant tersetel.
 *
 * JANGAN memanggil `reply.send()` di dalam `fn`. `commit` baru dijalankan
 * setelah `fn` selesai, sehingga balasan yang dikirim dari dalam mendahului
 * commit-nya sendiri: klien menerima 201, langsung meminta baris itu lewat
 * koneksi lain, dan mendapat 404 karena transaksinya belum mendarat. Kembalikan
 * datanya, lalu kirim balasan setelah `withTenant` selesai.
 */
export async function withTenant<T>(ctx: RequestContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query('begin');
    await client.query(
      'select set_config($1,$2,true), set_config($3,$4,true), set_config($5,$6,true)',
      ['app.tenant_id', ctx.tenantId, 'app.role', ctx.role, 'app.user_id', ctx.userId],
    );
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Transaksi tanpa konteks tenant — untuk login dan refresh, yang harus
 * menemukan user sebelum tenant-nya diketahui. Query di dalamnya wajib
 * menyaring sendiri secara eksplisit.
 */
export async function withoutTenant<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await adminPool.connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function audit(
  tx: Tx,
  ctx: RequestContext,
  action: string,
  entity?: string,
  entityId?: string | null,
  meta?: unknown,
) {
  await tx.query(
    `insert into audit_log (tenant_id, actor_user_id, actor_role, action, entity, entity_id, meta)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [ctx.tenantId, ctx.userId, ctx.role, action, entity ?? null, entityId ?? null,
     meta === undefined ? null : JSON.stringify(meta)],
  );
}

/**
 * §4.5.8 — mencatat SETIAP akses Admin Pusat ke data peserta cabang.
 *
 * Yang dicatat adalah pembacaan, bukan hanya perubahan. Kewajiban di PRD
 * menyangkut *akses*, dan membuka daftar peserta identifiable milik cabang lain
 * justru peristiwa yang paling perlu bisa ditelusuri. Peran lain tidak dicatat
 * di sini: RLS sudah membatasi mereka pada cabangnya sendiri, jadi mencatatnya
 * hanya akan menenggelamkan jejak yang penting dalam derau.
 */
export async function auditAdminRead(
  tx: Tx,
  ctx: RequestContext,
  action: string,
  info: { jumlah: number; tenantIds: (string | null)[]; [k: string]: unknown },
) {
  if (ctx.role !== 'admin_pusat') return;
  const { tenantIds, ...rest } = info;
  const cabangLain = [...new Set(tenantIds.filter((t) => t && t !== ctx.tenantId))];
  await audit(tx, ctx, action, 'participant', null, {
    ...rest,
    cabangLain: cabangLain.length,
    lintasCabang: cabangLain.length > 0,
  });
}

export async function closePools() {
  await Promise.allSettled([appPool.end(), adminPool.end()]);
}
