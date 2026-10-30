import type { PoolConfig } from 'pg';

/**
 * Opsi koneksi pg (connectionString + ssl) untuk sebuah URL Postgres.
 *
 * Tanpa TLS: localhost, jaringan internal Railway (`*.railway.internal`), dan
 * nama satu kata (service docker `postgres` di VPS) — tidak ada yang
 * menyediakan TLS. `sslmode=disable` di URL tetap dihormati.
 *
 * Host lain memakai TLS yang MEMVERIFIKASI sertifikat. Tanpa verifikasi siapa
 * pun di tengah jalan bisa menyamar jadi server dan menerima kata sandinya.
 * CA sendiri lewat DATABASE_CA_CERT (teks PEM).
 *
 * Proxy publik Railway (`*.proxy.rlwy.net`) memakai sertifikat self-signed,
 * jadi koneksi dari laptop ke sana butuh DATABASE_TLS_TANPA_VERIFIKASI=1 —
 * sengaja harus diketik, dan selalu meninggalkan peringatan di log.
 */
export function opsiPool(url: string, env: Record<string, string | undefined> = process.env): PoolConfig {
  const u = new URL(url);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const privat =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
    host.endsWith('.railway.internal') ||
    (host !== '' && !host.includes('.') && !host.includes(':'));
  if (privat || u.searchParams.get('sslmode') === 'disable') return { connectionString: url, ssl: false };

  // sslmode di URL menimpa opsi ssl di pg, jadi dibuang supaya aturan di sini yang berlaku.
  u.searchParams.delete('sslmode');
  const connectionString = u.toString();
  if (env.DATABASE_TLS_TANPA_VERIFIKASI === '1') {
    console.warn('[db] DATABASE_TLS_TANPA_VERIFIKASI=1: sertifikat server basis data TIDAK diverifikasi');
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
  return {
    connectionString,
    ssl: env.DATABASE_CA_CERT ? { rejectUnauthorized: true, ca: env.DATABASE_CA_CERT } : { rejectUnauthorized: true },
  };
}
