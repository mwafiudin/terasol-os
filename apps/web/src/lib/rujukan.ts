/**
 * Rentang rujukan pemeriksaan.
 *
 * PENTING — batas yang harus dijaga:
 *
 * Yang ditampilkan di sini adalah PERBANDINGAN angka terhadap rentang rujukan
 * yang diterbitkan, lengkap dengan sumbernya. Itu BUKAN diagnosis, dan tidak
 * boleh ditulis seolah-olah diagnosis. "Di atas rentang rujukan" boleh;
 * "Anda menderita diabetes" tidak — kalimat kedua memindahkan produk ini dari
 * kategori wellness ke kategori yang memerlukan pengawasan medis berbeda.
 *
 * PRD §3 dan Non-Goals melarang "rekomendasi kesehatan, interpretasi hasil,
 * atau saran medis apapun". Menampilkan penilaian di sini adalah keputusan
 * sadar pemilik produk, dengan syarat: selalu disertai sumber rujukan dan
 * disclaimer. PRD-nya perlu diperbarui agar tidak bertentangan dengan yang
 * benar-benar dibangun.
 */

export type JenisUkur =
  | 'tinggi' | 'berat' | 'lingkar_perut'
  | 'sistolik' | 'diastolik' | 'nadi'
  | 'gula' | 'kolesterol' | 'asam_urat';

export type KonteksGula = 'puasa' | 'sewaktu' | '2jam_pp';
export type Gender = 'P' | 'L';

/** Nada penilaian. Deskriptif, bukan vonis. */
export type Nada = 'normal' | 'perhatian' | 'tinggi' | 'rendah' | 'netral';

export type Penilaian = {
  label: string;
  nada: Nada;
  sumber: string;
};

export const DISCLAIMER =
  'Angka dan perbandingan di atas bukan diagnosis. Rentang rujukan hanya '
  + 'pembanding umum dan bisa berbeda menurut kondisi tiap orang, alat, serta '
  + 'laboratorium. Untuk penilaian kesehatan, rujuk ke tenaga medis.';

/* ============================ katalog parameter ============================ */

export type KategoriUkur = 'antropometri' | 'tensi' | 'darah';

export const UKUR: Record<JenisUkur, {
  label: string;
  singkat: string;
  satuan: string;
  kategori: KategoriUkur;
  /** Rentang wajar — di luar ini petugas diminta konfirmasi (US-03). */
  wajar: { min: number; max: number };
  desimal: boolean;
  /** Memakai strip sekali pakai, jadi menimbulkan biaya consumable. */
  pakaiStrip: boolean;
}> = {
  tinggi:        { label: 'Tinggi badan',      singkat: 'TB',   satuan: 'cm',    kategori: 'antropometri', wajar: { min: 120, max: 210 }, desimal: true,  pakaiStrip: false },
  berat:         { label: 'Berat badan',       singkat: 'BB',   satuan: 'kg',    kategori: 'antropometri', wajar: { min: 30,  max: 180 }, desimal: true,  pakaiStrip: false },
  lingkar_perut: { label: 'Lingkar perut',     singkat: 'LP',   satuan: 'cm',    kategori: 'antropometri', wajar: { min: 40,  max: 200 }, desimal: true,  pakaiStrip: false },
  sistolik:      { label: 'Tensi — sistolik',  singkat: 'SIS',  satuan: 'mmHg',  kategori: 'tensi',        wajar: { min: 70,  max: 250 }, desimal: false, pakaiStrip: false },
  diastolik:     { label: 'Tensi — diastolik', singkat: 'DIA',  satuan: 'mmHg',  kategori: 'tensi',        wajar: { min: 40,  max: 150 }, desimal: false, pakaiStrip: false },
  nadi:          { label: 'Nadi',              singkat: 'NADI', satuan: 'bpm',   kategori: 'tensi',        wajar: { min: 40,  max: 180 }, desimal: false, pakaiStrip: false },
  gula:          { label: 'Gula darah',        singkat: 'GD',   satuan: 'mg/dL', kategori: 'darah',        wajar: { min: 50,  max: 500 }, desimal: false, pakaiStrip: true },
  kolesterol:    { label: 'Kolesterol total',  singkat: 'KOL',  satuan: 'mg/dL', kategori: 'darah',        wajar: { min: 100, max: 400 }, desimal: false, pakaiStrip: true },
  asam_urat:     { label: 'Asam urat',         singkat: 'AU',   satuan: 'mg/dL', kategori: 'darah',        wajar: { min: 2,   max: 15  }, desimal: true,  pakaiStrip: true },
};

export const KATEGORI_LABEL: Record<KategoriUkur, string> = {
  antropometri: 'Antropometri',
  tensi: 'Tekanan darah',
  darah: 'Pemeriksaan darah',
};

/**
 * Jenis gula darah. Angkanya TIDAK sebanding satu sama lain, jadi konteksnya
 * wajib dicatat — 140 mg/dL setelah puasa dan 140 mg/dL dua jam setelah makan
 * berarti dua hal yang berbeda.
 */
export const KONTEKS_GULA: { k: KonteksGula; kode: string; label: string; syarat: string }[] = [
  { k: 'sewaktu', kode: 'GDS',   label: 'Sewaktu',            syarat: 'Kapan saja, tanpa memandang waktu makan' },
  { k: 'puasa',   kode: 'GDP',   label: 'Puasa',              syarat: 'Puasa minimal 8 jam, hanya boleh air putih' },
  { k: '2jam_pp', kode: 'GD2PP', label: '2 jam setelah makan', syarat: 'Diukur 2 jam setelah makan atau minum larutan glukosa' },
];

/* ============================ sumber rujukan ============================ */

const SUMBER = {
  imt: 'Klasifikasi IMT WHO Asia-Pasifik (dipakai Kemenkes)',
  gula: 'Pedoman Pengelolaan dan Pencegahan Diabetes Melitus Tipe 2 di Indonesia (2024)',
  kolesterol: 'Nilai rujukan kolesterol total dewasa',
  asamUrat: 'Nilai rujukan asam urat dewasa menurut jenis kelamin',
  tensi: 'Klasifikasi tekanan darah JNC VII',
  lingkarPerut: 'Ambang obesitas sentral Asia-Pasifik',
} as const;

/* ================================== IMT ================================== */

/**
 * Ambang Asia-Pasifik, BUKAN WHO global. Bedanya nyata: obesitas dimulai dari
 * 25, bukan 30, dan 23 sudah terhitung berat badan lebih. Memakai ambang global
 * akan menyebut "normal" orang yang menurut standar Indonesia sudah berlebih.
 */
export function nilaiImt(imt: number): Penilaian {
  const nada: Nada = imt < 18.5 ? 'rendah' : imt < 23 ? 'normal' : 'perhatian';
  const label =
    imt < 18.5 ? 'Berat badan kurang'
      : imt < 23 ? 'Normal'
        : imt < 25 ? 'Berat badan lebih'
          : imt < 30 ? 'Obesitas I'
            : 'Obesitas II';
  return { label, nada: imt >= 25 ? 'tinggi' : nada, sumber: SUMBER.imt };
}

export function hitungImt(tinggiCm: number | null, beratKg: number | null): number | null {
  if (!tinggiCm || !beratKg || tinggiCm < 50) return null;
  return Math.round((beratKg / (tinggiCm / 100) ** 2) * 10) / 10;
}

/* ============================== gula darah ============================== */

export function nilaiGula(mgdl: number, konteks: KonteksGula): Penilaian {
  const s = SUMBER.gula;
  if (konteks === 'puasa') {
    if (mgdl < 100) return { label: 'Dalam rentang rujukan', nada: 'normal', sumber: s };
    if (mgdl < 126) return { label: 'Rentang prediabetes (100–125)', nada: 'perhatian', sumber: s };
    return { label: 'Di atas rentang rujukan (≥126)', nada: 'tinggi', sumber: s };
  }
  if (konteks === '2jam_pp') {
    if (mgdl < 140) return { label: 'Dalam rentang rujukan', nada: 'normal', sumber: s };
    if (mgdl < 200) return { label: 'Rentang prediabetes (140–199)', nada: 'perhatian', sumber: s };
    return { label: 'Di atas rentang rujukan (≥200)', nada: 'tinggi', sumber: s };
  }
  // Sewaktu: hanya ada satu ambang yang lazim dipakai.
  if (mgdl < 200) return { label: 'Dalam rentang rujukan (<200)', nada: 'normal', sumber: s };
  return { label: 'Di atas rentang rujukan (≥200)', nada: 'tinggi', sumber: s };
}

/* ============================== kolesterol ============================== */

export function nilaiKolesterol(mgdl: number): Penilaian {
  const s = SUMBER.kolesterol;
  if (mgdl < 200) return { label: 'Dalam rentang rujukan (<200)', nada: 'normal', sumber: s };
  if (mgdl < 240) return { label: 'Batas tinggi (200–239)', nada: 'perhatian', sumber: s };
  return { label: 'Di atas rentang rujukan (≥240)', nada: 'tinggi', sumber: s };
}

/* ============================== asam urat ============================== */

export const RENTANG_ASAM_URAT: Record<Gender, { min: number; max: number }> = {
  L: { min: 3.4, max: 7.6 },
  P: { min: 2.4, max: 6.0 },
};

export function nilaiAsamUrat(mgdl: number, gender: Gender): Penilaian {
  const r = RENTANG_ASAM_URAT[gender];
  const s = `${SUMBER.asamUrat} (${gender === 'L' ? 'pria' : 'wanita'} ${r.min}–${r.max})`;
  if (mgdl < r.min) return { label: 'Di bawah rentang rujukan', nada: 'rendah', sumber: s };
  if (mgdl > r.max) return { label: 'Di atas rentang rujukan', nada: 'tinggi', sumber: s };
  return { label: 'Dalam rentang rujukan', nada: 'normal', sumber: s };
}

/* ============================ tekanan darah ============================ */

export function nilaiTensi(sistolik: number, diastolik: number): Penilaian {
  const s = SUMBER.tensi;
  if (sistolik >= 140 || diastolik >= 90) {
    return { label: 'Di atas rentang rujukan (≥140/90)', nada: 'tinggi', sumber: s };
  }
  if (sistolik >= 120 || diastolik >= 80) {
    return { label: 'Prahipertensi (120–139 / 80–89)', nada: 'perhatian', sumber: s };
  }
  return { label: 'Dalam rentang rujukan (<120/80)', nada: 'normal', sumber: s };
}

/* ============================ lingkar perut ============================ */

export const AMBANG_LINGKAR_PERUT: Record<Gender, number> = { L: 90, P: 80 };

export function nilaiLingkarPerut(cm: number, gender: Gender): Penilaian {
  const ambang = AMBANG_LINGKAR_PERUT[gender];
  const s = `${SUMBER.lingkarPerut} (${gender === 'L' ? 'pria' : 'wanita'} <${ambang} cm)`;
  return cm >= ambang
    ? { label: `Di atas ambang (≥${ambang} cm)`, nada: 'tinggi', sumber: s }
    : { label: 'Dalam rentang rujukan', nada: 'normal', sumber: s };
}

/* ============================== gabungan ============================== */

/**
 * Penilaian satu angka. Mengembalikan null bila memang tidak ada rujukan yang
 * pantas dibandingkan (tinggi, berat, nadi berdiri sendiri) — lebih baik diam
 * daripada mengarang penilaian.
 */
export function nilaiUkur(
  jenis: JenisUkur,
  nilai: number,
  opsi: { gender?: Gender; konteks?: KonteksGula | null; pasangan?: number | null } = {},
): Penilaian | null {
  switch (jenis) {
    case 'gula':
      return nilaiGula(nilai, opsi.konteks ?? 'sewaktu');
    case 'kolesterol':
      return nilaiKolesterol(nilai);
    case 'asam_urat':
      return opsi.gender ? nilaiAsamUrat(nilai, opsi.gender) : null;
    case 'lingkar_perut':
      return opsi.gender ? nilaiLingkarPerut(nilai, opsi.gender) : null;
    case 'sistolik':
      return opsi.pasangan != null ? nilaiTensi(nilai, opsi.pasangan) : null;
    case 'diastolik':
      return opsi.pasangan != null ? nilaiTensi(opsi.pasangan, nilai) : null;
    default:
      return null;
  }
}

export function diLuarWajar(jenis: JenisUkur, nilai: number): boolean {
  const w = UKUR[jenis].wajar;
  return nilai < w.min || nilai > w.max;
}
