/**
 * Enkripsi data peserta di perangkat (§4.5.1).
 *
 * Kunci AES-GCM diturunkan dari PIN petugas lewat PBKDF2 dan hanya hidup di
 * memori — tidak pernah ditulis ke disk. Menutup aplikasi atau auto-lock
 * membuat data lokal kembali jadi ciphertext.
 *
 * Batasannya jujur (PRD R2): browser tidak punya secure hardware keystore, dan
 * PIN 6 digit hanya punya 10^6 kemungkinan. PBKDF2 memperlambat tebakan, tetapi
 * pertahanan yang sebenarnya adalah purge agresif setelah sync — data yang
 * sudah sampai server tidak lagi tersimpan di perangkat.
 */

const PBKDF2_ITERATIONS = 310_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export type Envelope = { iv: Uint8Array; ct: ArrayBuffer };

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,                       // non-extractable: kunci tidak bisa dibaca keluar
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<Envelope> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(value)),
  );
  return { iv, ct };
}

export async function decryptJson<T>(key: CryptoKey, env: Envelope): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: env.iv as BufferSource }, key, env.ct,
  );
  return JSON.parse(dec.decode(plain)) as T;
}

/**
 * Penanda untuk memverifikasi PIN saat unlock. Isinya bukan rahasia — yang
 * membuktikan PIN benar adalah berhasilnya dekripsi AES-GCM (autentikasi tag).
 */
const VERIFIER_PLAINTEXT = 'terasol-os-pin-v1';

export async function makeVerifier(key: CryptoKey): Promise<Envelope> {
  return encryptJson(key, VERIFIER_PLAINTEXT);
}

export async function checkVerifier(key: CryptoKey, env: Envelope): Promise<boolean> {
  try {
    return (await decryptJson<string>(key, env)) === VERIFIER_PLAINTEXT;
  } catch {
    return false; // tag AES-GCM gagal → PIN salah
  }
}
