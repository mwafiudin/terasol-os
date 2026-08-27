import type { JenisUkur, KonteksGula } from './rujukan';
import type { ConvStatus, EventRow, EventStatus, EventTipe, ParamKey, Role, User } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly detail?: unknown) {
    super(message);
  }
}
/** Server memerintahkan perangkat ini menghapus data lokal (§4.5.4). */
export class WipeRequired extends Error {}

type Session = { accessToken: string | null; refreshToken: string | null };
const session: Session = { accessToken: null, refreshToken: null };

let onSessionChange: ((s: Session) => void) | null = null;
let onWipe: (() => void) | null = null;
let onAuthLost: (() => void) | null = null;

export function setSession(accessToken: string | null, refreshToken: string | null) {
  session.accessToken = accessToken;
  session.refreshToken = refreshToken;
}
export function getSession(): Readonly<Session> { return session; }
export function onSession(cb: (s: Session) => void) { onSessionChange = cb; }
export function onWipeRequired(cb: () => void) { onWipe = cb; }
/**
 * Sesi tidak lagi diterima server dan tidak bisa diperbarui — bukan permintaan
 * wipe, sekadar kedaluwarsa atau tidak dikenal. Tanpa ini aplikasi tetap
 * tampak "masuk" tetapi setiap permintaan gagal diam-diam, dan petugas hanya
 * melihat layar yang tidak pernah memuat apa pun.
 */
export function onSessionInvalid(cb: () => void) { onAuthLost = cb; }

async function parse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * Refresh dijalankan single-flight.
 *
 * Saat aplikasi dibuka, beberapa permintaan berangkat bersamaan dan semuanya
 * kena 401. Tanpa penguncian ini, masing-masing akan memanggil /auth/refresh
 * dengan token yang sama: yang pertama berhasil dan MEROTASI token, sisanya
 * memakai token yang sudah dibatalkan lalu gagal — dan petugas terlempar ke
 * layar login padahal sesinya sehat.
 */
let refreshBerjalan: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (refreshBerjalan) return refreshBerjalan;
  refreshBerjalan = jalankanRefresh().finally(() => { refreshBerjalan = null; });
  return refreshBerjalan;
}

async function jalankanRefresh(): Promise<boolean> {
  if (!session.refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const body = await parse(res);
  if (res.status === 409 || body?.wipe) { onWipe?.(); throw new WipeRequired(); }
  if (!res.ok) return false;
  setSession(body.accessToken, body.refreshToken);
  onSessionChange?.(session);
  return true;
}

async function request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      ...(opts.body ? { 'content-type': 'application/json' } : {}),
      ...(session.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {}),
      ...opts.headers,
    },
  });

  if (res.status === 409) {
    const body = await parse(res);
    if (body?.wipe) { onWipe?.(); throw new WipeRequired(); }
    throw new ApiError(409, body?.error ?? 'conflict', body?.message ?? 'Konflik.', body?.detail);
  }
  if (res.status === 401) {
    const body = await parse(res);
    if (body?.wipe) { onWipe?.(); throw new WipeRequired(); }
    if (retry && await refreshTokens()) return request<T>(path, opts, false);
    // Sudah dicoba refresh dan tetap ditolak: sesi ini benar-benar mati.
    setSession(null, null);
    onAuthLost?.();
    throw new ApiError(401, body?.error ?? 'unauthorized', body?.message ?? 'Sesi berakhir.');
  }
  const body = await parse(res);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? 'error', body?.message ?? `Gagal (${res.status}).`, body?.detail);
  }
  return body as T;
}

const post = <T>(p: string, b?: unknown) =>
  request<T>(p, { method: 'POST', body: b === undefined ? undefined : JSON.stringify(b) });
const patch = <T>(p: string, b: unknown) =>
  request<T>(p, { method: 'PATCH', body: JSON.stringify(b) });
const put = <T>(p: string, b: unknown) =>
  request<T>(p, { method: 'PUT', body: JSON.stringify(b) });
const del = <T>(p: string) => request<T>(p, { method: 'DELETE' });

/* ------------------------------- tipe ------------------------------- */

export type PelangganRingkas = {
  id: string; tenantId: string; nama: string; gender: 'P' | 'L'; usia: number | null;
  hp: string; createdAt: string; kunjungan: number; totalBelanja: string;
  terakhirDiukur: string | null;
};

export type PelangganDetail = {
  id: string; tenantId: string; nama: string; gender: 'P' | 'L'; usia: number | null;
  hp: string; catatan: string | null; createdAt: string; erasedAt: string | null;
  kunjungan: {
    id: string; needsReview: boolean; createdAt: string;
    eventId: string; eventNama: string; eventTanggal: string; eventStatus: EventStatus;
    consent: { granted: boolean; versiTeks: string; ts: string } | null;
    berminat: boolean; convStatus: ConvStatus;
  }[];
};

export type PengukuranRow = {
  id: string; jenis: JenisUkur; konteks: KonteksGula | null; nilai: string;
  outOfRange: boolean; catatan: string | null; diukurPada: string;
  participantId: string | null; diukurOleh: string | null;
  diukurOlehNama: string | null; eventNama: string | null;
};

export type CabangRingkas = {
  id: string; nama: string; pelanggan: number; kunjungan: number; pengukuran: number;
  eventAktif: number; event: number; totalBelanja: string; transaksi: number;
  petugas: number; perluDitinjau: number;
};

export type PusatRingkasan = {
  cabang: CabangRingkas[];
  total: {
    cabang: number; pelanggan: number; kunjungan: number; pengukuran: number;
    eventAktif: number; transaksi: number; totalBelanja: number; perluDitinjau: number;
  };
};

export type DaftarTerhapus = {
  pengukuran: {
    id: string; jenis: JenisUkur; konteks: KonteksGula | null; nilai: string;
    diukurPada: string; dihapusPada: string; dihapusOlehNama: string | null;
  }[];
  transaksi: {
    id: string; jenis: JenisTransaksi; nama: string; jumlah: number; total: string;
    tanggal: string; dihapusPada: string; dihapusOlehNama: string | null;
  }[];
};

export type JenisTransaksi = 'produk' | 'terapi' | 'paket';

export type TransaksiRow = {
  id: string; jenis: JenisTransaksi; nama: string; jumlah: number;
  hargaSatuan: string; total: string; tanggal: string; catatan: string | null;
  dicatatOleh: string | null; dicatatOlehNama: string | null; eventNama: string | null;
};

export type LoginResult = { accessToken: string; refreshToken: string; user: User };

export type SyncParticipant = {
  clientId: string; eventClientId: string; nama: string; gender: 'P' | 'L';
  usia: number; hp: string; updatedAt: string;
  consent: { granted: boolean; versiTeks: string; ts: string };
  screening: {
    clientId: string; tinggi: number | null; berat: number | null;
    sistolik: number | null; diastolik: number | null; gula: number | null;
    kolesterol: number | null; asamUrat: number | null;
    paramsDiambil: string[]; outOfRange: boolean; measuredAt: string;
  } | null;
  conversion: {
    berminat: boolean; status: ConvStatus; nilaiTransaksi: number;
    produk: string | null; updatedAt: string;
  } | null;
};

export type SyncPushResult = {
  batchId: string;
  serverTime: string;
  accepted: { events: string[]; participants: string[]; anonTallies: string[] };
  conflicts: { kind: string; entity: string; clientId: string; message: string }[];
  replayed?: boolean;
};

export type Recap = {
  event: { id: string; nama: string; lokasi: string; tanggal: string; tipe: string; hargaPaket: number; petugas: string | null };
  peserta: number; berminat: number; membeli: number; penjualan: number;
  rataRataTransaksi: number; rasioKonversi: number; perluDitinjau: number;
  consentSetuju: number; tallyAnonim: number;
  /** Pemasukan biaya screening untuk event berbayar, terpisah dari penjualan produk. */
  pendapatanEvent: number;
  pendapatanTotal: number;
  consumable: {
    param: ParamKey; jumlah: number; pakaiStrip: boolean;
    /** null = harga belum diatur cabang; 0 = memang tidak berbiaya. */
    hargaSatuan: number | null;
    biaya: number | null;
  }[];
  /** Parameter ber-strip yang terpakai tapi harganya belum diisi. */
  hargaBelumDiatur: ParamKey[];
  estimasiConsumable: number;
};

export type ConflictGroup = {
  eventId: string; hp: string; eventNama: string;
  records: {
    id: string; clientId: string; nama: string; gender: string; usia: number;
    needsReview: boolean; deviceId: string | null; createdAt: string;
    screening: Record<string, number | null> | null;
  }[];
};

export type ServerParticipant = {
  id: string; clientId: string; nama: string; gender: 'P' | 'L'; usia: number; hp: string;
  needsReview: boolean; eventId: string; eventNama: string; eventTanggal: string;
  eventStatus: string; imt: number | null; berminat: boolean; convStatus: ConvStatus;
  nilaiTransaksi: number; produk: string | null; createdAt: string;
  /** Parameter yang benar-benar diambil — dasar hitung biaya consumable. */
  paramsDiambil: ParamKey[] | null;
  /** Jejak peserta (US-04): kapan diukur, kapan status terakhir berubah. */
  measuredAt: string | null;
  convUpdatedAt: string | null;
};

/** Rekap satu peserta — lengkap dengan nilai tiap parameter. */
export type ParticipantDetail = {
  id: string; clientId: string; nama: string; gender: 'P' | 'L'; usia: number; hp: string;
  needsReview: boolean; erasedAt: string | null; createdAt: string; deviceId: string | null;
  pelangganId: string | null;
  event: {
    id: string; nama: string; lokasi: string; tanggal: string;
    tipe: EventTipe; hargaPaket: number; status: EventStatus;
  };
  consent: { granted: boolean; versiTeks: string; ts: string } | null;
  screening: {
    tinggi: number | null; berat: number | null; imt: number | null;
    sistolik: number | null; diastolik: number | null; gula: number | null;
    kolesterol: number | null; asamUrat: number | null;
    paramsDiambil: ParamKey[]; outOfRange: boolean; measuredAt: string;
  } | null;
  conversion: {
    berminat: boolean; status: ConvStatus; nilaiTransaksi: number;
    produk: string | null; updatedAt: string;
  } | null;
};

/* ------------------------------ endpoint ------------------------------ */

export const api = {
  login: (email: string, password: string, deviceId: string, deviceLabel: string) =>
    post<LoginResult>('/auth/login', { email, password, deviceId, deviceLabel }),
  logout: () => post<{ ok: true }>('/auth/logout'),
  me: () => request<{ user: User }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true; sesiLainDicabut: number }>('/auth/change-password', { currentPassword, newPassword }),

  consentText: () => request<{ versi: string; isi: string } | null>('/consent-text'),

  events: () => request<{ events: (EventRow & { id: string })[] }>('/events'),
  createEvent: (e: Record<string, unknown>) => post<{ id: string; clientId: string }>('/events', e),
  recap: (eventId: string) => request<Recap>(`/events/${eventId}/recap`),
  archiveEvent: (eventId: string) => post<{ ok: true }>(`/events/${eventId}/archive`),

  config: () => request<{
    paramRange: Record<string, { min: number; max: number; unit: string; label: string }>;
    consumableParams: ParamKey[];
    consumablePrice: Partial<Record<ParamKey, number>>;
  }>('/config'),
  setConsumablePrices: (prices: Partial<Record<ParamKey, number | null>>) =>
    patch<{ consumablePrice: Partial<Record<ParamKey, number>> }>('/tenant/consumable-prices', prices),
  exportCsv: async (eventId: string) => {
    const res = await fetch(`${BASE}/events/${eventId}/export.csv`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    if (!res.ok) throw new ApiError(res.status, 'export_failed', 'Gagal mengunduh CSV.');
    return res.blob();
  },

  participants: (q: { eventId?: string; berminat?: boolean } = {}) => {
    const s = new URLSearchParams();
    if (q.eventId) s.set('eventId', q.eventId);
    if (q.berminat) s.set('berminat', 'true');
    return request<{ participants: ServerParticipant[] }>(`/participants?${s}`);
  },
  participantDetail: (id: string) => request<ParticipantDetail>(`/participants/${id}`),
  setConversion: (id: string, body: { status: ConvStatus; nilaiTransaksi: number; produk?: string | null; berminat?: boolean }) =>
    patch<unknown>(`/participants/${id}/conversion`, body),
  eraseParticipant: (id: string, alasan: string) => post<{ ok: true }>(`/participants/${id}/erase`, { alasan }),

  conflicts: () => request<{ conflicts: ConflictGroup[] }>('/conflicts'),
  resolveConflict: (keepId: string, dropIds: string[]) =>
    post<{ ok: true; archived: number }>('/conflicts/resolve', { keepId, dropIds }),

  syncPush: (body: {
    batchId: string;
    events: Record<string, unknown>[];
    participants: SyncParticipant[];
    anonTallies: Record<string, unknown>[];
  }) => post<SyncPushResult>('/sync/push', body),

  /* --------------------- pelanggan, pengukuran, belanja --------------------- */

  pelanggan: (cari?: string) =>
    request<{ pelanggan: PelangganRingkas[] }>(`/pelanggan?${new URLSearchParams(cari ? { cari } : {})}`),
  pelangganDetail: (id: string) => request<PelangganDetail>(`/pelanggan/${id}`),
  updatePelanggan: (id: string, body: Partial<{ nama: string; gender: 'P' | 'L'; usia: number | null; hp: string; catatan: string | null }>) =>
    patch<unknown>(`/pelanggan/${id}`, body),

  pengukuran: (pelangganId: string) =>
    request<{ pengukuran: PengukuranRow[] }>(`/pelanggan/${pelangganId}/pengukuran`),
  createPengukuran: (body: {
    pelangganId: string; participantId?: string | null; jenis: JenisUkur;
    konteks?: KonteksGula | null; nilai: number; diukurPada?: string;
    diukurOleh?: string | null; outOfRange?: boolean; catatan?: string | null;
  }) => post<{ id: string }>('/pengukuran', body),
  updatePengukuran: (id: string, body: Record<string, unknown>) =>
    patch<unknown>(`/pengukuran/${id}`, body),
  deletePengukuran: (id: string) => del<{ ok: true }>(`/pengukuran/${id}`),
  pulihkanPengukuran: (id: string) => post<{ ok: true }>(`/pengukuran/${id}/pulihkan`),

  transaksi: (pelangganId: string) =>
    request<{ transaksi: TransaksiRow[]; total: number }>(`/pelanggan/${pelangganId}/transaksi`),
  createTransaksi: (body: {
    pelangganId: string; participantId?: string | null; jenis?: JenisTransaksi;
    nama: string; jumlah: number; hargaSatuan: number; tanggal?: string; catatan?: string | null;
  }) => post<{ id: string }>('/transaksi', body),
  updateTransaksi: (id: string, body: Record<string, unknown>) =>
    patch<unknown>(`/transaksi/${id}`, body),
  deleteTransaksi: (id: string) => del<{ ok: true }>(`/transaksi/${id}`),
  pulihkanTransaksi: (id: string) => post<{ ok: true }>(`/transaksi/${id}/pulihkan`),

  terhapus: (pelangganId: string) =>
    request<DaftarTerhapus>(`/pelanggan/${pelangganId}/terhapus`),

  pusatRingkasan: () => request<PusatRingkasan>('/pusat/ringkasan'),

  rekan: () => request<{ rekan: { id: string; nama: string; role: Role }[] }>('/rekan'),
  eventPetugas: (eventId: string) =>
    request<{ petugas: { id: string; nama: string; role: Role }[] }>(`/events/${eventId}/petugas`),
  setEventPetugas: (eventId: string, userIds: string[]) =>
    put<{ ok: true; jumlah: number }>(`/events/${eventId}/petugas`, { userIds }),

  users: () => request<{ users: { id: string; nama: string; email: string; role: Role; active: boolean }[] }>('/users'),
  createUser: (u: { nama: string; email: string; password: string; role: 'petugas' | 'koordinator' }) =>
    post<unknown>('/users', u),
  setUserActive: (id: string, active: boolean) => patch<unknown>(`/users/${id}`, { active }),

  devices: () => request<{
    devices: { id: string; deviceId: string; deviceLabel: string | null; revokedAt: string | null;
      wipeRequested: boolean; lastSeenAt: string; userNama: string; role: Role }[];
  }>('/devices'),
  revokeDevice: (id: string, wipe = true) => post<unknown>(`/devices/${id}/revoke`, { wipe }),
  wipeAck: () => post<{ ok: true }>('/devices/wipe-ack'),
};

export { refreshTokens };
