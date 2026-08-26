/**
 * Uji hashing kata sandi. Ada karena parameter scrypt pernah melewati batas
 * memori default Node — kegagalan yang hanya muncul saat benar-benar dipanggil,
 * bukan saat kompilasi.
 *
 *   npm run build && node --test test/password.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, verifyPassword } from '../dist/password.js';

describe('hashing kata sandi', () => {
  it('menghasilkan hash yang bisa diverifikasi', async () => {
    const hash = await hashPassword('kata-sandi-rahasia');
    assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$/);
    assert.equal(await verifyPassword('kata-sandi-rahasia', hash), true);
  });

  it('menolak kata sandi yang salah', async () => {
    const hash = await hashPassword('benar');
    assert.equal(await verifyPassword('salah', hash), false);
  });

  it('salt berbeda tiap kali, jadi dua hash tidak pernah sama', async () => {
    const a = await hashPassword('sama');
    const b = await hashPassword('sama');
    assert.notEqual(a, b);
    assert.equal(await verifyPassword('sama', a), true);
    assert.equal(await verifyPassword('sama', b), true);
  });

  it('hash rusak ditolak tanpa melempar error', async () => {
    for (const bad of ['', 'bukan-hash', 'scrypt$1$2$3', 'scrypt$x$y$z$AAAA$AAAA']) {
      assert.equal(await verifyPassword('apa saja', bad), false, `harus false untuk: ${bad}`);
    }
  });
});
