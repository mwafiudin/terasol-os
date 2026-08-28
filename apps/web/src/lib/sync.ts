import { api, ApiError, WipeRequired, type SyncParticipant, type SyncPushResult } from './api';
import { bacaAntreUkur, db, getMeta, purgeSynced, readParticipant, setMeta } from './db';
import { num } from './domain';
import type { JenisUkur, KonteksGula } from './rujukan';
import type { ParamKey, ParticipantRow } from './types';

/**
 * Batas antrean sebelum sync dipaksa (R1). Browser boleh mengevict IndexedDB
 * saat ruang menipis, jadi menumpuk record tanpa batas berarti menumpuk risiko
 * kehilangan data lapangan.
 *
 * Memaksa di sini berarti *memicu sync lebih agresif dan memperingatkan*,
 * bukan mengunci input: US-05 melarang kegagalan sync memblokir input baru,
 * dan petugas di lapangan sering justru sedang tanpa sinyal.
 */
export const MAX_UNSYNCED = 50;

export type SyncState = {
  running: boolean;
  pending: number;
  lastSyncAt: string | null;
  lastError: string | null;
  conflicts: number;
  /** Antrean sudah melewati MAX_UNSYNCED — tampilkan peringatan. */
  overQuota: boolean;
};

type Listener = (s: SyncState) => void;

const state: SyncState = {
  running: false, pending: 0, lastSyncAt: null, lastError: null, conflicts: 0, overQuota: false,
};
const listeners = new Set<Listener>();

export function subscribeSync(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}
function emit(patch: Partial<SyncState>) {
  Object.assign(state, patch);
  listeners.forEach((l) => l(state));
}

/** Diisi startAutoSync agar antrean yang menumpuk bisa memicu sync sendiri. */
let forceSync: (() => void) | null = null;

export async function refreshPending() {
  const [e, p, a, u] = await Promise.all([
    db.events.where('synced').equals(0).count(),
    db.participants.where('synced').equals(0).count(),
    db.anonTallies.where('synced').equals(0).count(),
    db.ukurAntre.where('synced').equals(0).count(),
  ]);
  const pending = e + p + a + u;
  const overQuota = pending >= MAX_UNSYNCED;
  const naikJadiOverQuota = overQuota && !state.overQuota;
  emit({ pending, overQuota });

  // Begitu ambang terlampaui, jangan menunggu siklus 60 detik berikutnya.
  if (naikJadiOverQuota && isOnline()) forceSync?.();
}

/** Simulasi offline untuk uji lapangan; jaringan sungguhan tetap dihormati. */
let simulatedOffline = false;
export function setSimulatedOffline(v: boolean) { simulatedOffline = v; }
export function isSimulatedOffline() { return simulatedOffline; }
export function isOnline() { return navigator.onLine && !simulatedOffline; }

function toNumberValues(values: Partial<Record<ParamKey, string>>) {
  return {
    tinggi: num(values.tinggi), berat: num(values.berat),
    lingkarPerut: num(values.lingkar_perut),
    sistolik: num(values.sistolik), diastolik: num(values.diastolik),
    nadi: num(values.nadi),
    gula: num(values.gula), kolesterol: num(values.kolesterol),
    asamUrat: num(values.asam_urat),
  };
}

async function buildParticipantPayload(
  key: CryptoKey, row: ParticipantRow,
): Promise<SyncParticipant | null> {
  const view = await readParticipant(key, row);
  // Baris yang sudah di-purge tidak punya identitas lagi — tidak bisa (dan
  // tidak perlu) dikirim ulang.
  if (!view.secret) return null;
  const s = view.secret;
  const sc = s.screening;
  const taken = sc
    ? (Object.keys(sc.values) as ParamKey[]).filter((k) => (sc.values[k] ?? '') !== '')
    : [];

  return {
    clientId: row.clientId,
    eventClientId: row.eventClientId,
    nama: s.nama,
    gender: s.gender,
    usia: Number(s.usia) || 0,
    hp: s.hp,
    updatedAt: row.updatedAt,
    consent: s.consent,
    screening: sc
      ? {
        clientId: sc.clientId, ...toNumberValues(sc.values),
        konteksGula: sc.konteksGula ?? null,
        paramsDiambil: taken, outOfRange: sc.outOfRange,
        diLuarWajar: sc.diLuarWajar ?? [],
        measuredAt: sc.measuredAt,
      }
      : null,
    conversion: row.convStatus
      ? {
        berminat: row.berminat === 1, status: row.convStatus,
        nilaiTransaksi: row.nilaiTransaksi, produk: row.produk, updatedAt: row.updatedAt,
      }
      : row.berminat
        ? { berminat: true, status: 'baru', nilaiTransaksi: 0, produk: null, updatedAt: row.updatedAt }
        : null,
  };
}

/**
 * Mengirim pengukuran yang dicatat saat offline.
 *
 * Terpisah dari `/sync/push` karena bentuknya memang berbeda: push mengirim
 * peserta beserta screening-nya sebagai satu kesatuan, sedangkan ini pengukuran
 * lepas atas pelanggan yang sudah ada — persis yang terjadi di event
 * berstasiun, ketika yang mendaftarkan dan yang mengukur bukan orang yang sama.
 *
 * Aman diulang: `clientId` tiap baris tetap, dan server melakukan upsert pada
 * `(tenant_id, client_id)`. Yang gagal ditinggalkan di antrean, tidak dibuang.
 */
async function kirimAntreUkur(key: CryptoKey): Promise<number> {
  const antre = (await bacaAntreUkur(key)).filter((u) => u.synced === 0);
  if (!antre.length) return 0;

  let terkirim = 0;
  for (const u of antre) {
    // Tanpa kunci yang cocok nilainya tidak terbaca. Membuangnya berarti
    // menghilangkan pengukuran diam-diam, jadi ia ditinggalkan di antrean.
    if (!u.secret) continue;
    try {
      await api.createPengukuran({
        pelangganId: u.pelangganId,
        participantId: u.participantId,
        clientId: u.clientId,
        jenis: u.jenis as JenisUkur,
        konteks: (u.secret.konteks as KonteksGula | null) ?? null,
        nilai: u.secret.nilai,
        // Waktu ukur sungguhan, bukan waktu unggah — grafik tren dan
        // perbandingan antar kunjungan bergantung padanya.
        diukurPada: u.diukurPada,
        outOfRange: u.secret.outOfRange,
        catatan: u.secret.catatan,
      });
      await db.ukurAntre.update(u.clientId, { synced: 1 });
      terkirim += 1;
    } catch { /* biarkan di antrean; dicoba lagi siklus berikutnya */ }
  }
  // Yang sudah diterima server tidak perlu disimpan lagi di perangkat.
  const selesai = await db.ukurAntre.where('synced').equals(1).primaryKeys();
  await db.ukurAntre.bulkDelete(selesai);
  return terkirim;
}

/**
 * Push inkremental. Aman diulang: batchId disimpan sampai server mengonfirmasi,
 * jadi percobaan ulang setelah sinyal putus tidak pernah menggandakan data.
 * Kegagalan tidak menghapus apa pun dan tidak memblokir input baru (US-05).
 */
export async function syncNow(key: CryptoKey | null, opts: { silent?: boolean } = {}): Promise<SyncPushResult | null> {
  if (state.running) return null;
  if (!isOnline()) {
    if (!opts.silent) emit({ lastError: 'Tidak ada koneksi. Data menunggu di antrean sync.' });
    return null;
  }
  if (!key) {
    if (!opts.silent) emit({ lastError: 'Buka kunci dengan PIN dulu supaya data bisa dibaca untuk sync.' });
    return null;
  }

  const [events, participants, tallies, ukurTertunda] = await Promise.all([
    db.events.where('synced').equals(0).toArray(),
    db.participants.where('synced').equals(0).toArray(),
    db.anonTallies.where('synced').equals(0).toArray(),
    db.ukurAntre.where('synced').equals(0).count(),
  ]);

  // Dikirim lebih dulu dan di luar cabang "tidak ada yang dikirim" di bawah.
  // Petugas stasiun kedua sering TIDAK punya peserta sendiri — antrean
  // pengukuran adalah satu-satunya isinya, dan cabang itu akan pulang lebih
  // awal sebelum sempat mengirimnya.
  if (ukurTertunda > 0) {
    try { await kirimAntreUkur(key); } catch { /* dilaporkan lewat pending */ }
  }

  if (!events.length && !participants.length && !tallies.length) {
    // `lastSyncAt` TIDAK disentuh di sini. Tidak ada yang dikirim, jadi jawaban
    // atas "kapan data ini terakhir sampai ke server" tidak berubah. Baris ini
    // dulu mengarang `new Date()` saat nilainya belum ada — perangkat yang
    // belum pernah mengirim apa pun mengaku baru saja tersinkron. Selama waktu
    // itu tidak ditampilkan, kebohongannya tidak terlihat; begitu ditampilkan,
    // ia menjadi janji palsu tentang data yang mungkin belum tersimpan.
    emit({ lastError: null });
    await purgeSynced();
    await refreshPending();
    return null;
  }

  emit({ running: true, lastError: null });
  try {
    // batchId bertahan lintas percobaan — inilah kunci idempotensi di server.
    let batchId = await getMeta<string>('pendingBatchId');
    if (!batchId) {
      batchId = crypto.randomUUID();
      await setMeta('pendingBatchId', batchId);
    }

    const payloadParticipants: SyncParticipant[] = [];
    for (const row of participants) {
      const p = await buildParticipantPayload(key, row);
      if (p) payloadParticipants.push(p);
    }

    const result = await api.syncPush({
      batchId,
      events: events.map((e) => ({
        clientId: e.clientId, nama: e.nama, lokasi: e.lokasi, tanggal: e.tanggal,
        tipe: e.tipe, hargaPaket: e.hargaPaket, petugas: e.petugas,
        status: e.status, updatedAt: e.updatedAt,
      })),
      participants: payloadParticipants,
      anonTallies: tallies.map((t) => ({
        clientId: t.clientId, eventClientId: t.eventClientId,
        paramsDiambil: t.paramsDiambil, createdAt: t.createdAt,
      })),
    });

    const okEvents = new Set(result.accepted.events);
    const okParticipants = new Set(result.accepted.participants);
    const okTallies = new Set(result.accepted.anonTallies);
    const flagged = new Set(
      result.conflicts.filter((c) => c.kind === 'dedup').map((c) => c.clientId),
    );

    await db.transaction('rw', db.events, db.participants, db.anonTallies, async () => {
      for (const e of events) if (okEvents.has(e.clientId)) await db.events.update(e.clientId, { synced: 1 });
      for (const p of participants) {
        if (!okParticipants.has(p.clientId)) continue;
        await db.participants.update(p.clientId, {
          synced: 1, needsReview: flagged.has(p.clientId) ? 1 : 0,
        });
      }
      for (const t of tallies) if (okTallies.has(t.clientId)) await db.anonTallies.update(t.clientId, { synced: 1 });
    });

    await setMeta('pendingBatchId', null);
    const now = new Date().toISOString();
    await setMeta('lastSyncAt', now);
    // Konfirmasi server adalah syarat purge (US-05).
    await purgeSynced();
    emit({ lastSyncAt: now, conflicts: result.conflicts.length, lastError: null });
    await refreshPending();
    return result;
  } catch (err) {
    if (err instanceof WipeRequired) throw err;
    const msg = err instanceof ApiError
      ? err.message
      : 'Sync gagal — data tetap aman di perangkat, akan dicoba lagi.';
    emit({ lastError: msg });
    return null;
  } finally {
    emit({ running: false });
    await refreshPending();
  }
}

/** Sync otomatis: saat koneksi kembali, dan berkala selagi aplikasi terbuka. */
export function startAutoSync(getKey: () => CryptoKey | null) {
  const attempt = () => { void syncNow(getKey(), { silent: true }); };
  forceSync = attempt;
  window.addEventListener('online', attempt);
  const timer = window.setInterval(attempt, 60_000);
  void getMeta<string>('lastSyncAt').then((v) => emit({ lastSyncAt: v ?? null }));
  void refreshPending();
  return () => {
    forceSync = null;
    window.removeEventListener('online', attempt);
    clearInterval(timer);
  };
}
