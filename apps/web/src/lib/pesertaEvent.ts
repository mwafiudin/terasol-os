import { api } from './api';
import { db, getMeta, readParticipants, setMeta } from './db';
import { num } from './domain';
import { isOnline } from './sync';
import type { ConvStatus, EventRow, ParamKey } from './types';

/**
 * Satu baris peserta di daftar event. Menyatukan dua sumber yang keduanya sah:
 * record yang masih mengantre di perangkat ini, dan record yang sudah ada di
 * server (termasuk yang dicatat petugas lain di event yang sama).
 */
export type PesertaRingkas = {
  /** Ada bila sudah tersimpan di server — syarat untuk membuka rekapnya. */
  serverId: string | null;
  clientId: string;
  nama: string;
  gender: 'P' | 'L';
  usia: string;
  hp: string;
  imt: number | null;
  paramsDiambil: ParamKey[];
  berminat: boolean;
  convStatus: ConvStatus | null;
  needsReview: boolean;
  belumSync: boolean;
  /** Identitasnya sudah di-purge dari perangkat dan belum bisa diambil server. */
  terkunci: boolean;
  createdAt: string;
};

export type RekapSementara = {
  peserta: number;
  berminat: number;
  tallyAnonim: number;
  belumSync: number;
  perluDitinjau: number;
  /** null bila harga strip belum diatur cabang — bukan berarti gratis. */
  estimasiConsumable: number | null;
  paramTerpakai: { param: ParamKey; jumlah: number }[];
};

/** IMT dihitung ulang untuk record lokal; nilai resmi tetap dari basis data. */
function imtLokal(v: Partial<Record<ParamKey, string>>): number | null {
  const t = num(v.tinggi), b = num(v.berat);
  if (!t || !b || t < 50) return null;
  return Math.round((b / (t / 100) ** 2) * 10) / 10;
}

/**
 * Harga consumable di-cache supaya rekap sementara tetap bisa dihitung saat
 * offline. Kalau belum pernah terambil, biayanya dilaporkan null — bukan nol.
 */
async function tarifConsumable(): Promise<Partial<Record<ParamKey, number>> | null> {
  if (isOnline()) {
    try {
      const c = await api.config();
      await setMeta('tarifConsumable', c.consumablePrice);
      return c.consumablePrice;
    } catch { /* jatuh ke cache */ }
  }
  return (await getMeta<Partial<Record<ParamKey, number>>>('tarifConsumable')) ?? null;
}

export async function pesertaEvent(
  key: CryptoKey | null,
  ev: EventRow,
): Promise<PesertaRingkas[]> {
  const baris = await db.participants.where('eventClientId').equals(ev.clientId).toArray();
  const lokal = await readParticipants(key, baris);

  const dariLokal: PesertaRingkas[] = lokal.map((p) => ({
    serverId: null,
    clientId: p.clientId,
    nama: p.secret?.nama ?? 'Identitas sudah dibersihkan',
    gender: p.secret?.gender ?? 'P',
    usia: p.secret?.usia ?? '',
    hp: p.secret?.hp ?? '',
    imt: p.secret?.screening ? imtLokal(p.secret.screening.values) : null,
    paramsDiambil: p.secret?.screening
      ? (Object.keys(p.secret.screening.values) as ParamKey[])
        .filter((k) => (p.secret!.screening!.values[k] ?? '') !== '')
      : [],
    berminat: p.berminat === 1,
    convStatus: p.convStatus,
    needsReview: p.needsReview === 1,
    belumSync: p.synced === 0,
    terkunci: p.secret === null,
    createdAt: p.createdAt,
  }));

  const peta = new Map(dariLokal.map((p) => [p.clientId, p]));

  if (isOnline() && ev.serverId) {
    try {
      const { participants } = await api.participants({ eventId: ev.serverId });
      for (const s of participants) {
        const adaLokal = peta.get(s.clientId);
        peta.set(s.clientId, {
          serverId: s.id,
          clientId: s.clientId,
          // Server memegang identitas yang benar; baris lokal yang sudah
          // di-purge tidak lagi punya namanya.
          nama: s.nama,
          gender: s.gender,
          usia: String(s.usia),
          hp: s.hp,
          imt: s.imt,
          paramsDiambil: (s.paramsDiambil ?? []) as ParamKey[],
          berminat: s.berminat,
          convStatus: s.convStatus,
          needsReview: s.needsReview,
          belumSync: adaLokal?.belumSync ?? false,
          terkunci: false,
          createdAt: s.createdAt,
        });
      }
    } catch { /* offline atau gagal: cukup pakai yang lokal */ }
  }

  return [...peta.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function rekapSementara(
  ev: EventRow,
  daftar: PesertaRingkas[],
): Promise<RekapSementara> {
  const tallyLokal = await db.anonTallies.where('eventClientId').equals(ev.clientId).toArray();
  const belumSyncTally = tallyLokal.filter((t) => t.synced === 0).length;

  // Record yang menunggu peninjauan tidak dihitung, sama seperti rekap resmi.
  const dihitung = daftar.filter((p) => !p.needsReview);

  const hitung = new Map<ParamKey, number>();
  for (const p of dihitung) {
    for (const k of p.paramsDiambil) hitung.set(k, (hitung.get(k) ?? 0) + 1);
  }

  const tarif = await tarifConsumable();
  const berStrip: ParamKey[] = ['gula', 'kolesterol', 'asam_urat'];
  let biaya: number | null = 0;
  for (const k of berStrip) {
    const jumlah = hitung.get(k) ?? 0;
    if (jumlah === 0) continue;
    const harga = tarif?.[k];
    if (typeof harga !== 'number') { biaya = null; break; }
    biaya += jumlah * harga;
  }

  return {
    peserta: dihitung.length,
    berminat: dihitung.filter((p) => p.berminat).length,
    tallyAnonim: ev.tally + belumSyncTally,
    belumSync: daftar.filter((p) => p.belumSync).length,
    perluDitinjau: daftar.filter((p) => p.needsReview).length,
    estimasiConsumable: biaya,
    paramTerpakai: [...hitung.entries()]
      .map(([param, jumlah]) => ({ param, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah),
  };
}
