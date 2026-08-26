/**
 * Purge retensi data peserta (§4.5, keputusan D5).
 *
 * Durasi retensi server BELUM diputuskan dan menunggu verifikasi hukum, jadi
 * skrip ini sengaja menolak berjalan tanpa RETENTION_DAYS yang eksplisit —
 * lebih baik gagal berisik daripada diam-diam memakai angka karangan pada
 * data kesehatan.
 *
 *   RETENTION_DAYS=365 npm run purge -- --dry-run
 *   RETENTION_DAYS=365 npm run purge
 */
import { closePools, withoutTenant } from './db.js';

const DRY = process.argv.includes('--dry-run');
const days = Number(process.env.RETENTION_DAYS);

if (!Number.isFinite(days) || days <= 0) {
  console.error(
    'RETENTION_DAYS belum disetel. Durasi retensi data peserta adalah keputusan\n' +
    'terbuka (PRD D5) yang perlu verifikasi hukum — setel eksplisit sebelum purge.\n' +
    'Contoh: RETENTION_DAYS=365 npm run purge -- --dry-run',
  );
  process.exit(2);
}

await withoutTenant(async (tx) => {
  // Consent hanya boleh terhapus lewat purge resmi (migrasi 002).
  await tx.query(`select set_config('app.purge','on',true)`);

  const { rows: preview } = await tx.query<{ tenant: string; jumlah: number }>(
    `select t.nama as tenant, count(*)::int as jumlah
       from participants p join tenants t on t.id = p.tenant_id
      where p.created_at < now() - ($1 || ' days')::interval
      group by t.nama order by t.nama`,
    [String(days)],
  );
  const total = preview.reduce((a, r) => a + r.jumlah, 0);

  console.log(`Retensi ${days} hari — peserta yang melewati batas: ${total}`);
  for (const r of preview) console.log(`  ${r.tenant}: ${r.jumlah}`);

  if (DRY) { console.log('(dry-run — tidak ada yang dihapus)'); return; }
  if (!total) { console.log('Tidak ada yang perlu dihapus.'); return; }

  // Cascade menghapus consents, screenings, dan conversions milik peserta.
  const { rowCount } = await tx.query(
    `delete from participants where created_at < now() - ($1 || ' days')::interval`,
    [String(days)],
  );
  await tx.query(
    `insert into audit_log (tenant_id, actor_role, action, entity, meta)
     values (null, null, 'retention.purge', 'participant', $1)`,
    [JSON.stringify({ retensiHari: days, dihapus: rowCount })],
  );
  console.log(`Selesai — ${rowCount} peserta dihapus permanen.`);
});

await closePools();
process.exit(0);
