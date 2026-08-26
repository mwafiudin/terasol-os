/** Aturan domain yang dipakai bersama API dan (disalin) oleh aplikasi web. */

export type ParamKey =
  | 'tinggi' | 'berat' | 'sistolik' | 'diastolik' | 'gula' | 'kolesterol' | 'asam_urat';

/**
 * Rentang wajar per parameter (US-03). Ini BUKAN batas keras: nilai di luar
 * rentang tetap boleh tersimpan setelah petugas konfirmasi ulang — yang
 * disimpan lalu ditandai `out_of_range`. Batas keras ada di CHECK constraint.
 */
export const PARAM_RANGE: Record<ParamKey, { min: number; max: number; unit: string; label: string }> = {
  tinggi:     { min: 120, max: 210, unit: 'cm',    label: 'Tinggi badan' },
  berat:      { min: 30,  max: 180, unit: 'kg',    label: 'Berat badan' },
  sistolik:   { min: 70,  max: 250, unit: 'mmHg',  label: 'Tensi — sistolik' },
  diastolik:  { min: 40,  max: 150, unit: 'mmHg',  label: 'Tensi — diastolik' },
  gula:       { min: 50,  max: 500, unit: 'mg/dL', label: 'Gula darah' },
  kolesterol: { min: 100, max: 400, unit: 'mg/dL', label: 'Kolesterol' },
  asam_urat:  { min: 2,   max: 15,  unit: 'mg/dL', label: 'Asam urat' },
};

export const PARAM_KEYS = Object.keys(PARAM_RANGE) as ParamKey[];

export function isOutOfRange(key: ParamKey, value: number | null | undefined): boolean {
  if (value == null) return false;
  const r = PARAM_RANGE[key];
  return value < r.min || value > r.max;
}

/**
 * Parameter yang memakai strip sekali pakai, jadi punya biaya consumable.
 * Harganya sendiri TIDAK ada di sini — itu masukan bisnis per cabang yang
 * disimpan di `tenants.consumable_prices` (migrasi 003). Menaruh angka di kode
 * berarti mengarang biaya yang lalu ikut ke setiap rekap tanpa ada yang sadar.
 */
export const CONSUMABLE_PARAMS: ParamKey[] = ['gula', 'kolesterol', 'asam_urat'];

/** Kategori IMT. Deskriptif saja — bukan interpretasi atau saran medis (§3). */
export function imtCategory(imt: number | null): string | null {
  if (imt == null) return null;
  if (imt < 18.5) return 'Kurang';
  if (imt < 25) return 'Normal';
  if (imt < 30) return 'Berlebih';
  return 'Obesitas';
}
