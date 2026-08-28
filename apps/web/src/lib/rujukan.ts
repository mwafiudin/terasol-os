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
  | 'gula' | 'kolesterol' | 'trigliserida' | 'asam_urat';

export type KonteksGula = 'puasa' | 'sewaktu' | '2jam_pp';
export type Gender = 'P' | 'L';

/** Nada penilaian. Deskriptif, bukan vonis. */
export type Nada = 'normal' | 'perhatian' | 'tinggi' | 'rendah' | 'netral';

export type Penilaian = {
  /** Kalimat lengkap dengan angka ambangnya. Dipakai saat baris dibuka. */
  label: string;
  /**
   * Bentuk pendek untuk chip di baris ringkas.
   *
   * Tetap mempertahankan kata "rujukan": itulah yang menjaga kalimat ini
   * sebagai perbandingan, bukan vonis. "Tinggi" muat di chip, tapi ia berhenti
   * menjadi perbandingan dan mulai terdengar seperti diagnosis.
   */
  singkat: string;
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
  trigliserida:  { label: 'Trigliserida',       singkat: 'TG',   satuan: 'mg/dL', kategori: 'darah',        wajar: { min: 30,  max: 800 }, desimal: false, pakaiStrip: true },
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
  // Kartu "Acuan Hasil Pemeriksaan Kesehatan" yang dipegang peserta di event.
  // Angkanya HARUS sama dengan yang tercetak di sana: peserta memegang kertas
  // itu sambil membaca lembar dari aplikasi, dan dua ambang berbeda untuk
  // pemeriksaan yang sama membuat keduanya kehilangan wibawa sekaligus.
  kartu: 'Acuan Hasil Pemeriksaan Kesehatan (kartu event)',
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
  // Nama kategori IMT sudah pendek dan merupakan istilah resminya, jadi hanya
  // "berat badan" yang disingkat.
  const singkat = label.replace('Berat badan ', 'BB ');
  return { label, singkat, nada: imt >= 25 ? 'tinggi' : nada, sumber: SUMBER.imt };
}

export function hitungImt(tinggiCm: number | null, beratKg: number | null): number | null {
  if (!tinggiCm || !beratKg || tinggiCm < 50) return null;
  return Math.round((beratKg / (tinggiCm / 100) ** 2) * 10) / 10;
}

/* ============================== gula darah ============================== */

const DALAM: Pick<Penilaian, 'singkat' | 'nada'> = { singkat: 'Dalam rujukan', nada: 'normal' };
const DI_ATAS: Pick<Penilaian, 'singkat' | 'nada'> = { singkat: 'Di atas rujukan', nada: 'tinggi' };
const PRA_DM: Pick<Penilaian, 'singkat' | 'nada'> = { singkat: 'Prediabetes', nada: 'perhatian' };

/**
 * Batas BAWAH gula darah, dari kartu acuan event (70 mg/dL).
 *
 * Sebelumnya aplikasi diam soal ini: berapa pun rendahnya sebuah angka, ia
 * tetap "dalam rentang rujukan" selama di bawah ambang atas. Padahal gula
 * terlalu rendah adalah temuan yang justru mendesak di tempat, bukan yang bisa
 * ditunda sampai kunjungan berikutnya.
 *
 * Berlaku untuk semua konteks. Ambang ATAS-nya yang berbeda menurut konteks —
 * 130 mg/dL sesudah makan siang wajar, 130 mg/dL puasa sudah prediabetes — dan
 * itulah sebabnya konteksnya tetap ditanyakan meski kartu hanya memuat satu
 * baris "70–99 mg/dL", yang sebenarnya rentang puasa.
 */
const GULA_MIN = 70;

const RENDAH: Pick<Penilaian, 'singkat' | 'nada'> = { singkat: 'Di bawah rujukan', nada: 'rendah' };

export function nilaiGula(mgdl: number, konteks: KonteksGula): Penilaian {
  const s = SUMBER.gula;
  if (mgdl < GULA_MIN) {
    return {
      label: `Di bawah rentang rujukan (<${GULA_MIN})`, ...RENDAH,
      sumber: `${SUMBER.kartu} — batas bawah ${GULA_MIN} mg/dL`,
    };
  }
  if (konteks === 'puasa') {
    if (mgdl < 100) return { label: `Dalam rentang rujukan (${GULA_MIN}–99)`, ...DALAM, sumber: s };
    if (mgdl < 126) return { label: 'Rentang prediabetes (100–125)', ...PRA_DM, sumber: s };
    return { label: 'Di atas rentang rujukan (≥126)', ...DI_ATAS, sumber: s };
  }
  if (konteks === '2jam_pp') {
    if (mgdl < 140) return { label: `Dalam rentang rujukan (${GULA_MIN}–139)`, ...DALAM, sumber: s };
    if (mgdl < 200) return { label: 'Rentang prediabetes (140–199)', ...PRA_DM, sumber: s };
    return { label: 'Di atas rentang rujukan (≥200)', ...DI_ATAS, sumber: s };
  }
  // Sewaktu: hanya ada satu ambang atas yang lazim dipakai.
  if (mgdl < 200) return { label: `Dalam rentang rujukan (${GULA_MIN}–199)`, ...DALAM, sumber: s };
  return { label: 'Di atas rentang rujukan (≥200)', ...DI_ATAS, sumber: s };
}

/* ============================== kolesterol ============================== */

export function nilaiKolesterol(mgdl: number): Penilaian {
  const s = SUMBER.kolesterol;
  if (mgdl < 200) return { label: 'Dalam rentang rujukan (<200)', ...DALAM, sumber: s };
  if (mgdl < 240) return { label: 'Batas tinggi (200–239)', singkat: 'Batas tinggi', nada: 'perhatian', sumber: s };
  return { label: 'Di atas rentang rujukan (≥240)', ...DI_ATAS, sumber: s };
}

/* ============================= trigliserida ============================= */

/**
 * Ambang tunggal <150 mg/dL, persis seperti di kartu acuan event.
 *
 * Rentang perantara 150–199 ("batas tinggi") memang ada di pedoman lipid, dan
 * ia sengaja TIDAK dipakai di sini: kartu yang dipegang peserta hanya menyebut
 * satu angka, dan menambahkan tingkat yang tidak tercetak di sana membuat
 * lembar aplikasi mengatakan sesuatu yang tidak bisa dicari peserta di
 * kertasnya sendiri.
 */
export function nilaiTrigliserida(mgdl: number): Penilaian {
  const s = `${SUMBER.kartu} — trigliserida <150 mg/dL`;
  return mgdl < 150
    ? { label: 'Dalam rentang rujukan (<150)', ...DALAM, sumber: s }
    : { label: 'Di atas rentang rujukan (≥150)', ...DI_ATAS, sumber: s };
}

/* ============================== asam urat ============================== */

/**
 * Ambang ATAS saja, mengikuti kartu acuan event: pria <7, wanita <6 mg/dL.
 *
 * Sebelumnya ada batas bawah (pria 3,4; wanita 2,4) dari nilai rujukan
 * laboratorium umum. Batas itu dilepas bersama angka atasnya karena kartu tidak
 * memuatnya — dan asam urat rendah nyaris tidak pernah menjadi tindakan di
 * sebuah event skrining, sementara "di bawah rentang rujukan" yang muncul di
 * lembar peserta pasti menimbulkan pertanyaan yang tidak bisa dijawab petugas.
 */
export const AMBANG_ASAM_URAT: Record<Gender, number> = { L: 7, P: 6 };

export function nilaiAsamUrat(mgdl: number, gender: Gender): Penilaian {
  const ambang = AMBANG_ASAM_URAT[gender];
  const s = `${SUMBER.kartu} — asam urat ${gender === 'L' ? 'pria' : 'wanita'} <${ambang} mg/dL`;
  return mgdl >= ambang
    ? { label: `Di atas rentang rujukan (≥${ambang})`, ...DI_ATAS, sumber: s }
    : { label: `Dalam rentang rujukan (<${ambang})`, ...DALAM, sumber: s };
}

/* ============================ tekanan darah ============================ */

export function nilaiTensi(sistolik: number, diastolik: number): Penilaian {
  const s = SUMBER.tensi;
  if (sistolik >= 140 || diastolik >= 90) {
    return { label: 'Di atas rentang rujukan (≥140/90)', ...DI_ATAS, sumber: s };
  }
  if (sistolik >= 120 || diastolik >= 80) {
    return { label: 'Prahipertensi (120–139 / 80–89)', singkat: 'Prahipertensi', nada: 'perhatian', sumber: s };
  }
  return { label: 'Dalam rentang rujukan (<120/80)', ...DALAM, sumber: s };
}

/* ============================ lingkar perut ============================ */

export const AMBANG_LINGKAR_PERUT: Record<Gender, number> = { L: 90, P: 80 };

export function nilaiLingkarPerut(cm: number, gender: Gender): Penilaian {
  const ambang = AMBANG_LINGKAR_PERUT[gender];
  const s = `${SUMBER.lingkarPerut} (${gender === 'L' ? 'pria' : 'wanita'} <${ambang} cm)`;
  return cm >= ambang
    ? { label: `Di atas ambang (≥${ambang} cm)`, singkat: 'Di atas ambang', nada: 'tinggi', sumber: s }
    : { label: `Dalam rentang rujukan (<${ambang} cm)`, ...DALAM, sumber: s };
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
    case 'trigliserida':
      return nilaiTrigliserida(nilai);
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

/**
 * Batas KERAS, disalin dari CHECK constraint `screenings_*_check`.
 *
 * Ini bukan "rentang wajar" (US-03) yang boleh dilewati dengan konfirmasi —
 * ini batas yang MENOLAK baris di basis data. Perbedaannya pernah menjatuhkan
 * satu event: petugas mengetik kolesterol 0 saat alatnya tidak membaca, layar
 * hanya meminta konfirmasi "di luar rentang wajar", dan angka itu tersimpan di
 * perangkat lalu ditolak server selamanya. Tujuh belas record mengantre di
 * belakangnya tanpa ada yang tahu record mana penyebabnya.
 *
 * Disalin, bukan ditarik dari server: perangkat harus bisa menegakkannya saat
 * offline, justru ketika kesalahan ini paling mungkin terjadi. Kalau CHECK di
 * basis data berubah, angka di sini ikut diubah — dan uji e2e yang mengirim
 * nilai di luar batas inilah yang akan menangkap kalau lupa.
 */
export const BATAS_KERAS: Record<JenisUkur, { min: number; max: number }> = {
  tinggi:        { min: 50, max: 250 },
  berat:         { min: 1,  max: 400 },
  lingkar_perut: { min: 20, max: 300 },
  sistolik:      { min: 30, max: 350 },
  diastolik:     { min: 20, max: 250 },
  nadi:          { min: 20, max: 300 },
  gula:          { min: 10, max: 1000 },
  kolesterol:    { min: 20, max: 800 },
  trigliserida:  { min: 20, max: 2000 },
  asam_urat:     { min: 0,  max: 50 },
};

/**
 * Nilai yang TIDAK BISA disimpan sama sekali. Mengembalikan alasannya, atau
 * null bila angkanya masih bisa diterima.
 */
export function ditolakBasisData(jenis: JenisUkur, nilai: number): string | null {
  const b = BATAS_KERAS[jenis];
  if (nilai >= b.min && nilai <= b.max) return null;
  return `${UKUR[jenis].label} ${nilai} tidak bisa disimpan (batas ${b.min}–${b.max} ${UKUR[jenis].satuan}). `
    + 'Kosongkan bila tidak diperiksa.';
}

export function diLuarWajar(jenis: JenisUkur, nilai: number): boolean {
  const w = UKUR[jenis].wajar;
  return nilai < w.min || nilai > w.max;
}

/* ============================ rentang sasaran ============================ */

/**
 * Batas angka rentang rujukan, untuk dipakai membandingkan dua kunjungan.
 *
 * Ada terpisah dari `nilaiUkur` karena keduanya menjawab pertanyaan berbeda:
 * yang itu menjawab "angka ini masuk kategori apa", yang ini menjawab "seberapa
 * jauh dari sasaran". Yang kedua diperlukan untuk menyatakan arah — dan arah
 * TIDAK BISA disimpulkan dari naik-turunnya angka saja: asam urat yang turun
 * dari 6,4 ke 2,0 adalah perburukan, bukan perbaikan.
 *
 * `null` berarti tidak ada rentang yang pantas dibandingkan, sama seperti
 * `nilaiUkur` memilih diam ketimbang mengarang.
 *
 * PERINGATAN: angka di sini WAJIB sama dengan ambang di fungsi `nilai*` di
 * atas. Keduanya berdampingan agar berubah bersama-sama; kalau suatu saat
 * dipisah berkas, keduanya akan menyimpang tanpa ada yang menyadarinya.
 */
export function rentangSasaran(
  jenis: JenisUkur,
  opsi: { gender?: Gender; konteks?: KonteksGula | null } = {},
): { min: number | null; max: number | null } | null {
  switch (jenis) {
    case 'gula': {
      const k = opsi.konteks ?? 'sewaktu';
      const max = k === 'puasa' ? 100 : k === '2jam_pp' ? 140 : 200;
      return { min: GULA_MIN, max };
    }
    case 'kolesterol':
      return { min: null, max: 200 };
    case 'trigliserida':
      return { min: null, max: 150 };
    case 'asam_urat':
      return opsi.gender ? { min: null, max: AMBANG_ASAM_URAT[opsi.gender] } : null;
    case 'lingkar_perut':
      return opsi.gender ? { min: null, max: AMBANG_LINGKAR_PERUT[opsi.gender] } : null;
    // Tensi dinilai dari sepasang angka, jadi jaraknya dihitung pemanggil dari
    // kedua ambang sekaligus (lihat `jarakTensi` di analisis.ts).
    case 'sistolik':
      return { min: null, max: 120 };
    case 'diastolik':
      return { min: null, max: 80 };
    default:
      return null;
  }
}

/** Rentang sasaran IMT Asia-Pasifik — sama dengan ambang di `nilaiImt`. */
export const SASARAN_IMT = { min: 18.5, max: 23 };

/**
 * Seberapa jauh sebuah angka berada DI LUAR rentang sasaran. Nol berarti di
 * dalam. Selalu positif, sehingga mengecil = mendekati sasaran, apa pun arah
 * penyimpangannya.
 */
export function jarakKeSasaran(
  nilai: number,
  rentang: { min: number | null; max: number | null },
): number {
  if (rentang.max != null && nilai > rentang.max) return nilai - rentang.max;
  if (rentang.min != null && nilai < rentang.min) return rentang.min - nilai;
  return 0;
}
