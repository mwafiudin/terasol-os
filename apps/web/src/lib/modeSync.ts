/**
 * Mode sync cabang: boleh mencatat tanpa sinyal, atau tidak.
 *
 * Aplikasi ini local-first sampai ke akar — setiap tulisan masuk ke IndexedDB
 * terenkripsi dulu, lalu diantre. Yang diubah mode 'online' BUKAN jalur itu,
 * melainkan pintu masuknya: pencatatan baru tidak boleh DIMULAI tanpa sinyal.
 *
 * Antreannya tetap menjadi pengangkut, apa pun modenya. Ia yang membuat sync
 * idempoten dan yang menahan data saat aplikasi tertutup di tengah pengukuran
 * (US-03). Membongkarnya demi "harus online" akan menukar satu risiko dengan
 * risiko yang lebih buruk: pemeriksaan yang hilang karena aplikasi tertutup,
 * bukan karena sinyal.
 *
 * Yang sudah dimulai selalu boleh diselesaikan. Menghentikan petugas di tengah
 * pengukuran karena sinyal putus berarti membuang apa yang sudah diambil dari
 * orang yang sedang berdiri di depannya — persis yang ingin dicegah.
 */
import type { User } from './types';
import { isOnline } from './sync';

export type ModeSync = 'online' | 'offline';

/**
 * Bawaannya 'online' bila cabangnya belum menyatakan apa pun.
 *
 * Perangkat yang login sebelum kolomnya ada tidak memilikinya, dan profilnya
 * baru disegarkan saat ada koneksi — jadi saat itu ia pasti online dan
 * gerbangnya tidak menghalangi apa-apa.
 */
export const modeSyncDari = (user: User | null): ModeSync => user?.modeSync ?? 'online';

/** Benar bila pencatatan baru harus ditolak sekarang juga. */
export function pintuTertutup(user: User | null): boolean {
  return modeSyncDari(user) === 'online' && !isOnline();
}

export const ALASAN_TERTUTUP =
  'Cabang ini disetel harus online. Pencatatan baru menunggu sampai sinyal kembali — '
  + 'yang sedang dikerjakan tetap bisa diselesaikan dan tersimpan.';
