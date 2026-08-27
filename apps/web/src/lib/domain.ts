import { hitungImt, nilaiImt } from './rujukan';
import type { ParamKey } from './types';

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
