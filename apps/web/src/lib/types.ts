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
  /**
   * Nama petugas sebagai teks. Dipertahankan agar event lama tetap terbaca dan
   * agar daftar tetap muncul saat offline, tapi bukan lagi sumber kebenaran.
   */
  petugas: string | null;
  /**
   * Petugas yang ditugaskan, sebagai id akun. Inilah yang menghubungkan event
   * ke orang sungguhan; teks di atas tidak bisa ditelusuri ke siapa pun.
   * Dikirim ke server begitu event punya serverId.
   */
  petugasIds?: string[];
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

/* ============================ cermin peserta ============================ */

/**
 * Salinan lokal peserta yang dicatat PERANGKAT LAIN di event yang sama.
 *
 * Ada karena event sering dijalankan berstasiun: satu petugas mendaftarkan,
 * petugas lain di meja berikutnya yang mengukur. Sebelum ini daftar peserta
 * dari server hanya digabung saat online lalu dibuang, sehingga petugas kedua
 * yang kehilangan sinyal tidak melihat peserta pertama sama sekali — di
 * aplikasi yang justru dibangun untuk bekerja tanpa jaringan.
 *
 * Sengaja TABEL TERPISAH dari `participants`. Tabel itu berarti "record yang
 * dibuat perangkat ini dan harus dikirim"; mencampur salinan server ke dalamnya
 * akan merusak hitungan antrean, pemilihan `synced === 0` saat push, dan purge
 * retensi. Cermin tidak pernah dikirim ke mana pun — ia hanya dibaca.
 */
export type CerminSecret = {
  nama: string;
  gender: 'P' | 'L';
  usia: string;
  hp: string;
  imt: number | null;
  paramsDiambil: ParamKey[];
};

/**
 * Kolom terbuka di sini sengaja bukan data kesehatan, mengikuti aturan yang
 * sama dengan `ParticipantRow`. Nama, usia, IMT, dan parameter yang diambil ada
 * di dalam `iv`/`ct`.
 */
export type CerminRow = {
  clientId: string;
  eventClientId: string;
  serverId: string;
  /** Diperlukan untuk mencatat pengukuran; tanpa ini layar peserta read-only. */
  pelangganId: string | null;
  berminat: 0 | 1;
  convStatus: ConvStatus | null;
  needsReview: 0 | 1;
  createdAt: string;
  /** Kapan salinan ini diambil — ditampilkan agar tidak disangka data langsung. */
  diambilPada: string;
  iv: Uint8Array | null;
  ct: ArrayBuffer | null;
};

export type CerminView = CerminRow & { secret: CerminSecret | null };

/* =========================== antrean pengukuran =========================== */

/** Nilai pengukuran adalah data kesehatan, jadi ia ikut dienkripsi. */
export type UkurAntreSecret = {
  nilai: number;
  konteks: string | null;
  outOfRange: boolean;
  catatan: string | null;
};

/**
 * Pengukuran yang dicatat saat offline, menunggu dikirim.
 *
 * `clientId` dibuat sekali dan tidak berubah: server melakukan upsert pada
 * `(tenant_id, client_id)`, sehingga percobaan kirim ulang setelah sinyal putus
 * tidak pernah menggandakan pengukuran.
 */
export type UkurAntreRow = {
  clientId: string;
  pelangganId: string;
  participantId: string | null;
  jenis: string;
  /** Waktu ukur SUNGGUHAN, bukan waktu unggah — grafik tren bergantung padanya. */
  diukurPada: string;
  synced: 0 | 1;
  iv: Uint8Array | null;
  ct: ArrayBuffer | null;
};

export type UkurAntreView = UkurAntreRow & { secret: UkurAntreSecret | null };

export type ParticipantView = ParticipantRow & { secret: ParticipantSecret | null };
