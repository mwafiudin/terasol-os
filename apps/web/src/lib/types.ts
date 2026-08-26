export type ParamKey =
  | 'tinggi' | 'berat' | 'sistolik' | 'diastolik' | 'gula' | 'kolesterol' | 'asam_urat';

export type Role = 'petugas' | 'koordinator' | 'admin_pusat';
export type ConvStatus = 'baru' | 'dihubungi' | 'membeli' | 'batal';
export type EventTipe = 'gratis' | 'berbayar';
export type EventStatus = 'planned' | 'active' | 'done' | 'archived';

export type User = {
  id: string; nama: string; email: string; role: Role;
  tenantId: string; tenantNama: string;
};

export type EventRow = {
  clientId: string;
  serverId: string | null;
  nama: string;
  lokasi: string;
  tanggal: string;          // YYYY-MM-DD
  tipe: EventTipe;
  hargaPaket: number;
  petugas: string | null;
  status: EventStatus;
  /** Hitungan dari server — mencakup peserta yang dicatat perangkat lain. */
  peserta: number;
  berminat: number;
  tally: number;
  synced: 0 | 1;
  updatedAt: string;
};

/** Bagian yang dienkripsi di perangkat — identitas dan hasil pengukuran. */
export type ParticipantSecret = {
  nama: string;
  gender: 'P' | 'L';
  usia: string;
  hp: string;
  consent: { granted: boolean; versiTeks: string; ts: string };
  screening: {
    clientId: string;
    /** Nilai apa adanya seperti diketik petugas (koma sebagai desimal). */
    values: Partial<Record<ParamKey, string>>;
    outOfRange: boolean;
    measuredAt: string;
  } | null;
};

/**
 * Baris peserta di IndexedDB. Kolom di sini sengaja bukan data kesehatan —
 * cukup untuk mengantre sync dan menampilkan hitungan tanpa membuka enkripsi.
 * Identitas dan hasil ada di `iv`/`ct` (lihat ParticipantSecret).
 */
export type ParticipantRow = {
  clientId: string;
  eventClientId: string;
  createdAt: string;
  updatedAt: string;
  synced: 0 | 1;
  needsReview: 0 | 1;
  berminat: 0 | 1;
  convStatus: ConvStatus | null;
  nilaiTransaksi: number;
  produk: string | null;
  /** Dihapus saat purge retensi perangkat; barisnya tetap untuk hitungan. */
  iv: Uint8Array | null;
  ct: ArrayBuffer | null;
  purgedAt: string | null;
};

export type AnonTallyRow = {
  clientId: string;
  eventClientId: string;
  paramsDiambil: ParamKey[];
  createdAt: string;
  synced: 0 | 1;
};

export type ParticipantView = ParticipantRow & { secret: ParticipantSecret | null };
