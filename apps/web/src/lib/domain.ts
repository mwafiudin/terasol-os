import { hitungImt, nilaiImt } from './rujukan';
import type { EventStatus, ParamKey } from './types';

/**
 * Rentang wajar per parameter (US-03). Nilai di luar rentang tidak ditolak —
 * petugas diminta konfirmasi ulang, lalu tersimpan dengan tanda out_of_range.
 * Batas keras (penolakan data sampah) ada di CHECK constraint basis data.
 */
export const PARAMS: { k: ParamKey; label: string; unit: string; min: number; max: number; dec?: boolean }[] = [
  { k: 'tinggi', label: 'Tinggi badan', unit: 'cm', min: 120, max: 210 },
  { k: 'berat', label: 'Berat badan', unit: 'kg', min: 30, max: 180 },
  { k: 'sistolik', label: 'Tensi — sistolik', unit: 'mmHg', min: 70, max: 250 },
  { k: 'diastolik', label: 'Tensi — diastolik', unit: 'mmHg', min: 40, max: 150 },
  { k: 'gula', label: 'Gula darah', unit: 'mg/dL', min: 50, max: 500 },
  { k: 'kolesterol', label: 'Kolesterol', unit: 'mg/dL', min: 100, max: 400 },
  { k: 'asam_urat', label: 'Asam urat', unit: 'mg/dL', min: 2, max: 15, dec: true },
];

export const PARAM_LABEL: Record<ParamKey, string> = Object.fromEntries(
  PARAMS.map((p) => [p.k, p.label]),
) as Record<ParamKey, string>;

/** Angka yang diketik petugas memakai koma sebagai desimal. */
export function num(v: string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function outOfRange(k: ParamKey, raw: string | undefined): boolean {
  const p = PARAMS.find((x) => x.k === k);
  const n = num(raw);
  return !!p && n !== null && (n < p.min || n > p.max);
}

/**
 * IMT ditampilkan di perangkat; nilai resmi dihitung ulang oleh basis data.
 * Kategorinya memakai ambang Asia-Pasifik dari `rujukan.ts` — sebelumnya di
 * sini dipakai ambang WHO global (25/30), yang menyebut "normal" orang yang
 * menurut standar Indonesia sudah berat badan lebih.
 */
export function imtOf(
  values: Partial<Record<ParamKey, string>>,
): { nilai: number; kategori: string; nada: string } | null {
  const nilai = hitungImt(num(values.tinggi), num(values.berat));
  if (nilai == null) return null;
  const p = nilaiImt(nilai);
  return { nilai, kategori: p.label, nada: p.nada };
}

/** Nama peran seperti dipakai PRD. Tanpa ini `admin_pusat` mudah jatuh ke
 *  cabang "else" dan tampil sebagai "Petugas" — salah, dan menyesatkan pada
 *  layar yang justru dipakai untuk menentukan siapa bertanggung jawab. */
export const ROLE_LABEL: Record<string, string> = {
  petugas: 'Petugas',
  koordinator: 'Koordinator',
  admin_pusat: 'Admin Pusat',
};

/**
 * Nama status event. Ada EMPAT status, dan memperlakukannya sebagai dua —
 * "berlangsung" versus "selesai" — membuat event yang dijadwalkan besok
 * ditandai sudah selesai, lengkap dengan kalimat "selesai tanpa peserta
 * tercatat" untuk event yang bahkan belum dimulai.
 */
export const EVENT_STATUS: Record<EventStatus, { label: string; tone: string }> = {
  planned: { label: 'Terjadwal', tone: 'accent' },
  active: { label: 'Berlangsung', tone: 'success' },
  done: { label: 'Selesai', tone: 'sage' },
  archived: { label: 'Diarsipkan', tone: 'sage' },
};

/** Status yang masih boleh menerima peserta baru. */
export const bisaTerimaPeserta = (s: EventStatus) => s === 'active' || s === 'planned';

export const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
export const pct = (n: number) => (Math.round(n * 1000) / 10).toLocaleString('id-ID') + '%';
export const dec = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

export function fmtTanggal(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', opts ?? { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Penamaan status mengikuti US-04 persis. */
export const CONV_LABEL: Record<string, { label: string; ringkas: string; tone: string }> = {
  baru: { label: 'Belum ditindaklanjuti', ringkas: 'Belum ditindaklanjuti', tone: 'warning' },
  dihubungi: { label: 'Sudah dihubungi', ringkas: 'Sudah dihubungi', tone: 'brand' },
  membeli: { label: 'Membeli', ringkas: 'Membeli', tone: 'success' },
  batal: { label: 'Tidak jadi', ringkas: 'Tidak jadi', tone: 'sage' },
};

/**
 * Waktu ringkas untuk baris daftar: "26 Agu · 19.34". Tahun hanya ikut bila
 * bukan tahun ini — pada baris yang harus memuat nama, nilai, dan penilaian
 * sekaligus, "2026" nyaris tidak pernah menjadi informasi baru.
 */
export function fmtWaktuSingkat(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const tanggal = d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short',
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tanggal} · ${jam}`;
}

/**
 * Jarak waktu dari sekarang, dalam bahasa manusia.
 *
 * Untuk status sync, "3 menit lalu" langsung menjawab pertanyaannya; jam
 * dinding memaksa pembacanya menghitung sendiri. Lewat sehari jam dinding
 * justru yang lebih berguna, jadi di situ ia yang dipakai.
 */
export function fmtSejak(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const detik = Math.round((Date.now() - d.getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return fmtTanggal(iso, { day: 'numeric', month: 'short' });
}

export function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ========================= pemeriksaan isian ========================= */

/**
 * Menormalkan nomor HP Indonesia ke bentuk `08…`.
 *
 * Orang menuliskan nomor yang sama dengan tiga cara — `0812…`, `+62812…`, dan
 * `62812…` — dan ketiganya harus dikenali sebagai satu nomor. Kalau tidak,
 * pencarian tidak menemukannya dan pemeriksaan duplikat di dalam satu event
 * gagal justru pada kasus yang paling mungkin: orang yang sama didaftarkan dua
 * kali oleh dua petugas yang menulis awalannya berbeda.
 */
export function normalisasiHp(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('62')) return `0${d.slice(2)}`;
  if (d.startsWith('8')) return `0${d}`;
  return d;
}

/** Batas panjang nomor seluler Indonesia, termasuk angka 0 di depan. */
const HP_MIN = 10;
const HP_MAKS = 14;

/** Mengembalikan pesan kesalahan, atau null bila nomornya masuk akal. */
export function periksaHp(raw: string): string | null {
  const d = normalisasiHp(raw);
  if (!d) return 'Nomor HP belum diisi.';
  if (!d.startsWith('08')) return 'Nomor HP seluler diawali 08, +628, atau 628.';
  if (d.length < HP_MIN || d.length > HP_MAKS) {
    return `Nomor seluler terdiri dari ${HP_MIN}–${HP_MAKS} angka; yang diketik ${d.length}.`;
  }
  return null;
}

/**
 * Batas usia. Bukan batas medis, melainkan batas kewajaran pengetikan: 123
 * hampir pasti salah ketik dari 12 atau 23, dan menyimpannya membuat rerata
 * usia peserta event itu tidak berarti apa-apa.
 */
export const USIA_MIN = 1;
export const USIA_MAKS = 120;

export function periksaUsia(raw: string): string | null {
  if (!raw.trim()) return 'Usia belum diisi.';
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Usia diisi angka tahun.';
  if (n < USIA_MIN || n > USIA_MAKS) {
    return `Usia di luar rentang wajar (${USIA_MIN}–${USIA_MAKS} tahun).`;
  }
  return null;
}
