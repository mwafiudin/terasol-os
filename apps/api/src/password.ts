import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

type ScryptOpts = { N: number; r: number; p: number; maxmem: number };
const scrypt = promisify(scryptCb) as (
  password: string, salt: Buffer, keylen: number, opts: ScryptOpts,
) => Promise<Buffer>;

// scrypt bawaan Node — tanpa dependensi native, jadi build di Railway tidak
// pernah gagal karena toolchain kompilasi.
// N=2^15 butuh ~128*N*r = 32 MiB, tepat di batas default Node. maxmem
// dinaikkan agar parameternya tidak perlu dilemahkan.
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const MAXMEM = 128 * PARAMS.N * PARAMS.r * 2; // 64 MiB
const KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, KEYLEN, { ...PARAMS, maxmem: MAXMEM });
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts as [string, string, string, string, string, string];
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  const N = Number(n), R = Number(r), P = Number(p);
  if (!Number.isFinite(N) || !Number.isFinite(R) || !Number.isFinite(P)) return false;
  // maxmem mengikuti parameter yang tersimpan, agar hash lama tetap terbaca
  // bila parameternya pernah dinaikkan.
  const actual = await scrypt(plain, salt, expected.length, {
    N, r: R, p: P, maxmem: Math.max(MAXMEM, 128 * N * R * 2),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
