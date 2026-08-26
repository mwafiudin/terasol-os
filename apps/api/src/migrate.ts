import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { adminPool } from './db.js';
import { env } from './env.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
/** Kunci tetap: instance kedua menunggu, tidak menjalankan migrasi paralel. */
const LOCK_KEY = 8_142_733_901_552_117n;

export async function migrate(log: (msg: string) => void = console.log) {
  const client = await adminPool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [String(LOCK_KEY)]);
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name),
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(MIGRATIONS_DIR + file, 'utf8');
      log(`migrasi: menjalankan ${file}`);
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw new Error(`Migrasi ${file} gagal: ${(err as Error).message}`, { cause: err });
      }
    }

    await ensureAppRole(client, log);
    log(`migrasi: selesai (${files.length} berkas, ${files.length - applied.size} baru)`);
  } finally {
    await client.query('select pg_advisory_unlock($1)', [String(LOCK_KEY)]).catch(() => {});
    client.release();
  }
}

/**
 * Membuat/menyegarkan role aplikasi. Role ini sengaja bukan superuser dan
 * bukan pemilik tabel — kalau tidak, Postgres melewati Row Level Security
 * dan isolasi tenant hanya jadi janji di level aplikasi (§4.5.5).
 * Idempoten: dijalankan setiap boot agar tabel baru ikut ter-grant.
 */
async function ensureAppRole(client: import('pg').PoolClient, log: (m: string) => void) {
  const user = env.appDbUser;
  const pass = env.appDbPassword;

  const exists = await client.query('select 1 from pg_roles where rolname = $1', [user]);
  // DDL tidak menerima parameter, jadi SQL-nya dirangkai server-side dengan
  // format() agar identifier dan literal ter-escape dengan benar.
  const verb = exists.rowCount ? 'alter' : 'create';
  const { rows } = await client.query<{ sql: string }>(
    `select format('${verb} role %I with login password %L nosuperuser nocreatedb nocreaterole noinherit nobypassrls', $1::text, $2::text) as sql`,
    [user, pass],
  );
  await client.query(rows[0]!.sql);

  const { rows: grants } = await client.query<{ sql: string }>(
    `select unnest(array[
       format('grant usage on schema public to %I', $1::text),
       format('grant select, insert, update, delete on all tables in schema public to %I', $1::text),
       format('grant usage, select on all sequences in schema public to %I', $1::text),
       format('grant execute on all functions in schema public to %I', $1::text),
       format('alter default privileges in schema public grant select, insert, update, delete on tables to %I', $1::text),
       format('alter default privileges in schema public grant usage, select on sequences to %I', $1::text)
     ]) as sql`,
    [user],
  );
  for (const g of grants) await client.query(g.sql);

  // schema_migrations hanya urusan runner — aplikasi tidak perlu menyentuhnya.
  await client.query(
    (await client.query<{ sql: string }>(
      `select format('revoke all on table schema_migrations from %I', $1::text) as sql`, [user],
    )).rows[0]!.sql,
  );

  log(`migrasi: role aplikasi '${user}' siap (${verb})`);
}
