import Dexie, { type Table } from 'dexie';
import { decryptJson, encryptJson, type Envelope } from './crypto';
import type {
  AnonTallyRow, EventRow, ParticipantRow, ParticipantSecret, ParticipantView,
} from './types';

export type MetaRow = { key: string; value: unknown };

class TerasolDb extends Dexie {
  meta!: Table<MetaRow, string>;
  events!: Table<EventRow, string>;
  participants!: Table<ParticipantRow, string>;
  anonTallies!: Table<AnonTallyRow, string>;

  constructor() {
    super('terasol-os');
    this.version(1).stores({
      meta: 'key',
      events: 'clientId, status, tanggal, synced',
      participants: 'clientId, eventClientId, synced, needsReview, createdAt',
      anonTallies: 'clientId, eventClientId, synced',
    });
  }
}

export const db = new TerasolDb();

/* ------------------------------- meta ------------------------------- */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Id perangkat, dibuat sekali dan dipakai untuk autentikasi per device (§4.4). */
export async function deviceId(): Promise<string> {
  let id = await getMeta<string>('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    await setMeta('deviceId', id);
  }
  return id;
}

/* ---------------------------- participants ---------------------------- */

export async function putParticipant(
  key: CryptoKey,
  row: Omit<ParticipantRow, 'iv' | 'ct' | 'purgedAt'>,
  secret: ParticipantSecret,
): Promise<void> {
  const env = await encryptJson(key, secret);
  await db.participants.put({ ...row, iv: env.iv, ct: env.ct, purgedAt: null });
}

export async function readParticipant(
  key: CryptoKey | null,
  row: ParticipantRow,
): Promise<ParticipantView> {
  if (!key || !row.iv || !row.ct) return { ...row, secret: null };
  try {
    const secret = await decryptJson<ParticipantSecret>(key, { iv: row.iv, ct: row.ct } as Envelope);
    return { ...row, secret };
  } catch {
    // Ciphertext tidak cocok dengan kunci — jangan menebak, tampilkan apa adanya.
    return { ...row, secret: null };
  }
}

export async function readParticipants(
  key: CryptoKey | null,
  rows: ParticipantRow[],
): Promise<ParticipantView[]> {
  return Promise.all(rows.map((r) => readParticipant(key, r)));
}

/* ------------------------------- purge ------------------------------- */

/**
 * Retensi data sensitif di perangkat. Angka ini PROVISIONAL — durasi retensi
 * lokal adalah keputusan terbuka (PRD D4) yang menunggu verifikasi hukum.
 * Ditampilkan di layar Pengaturan supaya tidak jadi asumsi tersembunyi.
 */
export const LOCAL_RETENTION_HOURS = 24;

/**
 * Menghapus identitas dan hasil pengukuran dari perangkat setelah server
 * mengonfirmasi penerimaan (US-05) dan masa retensi lokal lewat. Barisnya
 * ditinggalkan tanpa ciphertext agar hitungan di Beranda tetap benar.
 */
export async function purgeSynced(retentionHours = LOCAL_RETENTION_HOURS): Promise<number> {
  const cutoff = new Date(Date.now() - retentionHours * 3_600_000).toISOString();
  const stale = await db.participants.where('synced').equals(1).toArray();
  const target = stale.filter((p) => p.ct !== null && p.updatedAt < cutoff);
  if (!target.length) return 0;
  await db.participants.bulkPut(
    target.map((p) => ({ ...p, iv: null, ct: null, purgedAt: new Date().toISOString() })),
  );
  return target.length;
}

/** Remote wipe (§4.5.4) — semua jejak lokal hilang, termasuk sesi. */
export async function wipeAll(): Promise<void> {
  await db.delete();
  localStorage.clear();
  sessionStorage.clear();
}

/* ------------------------------- antrean ------------------------------- */

export async function pendingCount(): Promise<number> {
  const [e, p, a] = await Promise.all([
    db.events.where('synced').equals(0).count(),
    db.participants.where('synced').equals(0).count(),
    db.anonTallies.where('synced').equals(0).count(),
  ]);
  return e + p + a;
}
