import { create } from 'zustand';
import { decryptJson, encryptJson, type Envelope } from './crypto';
import { db, getMeta, setMeta } from './db';
import { outOfRange } from './domain';
import type { KonteksGula } from './rujukan';
import type { ParamKey, ParticipantSecret } from './types';

export type Draft = {
  clientId: string;
  eventClientId: string;
  nama: string;
  gender: 'P' | 'L' | '';
  usia: string;
  hp: string;
  consentGranted: boolean | null;
  consentVersi: string;
  values: Partial<Record<ParamKey, string>>;
  /**
   * Jenis gula darah yang dipilih petugas saat memilih kelompok Pemeriksaan
   * darah. Menentukan rentang rujukannya: 140 mg/dL sesudah puasa dan 140
   * mg/dL dua jam sesudah makan berarti dua hal yang berbeda, jadi angkanya
   * tidak boleh dikirim tanpa konteks ini.
   */
  konteksGula: KonteksGula | null;
  berminat: boolean;
  startedAt: string;
};

export function emptyDraft(eventClientId: string, consentVersi: string): Draft {
  return {
    clientId: crypto.randomUUID(),
    eventClientId,
    nama: '', gender: '', usia: '', hp: '',
    consentGranted: null, consentVersi,
    values: {}, konteksGula: null, berminat: false,
    startedAt: new Date().toISOString(),
  };
}

type DraftState = {
  draft: Draft | null;
  /** Parameter yang sedang diisi di layar hasil. */
  active: ParamKey;
  /** Parameter yang menunggu konfirmasi ulang karena di luar rentang wajar. */
  warn: ParamKey | null;

  start: (eventClientId: string, consentVersi: string) => void;
  restore: (key: CryptoKey) => Promise<void>;
  patch: (key: CryptoKey, p: Partial<Draft>) => Promise<void>;
  setValue: (key: CryptoKey, k: ParamKey, v: string) => Promise<void>;
  setActive: (k: ParamKey) => void;
  setWarn: (k: ParamKey | null) => void;
  clear: () => Promise<void>;
};

/**
 * Draft disimpan terenkripsi setiap kali berubah — bukan saat tombol simpan
 * ditekan. Aplikasi tertutup mendadak di lapangan tidak boleh menghilangkan
 * pengukuran yang sudah diambil (US-03).
 */
async function persist(key: CryptoKey, draft: Draft | null) {
  if (!draft) { await setMeta('draft', null); return; }
  const env = await encryptJson(key, draft);
  await setMeta('draft', { iv: Array.from(env.iv), ct: Array.from(new Uint8Array(env.ct)) });
}

export const useDraft = create<DraftState>((set, get) => ({
  draft: null,
  active: 'tinggi',
  warn: null,

  start: (eventClientId, consentVersi) =>
    set({ draft: emptyDraft(eventClientId, consentVersi), active: 'tinggi', warn: null }),

  restore: async (key) => {
    const raw = await getMeta<{ iv: number[]; ct: number[] }>('draft');
    if (!raw) return;
    try {
      const draft = await decryptJson<Draft>(key, {
        iv: new Uint8Array(raw.iv), ct: new Uint8Array(raw.ct).buffer,
      } as Envelope);
      set({ draft });
    } catch {
      await setMeta('draft', null);
    }
  },

  patch: async (key, p) => {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, ...p };
    set({ draft: next });
    await persist(key, next);
  },

  setValue: async (key, k, v) => {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, values: { ...draft.values, [k]: v } };
    set({ draft: next, warn: null });
    await persist(key, next);
  },

  setActive: (k) => set({ active: k, warn: null }),
  setWarn: (k) => set({ warn: k }),

  clear: async () => {
    set({ draft: null, active: 'tinggi', warn: null });
    await setMeta('draft', null);
  },
}));

/** Mengubah draft menjadi baris peserta + bagian rahasianya untuk disimpan. */
export function draftToRecord(draft: Draft): {
  secret: ParticipantSecret;
  anyOutOfRange: boolean;
} {
  const anyOutOfRange = (Object.keys(draft.values) as ParamKey[])
    .some((k) => outOfRange(k, draft.values[k]));

  return {
    anyOutOfRange,
    secret: {
      nama: draft.nama,
      gender: (draft.gender || 'P') as 'P' | 'L',
      usia: draft.usia,
      hp: draft.hp,
      consent: {
        granted: draft.consentGranted === true,
        versiTeks: draft.consentVersi,
        ts: new Date().toISOString(),
      },
      screening: {
        clientId: crypto.randomUUID(),
        values: draft.values,
        outOfRange: anyOutOfRange,
        measuredAt: new Date().toISOString(),
      },
    },
  };
}

/** Deteksi dedup lokal (§4.3.2) — peringatkan sebelum membuat record baru. */
export async function hpSudahAda(
  key: CryptoKey, eventClientId: string, hp: string, exceptClientId?: string,
): Promise<boolean> {
  if (!hp) return false;
  const rows = await db.participants.where('eventClientId').equals(eventClientId).toArray();
  for (const row of rows) {
    if (row.clientId === exceptClientId || !row.iv || !row.ct) continue;
    try {
      const s = await decryptJson<ParticipantSecret>(key, { iv: row.iv, ct: row.ct } as Envelope);
      if (s.hp === hp) return true;
    } catch { /* baris tak terbaca diabaikan */ }
  }
  return false;
}
