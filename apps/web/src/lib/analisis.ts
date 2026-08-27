/**
 * Analisis deterministik satu pelanggan.
 *
 * SEMUA angka, klasifikasi, dan arah di sini dihitung kode — tidak satu pun
 * berasal dari model bahasa. Itu bukan pilihan gaya: model yang diminta
 * menghitung IMT akan sesekali salah, dan IMT yang salah di lembar yang dibawa
 * pulang pelanggan jauh lebih buruk daripada kalimat yang kaku. Kelak bila
 * narasi AI ditambahkan, ia menerima hasil modul ini sebagai fakta yang tidak
 * boleh ia ubah, dan tugasnya hanya merangkai kalimat di sekelilingnya.
 *
 * Batas dari `rujukan.ts` tetap berlaku seluruhnya: yang dihasilkan adalah
 * PERBANDINGAN terhadap rentang rujukan beserta sumbernya, bukan diagnosis.
 */
import type { Deret, Titik } from './deret';
import { angka } from './deret';
import {
  SASARAN_IMT, UKUR, hitungImt, jarakKeSasaran, nilaiImt, rentangSasaran,
  type Gender, type JenisUkur, type Nada, type Penilaian,
} from './rujukan';

/* ================================= arah ================================= */

export type Arah = 'membaik' | 'memburuk' | 'tetap';

/**
 * Jarak tensi ke sasaran: yang terjauh di antara sistolik dan diastolik.
 *
 * Dua angka, satu penilaian. Kalau hanya sistolik yang dilihat, tensi 118/95
 * akan terbaca membaik padahal diastoliknya yang bermasalah.
 */
function jarakTensi(t: Titik): number | null {
  const sis = t.rekaman.find((r) => r.jenis === 'sistolik');
  const dia = t.rekaman.find((r) => r.jenis === 'diastolik');
  if (!sis || !dia) return null;
  return Math.max(
    jarakKeSasaran(angka(sis.nilai), { min: null, max: 120 }),
    jarakKeSasaran(angka(dia.nilai), { min: null, max: 80 }),
  );
}

function jarakTitik(deret: Deret, t: Titik, gender: Gender): number | null {
  if (deret.kunci === 'tensi') return jarakTensi(t);
  if (t.nilai == null) return null;
  const konteks = t.rekaman[0]?.konteks ?? null;
  const rentang = rentangSasaran(deret.jenis, { gender, konteks });
  return rentang ? jarakKeSasaran(t.nilai, rentang) : null;
}

/**
 * Ambang perubahan yang layak disebut.
 *
 * Alat strip punya galat baca sendiri, dan menyebut "membaik" untuk selisih
 * 1 mg/dL adalah menjanjikan ketelitian yang tidak dimiliki alatnya. Angka di
 * sini sengaja longgar: lebih baik diam daripada memuji perubahan yang
 * sebenarnya derau.
 */
const AMBANG_BERUBAH: Partial<Record<JenisUkur, number>> = {
  gula: 10,
  kolesterol: 10,
  asam_urat: 0.5,
  sistolik: 5,
  diastolik: 5,
  berat: 0.5,
  lingkar_perut: 1,
};

/* =============================== penanda =============================== */

export type Penanda = {
  deret: Deret;
  terbaru: Titik;
  sebelumnya: Titik | null;
  /** Selisih angka mentah, untuk ditulis apa adanya. Null bila tak sebanding. */
  selisih: number | null;
  /** Arah terhadap SASARAN, bukan terhadap besar-kecilnya angka. */
  arah: Arah | null;
  /** Jarak terbaru ke luar rentang sasaran; 0 berarti di dalam. */
  jarak: number | null;
};

export type Analisis = {
  imt: {
    nilai: number;
    penilaian: Penilaian;
    tinggi: number;
    berat: number;
    /** Berat yang membawa IMT ke batas atas sasaran. Bukan "berat ideal". */
    beratSasaran: { min: number; max: number };
  } | null;
  penanda: Penanda[];
  /** Yang berada di luar rentang rujukan, paling mendesak lebih dulu. */
  sorotan: Penanda[];
  /** Yang membaik sejak kunjungan sebelumnya — layak disebut. */
  perbaikan: Penanda[];
  /** Parameter yang belum pernah diukur, agar petugas tahu apa yang kurang. */
  belumDiukur: JenisUkur[];
  /** Waktu pengukuran terbaru di seluruh deret. */
  terakhirDiukur: string | null;
};

const URUT_NADA: Record<Nada, number> = {
  tinggi: 0, rendah: 1, perhatian: 2, normal: 3, netral: 4,
};

/**
 * Parameter yang diharapkan ada pada analisis lengkap. `nadi` tidak masuk:
 * aplikasi tidak punya rentang rujukan untuknya, jadi menyebutnya "belum
 * diukur" akan meminta petugas mengambil angka yang tidak akan dinilai.
 */
const DIHARAPKAN: JenisUkur[] = [
  'tinggi', 'berat', 'lingkar_perut', 'sistolik', 'diastolik',
  'gula', 'kolesterol', 'asam_urat',
];

export function analisa(deret: Deret[], gender: Gender): Analisis {
  const penanda: Penanda[] = deret.map((d) => {
    // `titik` sudah terurut terbaru dulu oleh bangunDeret.
    const terbaru = d.titik[0]!;
    const sebelumnya = d.titik[1] ?? null;

    const jarakBaru = jarakTitik(d, terbaru, gender);
    const jarakLama = sebelumnya ? jarakTitik(d, sebelumnya, gender) : null;

    const selisih = terbaru.nilai != null && sebelumnya?.nilai != null
      ? terbaru.nilai - sebelumnya.nilai
      : null;

    let arah: Arah | null = null;
    if (jarakBaru != null && jarakLama != null) {
      const geser = jarakLama - jarakBaru;
      const ambang = AMBANG_BERUBAH[d.jenis] ?? 0;
      arah = Math.abs(geser) < ambang ? 'tetap' : geser > 0 ? 'membaik' : 'memburuk';
    }

    return { deret: d, terbaru, sebelumnya, selisih, arah, jarak: jarakBaru };
  });

  const diukur = new Set(deret.flatMap((d) => d.titik.flatMap((t) => t.rekaman.map((r) => r.jenis))));

  const waktu = deret.map((d) => d.titik[0]?.waktu).filter((w): w is string => !!w);

  return {
    imt: hitungImtDari(deret),
    penanda,
    sorotan: penanda
      .filter((p) => p.terbaru.penilaian && p.terbaru.penilaian.nada !== 'normal'
        && p.terbaru.penilaian.nada !== 'netral')
      .sort((a, b) =>
        URUT_NADA[a.terbaru.penilaian!.nada] - URUT_NADA[b.terbaru.penilaian!.nada]),
    perbaikan: penanda.filter((p) => p.arah === 'membaik'),
    belumDiukur: DIHARAPKAN.filter((j) => !diukur.has(j)),
    terakhirDiukur: waktu.length ? waktu.sort().at(-1)! : null,
  };
}

/**
 * IMT dari tinggi dan berat TERBARU, meski keduanya diambil pada kunjungan
 * berbeda. Tinggi orang dewasa praktis tetap, jadi memaksa keduanya berasal
 * dari satu kunjungan hanya akan menyembunyikan IMT yang sebenarnya bisa
 * dihitung — dan itulah yang dilakukan petugas di kepalanya.
 */
function hitungImtDari(deret: Deret[]): Analisis['imt'] {
  const ambil = (j: JenisUkur) => deret.find((d) => d.jenis === j)?.titik[0]?.nilai ?? null;
  const tinggi = ambil('tinggi');
  const berat = ambil('berat');
  const imt = hitungImt(tinggi, berat);
  if (imt == null || tinggi == null || berat == null) return null;

  const m = tinggi / 100;
  return {
    nilai: imt,
    penilaian: nilaiImt(imt),
    tinggi,
    berat,
    // Disebut "berat sasaran", bukan "berat ideal": ini semata pembalikan rumus
    // IMT terhadap rentang rujukan yang sama, bukan anjuran perorangan.
    beratSasaran: {
      min: Math.round(SASARAN_IMT.min * m * m * 10) / 10,
      max: Math.round(SASARAN_IMT.max * m * m * 10) / 10,
    },
  };
}

/* ============================ untuk tampilan ============================ */

export function labelArah(p: Penanda): string | null {
  if (!p.arah || !p.sebelumnya) return null;
  if (p.arah === 'tetap') return 'Setara kunjungan sebelumnya';
  const kata = p.arah === 'membaik' ? 'Mendekati rentang rujukan' : 'Menjauhi rentang rujukan';
  if (p.selisih == null) return kata;
  const besar = Math.abs(p.selisih);
  const satuan = UKUR[p.deret.jenis].satuan;
  const tanda = p.selisih > 0 ? 'naik' : 'turun';
  const tulis = UKUR[p.deret.jenis].desimal
    ? besar.toFixed(1).replace('.', ',')
    : String(Math.round(besar));
  return `${kata} — ${tanda} ${tulis} ${satuan}`;
}
