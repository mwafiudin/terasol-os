import { create } from 'zustand';
import { api, getSession, onWipeRequired, setSession, WipeRequired } from './api';
import { checkVerifier, deriveKey, encryptJson, decryptJson, makeVerifier, randomBytes, type Envelope } from './crypto';
import { db, deviceId, getMeta, setMeta, wipeAll } from './db';
import { refreshPending, setSimulatedOffline, syncNow } from './sync';
import type { User } from './types';

/** Auto-lock setelah idle (§4.5.2). */
export const IDLE_LOCK_MS = 5 * 60_000;

export type Phase = 'booting' | 'login' | 'setPin' | 'locked' | 'ready';

type AppState = {
  phase: Phase;
  user: User | null;
  /** Kunci enkripsi lokal — hanya di memori, tidak pernah ke disk. */
  key: CryptoKey | null;
  toast: string | null;
  online: boolean;
  /**
   * Hasil permintaan persistent storage (R1). `false` berarti browser boleh
   * menghapus IndexedDB saat ruang menipis — petugas harus tahu, bukan
   * mengetahuinya setelah data lapangan hilang.
   */
  storagePersisted: boolean | null;

  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  logout: () => Promise<void>;
  wipe: (reason?: string) => Promise<void>;
  say: (msg: string | null) => void;
  setOnline: (v: boolean) => void;
};

let toastTimer: number | undefined;

export const useApp = create<AppState>((set, get) => ({
  phase: 'booting',
  user: null,
  key: null,
  toast: null,
  online: navigator.onLine,
  storagePersisted: null,

  say: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    if (msg) toastTimer = window.setTimeout(() => set({ toast: null }), 4200);
  },

  setOnline: (v) => set({ online: v }),

  boot: async () => {
    onWipeRequired(() => { void get().wipe('Perangkat ini dicabut aksesnya oleh Koordinator.'); });
    set({ storagePersisted: await requestPersistentStorage() });
    const user = await getMeta<User>('user');
    const salt = await getMeta<number[]>('pinSalt');
    if (!user) return set({ phase: 'login' });
    set({ user });
    set({ phase: salt ? 'locked' : 'setPin' });
  },

  login: async (email, password) => {
    const did = await deviceId();
    const res = await api.login(email, password, did, navigator.userAgent.slice(0, 100));
    setSession(res.accessToken, res.refreshToken);
    await setMeta('user', res.user);
    // Refresh token belum bisa dienkripsi sampai PIN dibuat; disimpan sementara
    // di memori saja, lalu dikunci begitu PIN tersedia.
    set({ user: res.user, phase: 'setPin' });
  },

  setPin: async (pin) => {
    const salt = randomBytes(16);
    const key = await deriveKey(pin, salt);
    const verifier = await makeVerifier(key);
    await setMeta('pinSalt', Array.from(salt));
    await setMeta('pinVerifier', { iv: Array.from(verifier.iv), ct: bufToArr(verifier.ct) });

    const { refreshToken } = getSession();
    if (refreshToken) await saveRefreshToken(key, refreshToken);
    set({ key, phase: 'ready' });
    await refreshPending();
  },

  unlock: async (pin) => {
    const saltArr = await getMeta<number[]>('pinSalt');
    const vRaw = await getMeta<{ iv: number[]; ct: number[] }>('pinVerifier');
    if (!saltArr || !vRaw) { set({ phase: 'setPin' }); return false; }

    const key = await deriveKey(pin, new Uint8Array(saltArr));
    const ok = await checkVerifier(key, {
      iv: new Uint8Array(vRaw.iv), ct: new Uint8Array(vRaw.ct).buffer,
    } as Envelope);
    if (!ok) return false;

    const refreshToken = await loadRefreshToken(key);
    setSession(null, refreshToken);
    set({ key, phase: 'ready' });
    await refreshPending();
    // Token akses diambil ulang lewat refresh saat request pertama.
    void syncNow(key, { silent: true }).catch(() => {});
    return true;
  },

  lock: () => {
    // Kunci dibuang dari memori — data lokal kembali jadi ciphertext.
    setSession(null, null);
    set({ key: null, phase: 'locked' });
  },

  logout: async () => {
    try { await api.logout(); } catch { /* offline: sesi dicabut saat online lagi */ }
    setSession(null, null);
    set({ key: null, user: null, phase: 'login' });
    await setMeta('user', null);
  },

  wipe: async (reason) => {
    try { await api.wipeAck(); } catch { /* tetap hapus walau server tak terjangkau */ }
    await wipeAll();
    setSession(null, null);
    set({ key: null, user: null, phase: 'login', toast: reason ?? 'Data lokal dihapus.' });
  },
}));

/* ----------------------- persistent storage (R1) ----------------------- */

/**
 * Meminta browser tidak mengevict IndexedDB. Hasilnya dikembalikan, bukan
 * dibuang: kalau ditolak, data lapangan bisa hilang sebelum sempat sync dan
 * petugas berhak tahu itu sejak awal.
 */
async function requestPersistentStorage(): Promise<boolean | null> {
  if (!('storage' in navigator) || !navigator.storage.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/* --------------------- refresh token terenkripsi --------------------- */

function bufToArr(b: ArrayBuffer): number[] { return Array.from(new Uint8Array(b)); }

export async function saveRefreshToken(key: CryptoKey, token: string) {
  const env = await encryptJson(key, token);
  await setMeta('refreshToken', { iv: Array.from(env.iv), ct: bufToArr(env.ct) });
}

async function loadRefreshToken(key: CryptoKey): Promise<string | null> {
  const raw = await getMeta<{ iv: number[]; ct: number[] }>('refreshToken');
  if (!raw) return null;
  try {
    return await decryptJson<string>(key, {
      iv: new Uint8Array(raw.iv), ct: new Uint8Array(raw.ct).buffer,
    } as Envelope);
  } catch {
    return null;
  }
}

/* ----------------------------- auto-lock ----------------------------- */

export function installIdleLock() {
  let timer: number | undefined;
  const reset = () => {
    clearTimeout(timer);
    if (useApp.getState().phase !== 'ready') return;
    timer = window.setTimeout(() => useApp.getState().lock(), IDLE_LOCK_MS);
  };
  const events = ['pointerdown', 'keydown', 'visibilitychange'] as const;
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  reset();
  return () => {
    clearTimeout(timer);
    events.forEach((e) => window.removeEventListener(e, reset));
  };
}

/* ------------------------- status jaringan ------------------------- */

export function installNetworkWatch() {
  const set = () => useApp.getState().setOnline(navigator.onLine);
  window.addEventListener('online', set);
  window.addEventListener('offline', set);
  return () => {
    window.removeEventListener('online', set);
    window.removeEventListener('offline', set);
  };
}

export { setSimulatedOffline, WipeRequired, db };
