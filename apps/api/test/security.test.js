/**
 * Uji keamanan basis data. Menjalankan query sungguhan sebagai role aplikasi
 * (terasol_app) untuk membuktikan Row Level Security benar-benar mengunci
 * data antar-tenant — bukan sekadar difilter di kode aplikasi (§4.5.5).
 *
 *   node --env-file=.env --test test/
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';

const { Pool } = pg;
const adminUrl = process.env.DATABASE_URL;
const appUrl = (() => {
  const u = new URL(adminUrl);
  u.username = process.env.APP_DB_USER ?? 'terasol_app';
  u.password = process.env.APP_DB_PASSWORD;
  return u.toString();
})();

const admin = new Pool({ connectionString: adminUrl, max: 2 });
const app = new Pool({ connectionString: appUrl, max: 4 });

/** Menjalankan query sebagai role aplikasi dengan konteks tenant tersetel. */
async function asTenant(tenantId, role, fn) {
  const c = await app.connect();
  try {
    await c.query('begin');
    await c.query('select set_config($1,$2,true), set_config($3,$4,true), set_config($5,$6,true)', [
      'app.tenant_id', tenantId, 'app.role', role, 'app.user_id', '00000000-0000-0000-0000-000000000000',
    ]);
    return await fn(c);
  } finally {
    await c.query('rollback').catch(() => {});
    c.release();
  }
}

let tenantA, tenantB, eventA, eventB, participantA;

before(async () => {
  const mk = async (nama) =>
    (await admin.query('insert into tenants (nama) values ($1) returning id', [nama])).rows[0].id;
  tenantA = await mk('__uji_tenant_A');
  tenantB = await mk('__uji_tenant_B');

  const mkEvent = async (tenantId, nama) =>
    (await admin.query(
      `insert into events (tenant_id, client_id, nama, lokasi, tanggal, tipe)
       values ($1, gen_random_uuid(), $2, 'Uji', current_date, 'gratis') returning id`,
      [tenantId, nama],
    )).rows[0].id;
  eventA = await mkEvent(tenantA, '__uji_event_A');
  eventB = await mkEvent(tenantB, '__uji_event_B');

  const mkParticipant = async (tenantId, eventId, nama, hp) =>
    (await admin.query(
      `insert into participants (tenant_id, event_id, client_id, nama, gender, usia, hp)
       values ($1,$2,gen_random_uuid(),$3,'P',60,$4) returning id`,
      [tenantId, eventId, nama, hp],
    )).rows[0].id;
  participantA = await mkParticipant(tenantA, eventA, '__uji_peserta_A', '081100000001');
  await mkParticipant(tenantB, eventB, '__uji_peserta_B', '081100000002');
});

after(async () => {
  // Pembersihan menghapus consent lewat cascade, jadi transaksinya harus
  // menyatakan diri sebagai purge resmi (lihat migrasi 002).
  const c = await admin.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('app.purge','on',true)`);
    for (const t of [tenantA, tenantB]) {
      if (t) await c.query('delete from tenants where id = $1', [t]);
    }
    await c.query('commit');
  } catch (err) {
    await c.query('rollback').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
  await Promise.allSettled([admin.end(), app.end()]);
});

describe('Row Level Security', () => {
  it('role aplikasi bukan superuser dan tidak boleh melewati RLS', async () => {
    const { rows } = await admin.query(
      'select rolsuper, rolbypassrls from pg_roles where rolname = $1',
      [process.env.APP_DB_USER ?? 'terasol_app'],
    );
    assert.equal(rows[0].rolsuper, false, 'role aplikasi tidak boleh superuser');
    assert.equal(rows[0].rolbypassrls, false, 'role aplikasi tidak boleh bypassrls');
  });

  it('petugas hanya melihat event tenant-nya sendiri', async () => {
    const rows = await asTenant(tenantA, 'petugas', async (c) =>
      (await c.query('select id, nama from events where nama like $1', ['__uji_event_%'])).rows);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, eventA);
  });

  it('peserta tenant lain tidak terlihat sama sekali', async () => {
    const rows = await asTenant(tenantA, 'koordinator', async (c) =>
      (await c.query('select id from participants where nama like $1', ['__uji_peserta_%'])).rows);
    assert.equal(rows.length, 1, 'hanya peserta tenant sendiri yang boleh muncul');
  });

  it('menyebut id peserta tenant lain secara langsung tetap kosong', async () => {
    const rows = await asTenant(tenantB, 'koordinator', async (c) =>
      (await c.query('select id from participants where id = $1', [participantA])).rows);
    assert.equal(rows.length, 0, 'RLS harus menutup akses walau id-nya diketahui');
  });

  it('tidak bisa menulis ke tenant lain meski tenant_id dipalsukan', async () => {
    await assert.rejects(
      () => asTenant(tenantA, 'koordinator', (c) => c.query(
        `insert into participants (tenant_id, event_id, client_id, nama, gender, usia, hp)
         values ($1,$2,gen_random_uuid(),'__uji_selundupan','P',60,'081100000003')`,
        [tenantB, eventB],
      )),
      /row-level security/i,
    );
  });

  it('update lintas tenant tidak mengubah apa pun', async () => {
    const n = await asTenant(tenantB, 'koordinator', async (c) =>
      (await c.query('update participants set nama = $1 where id = $2', ['diretas', participantA])).rowCount);
    assert.equal(n, 0);
    const { rows } = await admin.query('select nama from participants where id = $1', [participantA]);
    assert.equal(rows[0].nama, '__uji_peserta_A');
  });

  it('admin_pusat boleh membaca lintas cabang (D6) tetapi tidak menulis', async () => {
    const rows = await asTenant(tenantA, 'admin_pusat', async (c) =>
      (await c.query('select id from participants where tenant_id = any($1::uuid[])',
        [[tenantA, tenantB]])).rows);
    assert.equal(rows.length, 2, 'admin pusat melihat kedua cabang');

    await assert.rejects(
      () => asTenant(tenantA, 'admin_pusat', (c) => c.query(
        `insert into participants (tenant_id, event_id, client_id, nama, gender, usia, hp)
         values ($1,$2,gen_random_uuid(),'__uji_admin_tulis','P',60,'081100000004')`,
        [tenantB, eventB],
      )),
      /row-level security/i,
    );
  });

  it('tanpa konteks tenant, tidak ada data yang bocor', async () => {
    const c = await app.connect();
    try {
      const { rows } = await c.query('select id from participants limit 5');
      assert.equal(rows.length, 0, 'query tanpa app.tenant_id harus kosong');
    } finally {
      c.release();
    }
  });
});

describe('Aturan domain ditegakkan basis data', () => {
  it('IMT dihitung otomatis dari tinggi dan berat', async () => {
    const { rows } = await admin.query(
      `insert into screenings (tenant_id, participant_id, client_id, tinggi, berat, params_diambil)
       values ($1,$2,gen_random_uuid(),156,61,array['tinggi','berat']) returning imt`,
      [tenantA, participantA],
    );
    assert.equal(Number(rows[0].imt), 25.1); // 61 / 1.56^2
  });

  it('IMT tidak bisa diisi manual', async () => {
    await assert.rejects(
      () => admin.query('update screenings set imt = 99 where participant_id = $1', [participantA]),
      /can only be updated to DEFAULT/i,
    );
  });

  it('status membeli wajib menyertakan nilai transaksi dan produk', async () => {
    await assert.rejects(
      () => admin.query(
        `insert into conversions (tenant_id, participant_id, berminat, status)
         values ($1,$2,true,'membeli')`,
        [tenantA, participantA],
      ),
      /conversions_membeli_needs_detail/,
    );
    await admin.query(
      `insert into conversions (tenant_id, participant_id, berminat, status, nilai_transaksi, produk)
       values ($1,$2,true,'membeli',1400000,'Paket herbal sendi')`,
      [tenantA, participantA],
    );
  });

  it('consent bersifat immutable — tidak bisa diubah atau dihapus', async () => {
    await admin.query(
      `insert into consents (tenant_id, participant_id, granted, versi_teks)
       values ($1,$2,true,'v1')`,
      [tenantA, participantA],
    );
    await assert.rejects(
      () => admin.query('update consents set granted = false where participant_id = $1', [participantA]),
      /immutable/i,
    );
    await assert.rejects(
      () => admin.query('delete from consents where participant_id = $1', [participantA]),
      /purge resmi/i,
      'penghapusan biasa harus ditolak',
    );
  });

  it('consent boleh dihapus hanya lewat purge resmi (§4.5.7, retensi)', async () => {
    const c = await admin.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('app.purge','on',true)`);
      const { rowCount } = await c.query('delete from consents where participant_id = $1', [participantA]);
      assert.ok(rowCount > 0, 'purge resmi harus bisa menghapus');
      await c.query('rollback'); // jangan ubah data uji berikutnya
    } finally {
      c.release();
    }
  });

  it('event berbayar wajib punya harga paket', async () => {
    await assert.rejects(
      () => admin.query(
        `insert into events (tenant_id, client_id, nama, lokasi, tanggal, tipe, harga_paket)
         values ($1,gen_random_uuid(),'__uji_berbayar','Uji',current_date,'berbayar',0)`,
        [tenantA],
      ),
      /events_berbayar_needs_harga/,
    );
  });

  it('nomor HP kembar dalam satu event tetap tersimpan (dedup ditinjau manual)', async () => {
    // §4.3: server tidak menimpa; kedua record hidup, satu ditandai needs_review.
    await admin.query(
      `insert into participants (tenant_id, event_id, client_id, nama, gender, usia, hp, needs_review)
       values ($1,$2,gen_random_uuid(),'__uji_peserta_A2','P',60,'081100000001',true)`,
      [tenantA, eventA],
    );
    const { rows } = await admin.query(
      'select count(*)::int as n from participants where event_id = $1 and hp = $2',
      [eventA, '081100000001'],
    );
    assert.equal(rows[0].n, 2);
  });
});
