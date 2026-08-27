import Dexie, { type Table } from 'dexie';
import { decryptJson, encryptJson, type Envelope } from './crypto';
import type {
  AnonTallyRow, CerminRow, CerminSecret, CerminView, EventRow,
  ParticipantRow, ParticipantSecret, ParticipantView,
  UkurAntreRow, UkurAntreSecret, UkurAntreView,
} from './types';

export type MetaRow = { key: string; value: unknown };

class TerasolDb extends Dexie {
  meta!: Table<MetaRow, string>;
  events!: Table<EventRow, string>;
  participants!: Table<ParticipantRow, string>;
  anonTallies!: Table<AnonTallyRow, string>;
  cermin!: Table<CerminRow, string>;
  ukurAntre!: Table<UkurAntreRow, string>;

  constructor() {
    super('terasol-os');
    this.version(1).stores({
      meta: 'key',
      events: 'clientId, status, tanggal, synced',
      participants: 'clientId, eventClientId, synced, needsReview, createdAt',
      anonTallies: 'clientId, eventClientId, synced',
    });
    // v2 — cermin peserta perangkat lain, dan antrean pengukuran offline.
    // Dexie mempertahankan tabel v1 apa adanya; tidak ada migrasi data.
    this.version(2).stores({
      cermin: 'clientId, eventClientId, diambilPada',
      ukurAntre: 'clientId, pelangganId, synced',
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

/* ---------------------------- cermin peserta ---------------------------- */

/**
 * Menyimpan salinan daftar peserta satu event dari server.
 *
 * Menggantikan seluruh isi cermin untuk event itu, bukan menambahkan: peserta
 * yang dihapus atau digabung di server harus ikut hilang dari salinan, dan
 * cermin yang hanya bertambah akan menampilkan orang yang sudah tidak ada.
 */
export async function tulisCermin(
  key: CryptoKey,
  eventClientId: string,
  isi: { row: Omit<CerminRow, 'iv' | 'ct'>; secret: CerminSecret }[],
): Promise<void> {
  const baris: CerminRow[] = [];
  for (const { row, secret } of isi) {
    const env = await encryptJson(key, secret);
    baris.push({ ...row, iv: env.iv, ct: env.ct });
  }
  await db.transaction('rw', db.cermin, async () => {
    const lama = await db.cermin.where('eventClientId').equals(eventClientId).primaryKeys();
    await db.cermin.bulkDelete(lama);
    await db.cermin.bulkPut(baris);
  });
}

export async function bacaCermin(
  key: CryptoKey | null,
  eventClientId: string,
): Promise<CerminView[]> {
  const baris = await db.cermin.where('eventClientId').equals(eventClientId).toArray();
  return Promise.all(baris.map(async (r) => {
    if (!key || !r.iv || !r.ct) return { ...r, secret: null };
    try {
      return { ...r, secret: await decryptJson<CerminSecret>(key, { iv: r.iv, ct: r.ct } as Envelope) };
    } catch {
      return { ...r, secret: null };
    }
  }));
}

/* -------------------------- antrean pengukuran -------------------------- */

export async function antreUkur(
  key: CryptoKey,
  row: Omit<UkurAntreRow, 'iv' | 'ct' | 'synced'>,
  secret: UkurAntreSecret,
): Promise<void> {
  const env = await encryptJson(key, secret);
  await db.ukurAntre.put({ ...row, synced: 0, iv: env.iv, ct: env.ct });
}

export async function bacaAntreUkur(
  key: CryptoKey | null,
  pelangganId?: string,
): Promise<UkurAntreView[]> {
  const baris = pelangganId
    ? await db.ukurAntre.where('pelangganId').equals(pelangganId).toArray()
    : await db.ukurAntre.where('synced').equals(0).toArray();
  return Promise.all(baris.map(async (r) => {
    if (!key || !r.iv || !r.ct) return { ...r, secret: null };
    try {
      return { ...r, secret: await decryptJson<UkurAntreSecret>(key, { iv: r.iv, ct: r.ct } as Envelope) };
    } catch {
      return { ...r, secret: null };
    }
  }));
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

  // Cermin ikut tunduk pada retensi yang sama — isinya identitas orang lain,
  // dan tidak ada alasan ia bertahan lebih lama daripada record sendiri.
  // Dihapus utuh, bukan disisakan cangkangnya: cermin adalah salinan, bukan
  // catatan, jadi tidak ada hitungan yang bergantung pada barisnya.
  const cerminBasi = await db.cermin.filter((c) => c.diambilPada < cutoff).primaryKeys();
  if (cerminBasi.length) await db.cermin.bulkDelete(cerminBasi);

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
  const [e, p, a, u] = await Promise.all([
    db.events.where('synced').equals(0).count(),
    db.participants.where('synced').equals(0).count(),
    db.anonTallies.where('synced').equals(0).count(),
    db.ukurAntre.where('synced').equals(0).count(),
  ]);
  return e + p + a + u;
}
