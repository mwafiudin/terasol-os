/**
 * Kondisi peserta satu event, dihitung dari data yang sudah ada di perangkat.
 *
 * Halaman analisis menjawab "bagaimana orang ini"; modul ini menjawab
 * "bagaimana ruangan ini". Keduanya memakai pengklasifikasi yang sama
 * (`penilaianPeserta`), jadi seorang peserta yang di daftar bertanda "Gula
 * darah" pasti ikut terhitung pada batang gula darah di rekap — tidak ada dua
 * pendapat tentang orang yang sama di dua layar yang bersebelahan.
 *
 * Tidak ada rata-rata di sini, dan itu disengaja. "Rata-rata gula darah event
 * ini 142" terbaca seperti temuan epidemiologis, padahal ia 38 pembacaan alat
 * lapangan dalam satu hari; sekali angka itu ada di layar, ia akan dikutip.
 * Sebaran mengatakan hal yang sama tanpa mengundang kutipan itu.
 */
import {
  TEMUAN_LABEL, diLuarRujukan, penilaianPeserta,
  type KodeTemuan, type NilaiRingkas,
} from './analisis';
import { num, usiaTampil } from './domain';
import type { PesertaRingkas } from './pesertaEvent';

/**
 * Tiga tingkat, bukan dua.
 *
 * Rentang perantara — prediabetes, prahipertensi, kolesterol batas tinggi, IMT
 * 23–24,9 — digabungkan ke "aman" akan menyembunyikan justru kelompok yang
 * masih paling bisa berubah arah; digabungkan ke "di luar" membuat angkanya
 * menakutkan dan tidak jujur.
 */
export type Tingkat = 'aman' | 'perhatian' | 'luar';

export type BarisParam = {
  kode: KodeTemuan;
  label: string;
  /** Berapa peserta yang parameter ini benar-benar diperiksa. */
  diukur: number;
  aman: number;
  perhatian: number;
  luar: number;
};

export type KelompokUsia = { label: string; total: number; denganTemuan: number };

export type PerluTindak = {
  peserta: PesertaRingkas;
  usia: number | null;
  /** Temuan yang benar-benar di luar rujukan, terberat lebih dulu. */
  temuan: { kode: KodeTemuan; label: string; tingkat: Exclude<Tingkat, 'aman'> }[];
};

export type RekapKondisi = {
  /** Peserta yang punya sedikitnya satu angka untuk dinilai. */
  dinilai: number;
  /** Peserta yang tercatat tapi belum punya satu pun angka. */
  belumDiukur: number;
  tanpaTemuan: number;
  satuDua: number;
  tigaLebih: number;
  perParam: BarisParam[];
  /** Indeks 0–3 berarti 0, 1, 2, dan 3-atau-lebih temuan. */
  sebaran: [number, number, number, number];
  usia: KelompokUsia[];
  perluTindak: PerluTindak[];
};

/** Batas kelompok usia: batas bawah tiap kelompok, dari muda ke tua. */
const KELOMPOK: { label: string; min: number }[] = [
  { label: '< 40 th', min: 0 },
  { label: '40–54 th', min: 40 },
  { label: '55–64 th', min: 55 },
  { label: '65+ th', min: 65 },
];

const URUT: KodeTemuan[] = [
  'tensi', 'gula', 'kolesterol', 'trigliserida', 'asam_urat', 'imt', 'lingkar_perut',
];

/**
 * Peserta yang belum punya satu angka pun TIDAK dihitung sebagai "tanpa
 * temuan".
 *
 * Mereka bukan orang yang sehat, melainkan orang yang belum diperiksa, dan
 * memasukkannya ke kolom hijau membuat event yang setengah jalan terlihat lebih
 * baik daripada event yang selesai. Mereka dilaporkan terpisah.
 */
export function kondisiEvent(daftar: PesertaRingkas[]): RekapKondisi | null {
  const dipakai = daftar.filter((p) => !p.needsReview);
  if (dipakai.length === 0) return null;

  const perParam = new Map<KodeTemuan, BarisParam>(
    URUT.map((k) => [k, { kode: k, label: TEMUAN_LABEL[k], diukur: 0, aman: 0, perhatian: 0, luar: 0 }]),
  );
  const sebaran: [number, number, number, number] = [0, 0, 0, 0];
  const kelompok = KELOMPOK.map((k) => ({ label: k.label, total: 0, denganTemuan: 0 }));
  const perlu: PerluTindak[] = [];
  let dinilai = 0;
  let belumDiukur = 0;

  for (const p of dipakai) {
    const nilai = penilaianPeserta(p.nilai as NilaiRingkas, p.gender);
    const kunci = Object.keys(nilai) as KodeTemuan[];
    if (kunci.length === 0) { belumDiukur += 1; continue; }
    dinilai += 1;

    const temuan: PerluTindak['temuan'] = [];
    for (const k of kunci) {
      const v = nilai[k]!;
      const baris = perParam.get(k)!;
      baris.diukur += 1;
      if (!diLuarRujukan(v)) baris.aman += 1;
      else if (v.nada === 'perhatian') { baris.perhatian += 1; temuan.push({ kode: k, label: TEMUAN_LABEL[k], tingkat: 'perhatian' }); }
      else { baris.luar += 1; temuan.push({ kode: k, label: TEMUAN_LABEL[k], tingkat: 'luar' }); }
    }

    // Indeksnya sudah dibatasi 0–3, tapi TypeScript hanya melihat `number`
    // masuk ke tuple berpanjang tetap.
    const ember = Math.min(temuan.length, 3) as 0 | 1 | 2 | 3;
    sebaran[ember] += 1;

    const usia = usiaTampil(p.tanggalLahir, num(p.usia));
    if (usia != null) {
      // Kelompok terakhir yang batas bawahnya masih terlampaui.
      const i = KELOMPOK.reduce((acc, k, idx) => (usia >= k.min ? idx : acc), 0);
      kelompok[i]!.total += 1;
      if (temuan.length > 0) kelompok[i]!.denganTemuan += 1;
    }

    if (temuan.length > 0) {
      // Yang benar-benar di luar rujukan lebih dulu, lalu rentang perantara —
      // urutan yang sama dipakai untuk memeringkat orangnya di bawah.
      temuan.sort((a, b) => (a.tingkat === b.tingkat ? 0 : a.tingkat === 'luar' ? -1 : 1));
      perlu.push({ peserta: p, usia, temuan });
    }
  }

  /**
   * Peringkat: jumlah penanda yang di luar rujukan lebih dulu, baru jumlah
   * seluruh temuannya.
   *
   * Orang dengan dua penanda di luar rujukan lebih mendesak daripada orang
   * dengan tiga penanda yang semuanya di rentang perantara, dan mengurutkan
   * hanya menurut banyaknya temuan membalik keduanya.
   */
  const berat = (t: PerluTindak) => t.temuan.filter((x) => x.tingkat === 'luar').length;
  perlu.sort((a, b) => berat(b) - berat(a) || b.temuan.length - a.temuan.length);

  return {
    dinilai,
    belumDiukur,
    tanpaTemuan: sebaran[0],
    satuDua: sebaran[1] + sebaran[2],
    tigaLebih: sebaran[3],
    perParam: [...perParam.values()].filter((b) => b.diukur > 0),
    sebaran,
    usia: kelompok.filter((k) => k.total > 0),
    perluTindak: perlu,
  };
}
