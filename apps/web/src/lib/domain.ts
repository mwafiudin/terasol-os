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

/** IMT ditampilkan di perangkat; nilai resmi dihitung ulang oleh basis data. */
export function imtOf(values: Partial<Record<ParamKey, string>>): { nilai: number; kategori: string } | null {
  const t = num(values.tinggi), b = num(values.berat);
  if (!t || !b || t < 50) return null;
  const nilai = Math.round((b / (t / 100) ** 2) * 10) / 10;
  const kategori = nilai < 18.5 ? 'Kurang' : nilai < 25 ? 'Normal' : nilai < 30 ? 'Berlebih' : 'Obesitas';
  return { nilai, kategori };
}

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

export function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
