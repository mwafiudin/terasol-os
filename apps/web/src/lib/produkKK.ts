/**
 * Katalog produk KK Indonesia.
 *
 * Dihimpun dari kkigroup.co.id/kesehatan-alami dan fitsolofficial.com
 * (diambil 27 Agustus 2026). Seluruh isi `ringkas`, `komposisi`, `manfaat`,
 * dan `saji` adalah KETERANGAN PRODUSEN, disalin apa adanya dan tidak
 * ditafsirkan ulang di sini.
 *
 * Berbeda dari tabel `katalog` di basis data, yang berisi apa yang dijual tiap
 * cabang beserta harganya dan memang berbeda per cabang. Yang ini keterangan
 * produk dari produsen: sama di seluruh cabang, jarang berubah, dan harus
 * terbaca tanpa jaringan — petugas membukanya justru saat sedang berhadapan
 * dengan orang di meja.
 *
 * Bila kelak perlu disunting dari dalam aplikasi, ia pindah ke basis data.
 * Selama masih disunting lewat rilis, berkas ini tempat yang tepat.
 */
import type { JenisUkur } from './rujukan';

export type SeriProduk = 'Fitsol' | 'Vitayang' | 'Lainnya';

export type Produk = {
  id: string;
  nama: string;
  seri: SeriProduk;
  /** Kalimat produsen, satu baris. */
  ringkas: string;
  komposisi: string[];
  /** Manfaat menurut produsen. Disalin, bukan disimpulkan. */
  manfaat: string[];
  /** Aturan saji bila produsen menyebutkannya. */
  saji: string | null;
  tautan: string | null;
  /**
   * Penanda pemeriksaan yang DISEBUT PRODUSEN berkaitan dengan produk ini.
   *
   * Diturunkan dari kalimat produsen sendiri — "Suplemen Kesehatan Diabetes"
   * dan "membantu metabolisme glukosa" menjadi `gula`. Dipakai untuk menautkan
   * produk ke hasil pemeriksaan seseorang; bukan pernyataan bahwa produknya
   * mengubah angka itu.
   */
  penanda: JenisUkur[];
};

export const PRODUK_KK: Produk[] = [
  /* ------------------------------ Fitsol ------------------------------ */
  {
    id: 'fitsol-cn',
    nama: 'Fitsol Cell Nutrition (CN)',
    seri: 'Fitsol',
    ringkas: 'Serbuk larut air, bagian nutrisi sel dari rangkaian Fitsol.',
    komposisi: [
      '32 enzim dasar dari berbagai buah dan sayuran',
      '12 jenis selulosa lunak dan keras, larut dan tidak larut',
      '2 jenis herba asli Swiss',
      'Probiotik aktif (probiotik AB lengkap)',
      'Fruktooligosakarida',
      'Antioksidan alami (vitamin A, C, dan E)',
      'Trace element (Selenium)',
    ],
    manfaat: [
      'Menyediakan nutrisi esensial',
      'Meningkatkan kesehatan usus dan pencernaan',
      'Imunitas, detoksifikasi, kecantikan, dan penyembuhan diri',
    ],
    saji: null,
    tautan: 'https://kkd.id/product/fit-sol-cell-nutrition',
    penanda: ['gula', 'kolesterol'],
  },
  {
    id: 'fitsol-ce',
    nama: 'Fitsol Cell Energy (CE)',
    seri: 'Fitsol',
    ringkas: 'Bagian energi sel dari rangkaian Fitsol.',
    komposisi: [
      'Vitamin B1, B2, B3, B6, B12',
      'Vitamin C',
      'Asam folat',
      'Buah guarana',
      'Alga cokelat',
      'Sereal hijau',
    ],
    manfaat: [
      'Dalam 10 menit setelah dikonsumsi, kadar oksigen naik 15%',
      'Meningkatkan suhu tubuh',
      'Membuka jalur seluler',
      'Memulihkan kapasitas oksigen optimal',
    ],
    saji: null,
    tautan: 'http://fitsolofficial.com',
    penanda: [],
  },
  {
    id: 'fitsol-cm',
    nama: 'Fitsol Cell Mineral (CM)',
    seri: 'Fitsol',
    ringkas: 'Bagian mineral sel dari rangkaian Fitsol.',
    komposisi: ['Kalsium', 'Magnesium', 'Vitamin D', 'Zinc', 'Kromium', 'Selenium'],
    manfaat: [
      'Menyeimbangkan pH',
      'Mendukung detoksifikasi',
      'Menguatkan tulang',
      'Merilekskan otot dan sendi',
      'Memperbaiki kesehatan rambut dan kulit',
      'Meningkatkan kualitas tidur',
    ],
    saji: null,
    tautan: 'http://fitsolofficial.com',
    penanda: ['gula'],
  },
  {
    id: 'fitsol-protein',
    nama: 'Fitsol Vegan Protein',
    seri: 'Fitsol',
    ringkas: 'Protein nabati dalam bentuk serbuk.',
    komposisi: ['Protein nabati'],
    manfaat: ['Memenuhi kebutuhan protein harian'],
    saji: 'Masukkan 2 sendok takar besar ke dalam 250 ml air.',
    tautan: 'http://fitsolofficial.com',
    penanda: [],
  },
  {
    id: 'fitsol-omega',
    nama: 'Fitsol Omega 3',
    seri: 'Fitsol',
    ringkas: 'Omega-3 dalam bentuk serbuk larut air.',
    komposisi: ['Omega-3'],
    manfaat: ['Menyediakan asam lemak esensial'],
    saji: '3 sendok takar kecil ke dalam 50 ml air, diminum 1 jam sebelum makan.',
    tautan: 'http://fitsolofficial.com',
    penanda: ['kolesterol'],
  },

  /* ----------------------------- Vitayang ----------------------------- */
  {
    id: 'vitayang-milchrom',
    nama: 'Vitayang Milchrom',
    seri: 'Vitayang',
    ringkas: 'Suplemen kesehatan diabetes.',
    komposisi: ['Kromium'],
    manfaat: [
      'Membantu kerja insulin dan metabolisme glukosa',
      'Mengatasi gula darah tinggi',
    ],
    saji: null,
    tautan: 'https://kkigroup.co.id/vitayang-milchrom/',
    penanda: ['gula'],
  },
  {
    id: 'vitayang-omega3',
    nama: 'Vitayang Omega-3',
    seri: 'Vitayang',
    ringkas: 'Minyak ikan.',
    komposisi: ['EPA', 'DHA'],
    manfaat: ['Mendukung kesehatan optimal', 'Menyediakan asam lemak esensial'],
    saji: null,
    tautan: 'https://kkd.id/product/vitayang-omega-3',
    penanda: ['kolesterol'],
  },
  {
    id: 'vitayang-rawmeal',
    nama: 'Vitayang Raw Meal',
    seri: 'Vitayang',
    ringkas: 'Minuman serbuk sereal, diproses dengan teknologi freeze drying.',
    komposisi: ['Sereal'],
    manfaat: [
      'Praktis disimpan jangka panjang',
      'Cocok untuk gaya hidup aktif',
    ],
    saji: null,
    tautan: 'https://kkd.id/search?q=raw%20meal',
    penanda: [],
  },
  {
    id: 'vitayang-bekatul',
    nama: 'Vitayang Bekatul Beras Merah',
    seri: 'Vitayang',
    ringkas: 'Suplemen alami dari bekatul beras merah.',
    komposisi: ['Bekatul beras merah'],
    manfaat: ['Memelihara vitalitas', 'Menjaga keseimbangan tubuh'],
    saji: null,
    tautan: 'https://kkd.id/product/vitayang-bekatul-beras-merah',
    penanda: [],
  },
  {
    id: 'vitayang-calcium',
    nama: 'Vitayang Marine Calcium',
    seri: 'Vitayang',
    ringkas: 'Suplemen kalsium dari tulang ikan.',
    komposisi: ['Kalsium dari tulang ikan'],
    manfaat: [
      'Memenuhi kebutuhan kalsium harian',
      'Mendukung kesehatan tulang dan gigi',
    ],
    saji: null,
    tautan: 'https://kkd.id/product/vitayang-marine-calcium',
    penanda: [],
  },
  {
    id: 'vitayang-stopirai',
    nama: 'Vitayang Stopirai',
    seri: 'Vitayang',
    ringkas: 'Kapsul Stopirai.',
    komposisi: [],
    manfaat: ['Meredakan pegal linu dan nyeri sendi'],
    saji: null,
    tautan: 'https://kkd.id/search?q=stopirai',
    penanda: ['asam_urat'],
  },

  /* ----------------------------- lainnya ----------------------------- */
  {
    id: 'supergreen',
    nama: 'Supergreen Food (SGF)',
    seri: 'Lainnya',
    ringkas: 'Multivitamin padat gizi penunjang aktivitas.',
    komposisi: ['Alga Chlorella sorokiniana', 'Spirulina platensis'],
    manfaat: ['Memelihara daya tahan tubuh'],
    saji: null,
    tautan: 'https://kksgf.com/',
    penanda: ['kolesterol', 'sistolik'],
  },
  {
    id: 'pureway-c',
    nama: 'Pureway C Booster',
    seri: 'Lainnya',
    ringkas: 'Vitamin C Pureway-C.',
    komposisi: ['Vitamin C (Pureway-C)'],
    manfaat: [
      'Menjaga daya tahan tubuh',
      'Mendukung metabolisme',
      'Menunjang fungsi enzim dan hormon',
    ],
    saji: null,
    tautan: 'https://kkd.id/product/pureway-c-booster',
    penanda: [],
  },
  {
    id: 'niwana-sod',
    nama: 'Niwana SOD',
    seri: 'Lainnya',
    ringkas: 'Suplemen multi antioksidan.',
    komposisi: ['Antioksidan'],
    manfaat: [
      'Meningkatkan efektivitas',
      'Mencegah kerusakan oksidatif',
      'Memperbaiki produksi antioksidan tubuh',
    ],
    saji: null,
    tautan: 'https://kkd.id/search?q=Niwana',
    penanda: [],
  },
  {
    id: 'salmon-peptide',
    nama: 'Salmon Peptide (SOP)',
    seri: 'Lainnya',
    ringkas: 'Salmon Ovary Peptide.',
    komposisi: ['Salmon ovary peptide'],
    manfaat: [
      'Memelihara kesehatan kulit dan tubuh',
      'Mengatasi penuaan sel dan organ',
      'Mencegah gangguan kesehatan',
    ],
    saji: null,
    tautan: 'https://kkd.id/search?q=sop',
    penanda: [],
  },
  {
    id: 'coq10',
    nama: 'Coenzyme Q-10',
    seri: 'Lainnya',
    ringkas: 'Koenzim Q-10 (Co-Q10).',
    komposisi: ['Koenzim Q-10'],
    manfaat: ['Penting dalam produksi ATP', 'Penetral radikal bebas'],
    saji: null,
    tautan: 'https://kkd.id/product/coenzyme-q10',
    penanda: [],
  },
  {
    id: 'susu-skim',
    nama: 'Susu Bubuk Skim',
    seri: 'Lainnya',
    ringkas: 'Susu bubuk skim dengan kolostrum dan probiotik.',
    komposisi: ['Kolostrum', 'Inulin', 'DHA', 'Probiotik', 'Vitamin', 'Mineral'],
    manfaat: [
      'Menjaga kesehatan',
      'Mendukung daya tahan tubuh',
      'Memenuhi kebutuhan nutrisi harian',
    ],
    saji: null,
    tautan: 'https://kkd.id/search?q=susu%20bubuk%20skim',
    penanda: [],
  },
  {
    id: 'royal-honey',
    nama: 'Royal Honey',
    seri: 'Lainnya',
    ringkas: 'Madu dengan campuran sari kurma dan herbal.',
    komposisi: [
      'Sari kurma', 'Minyak zaitun', 'Jintan hitam', 'Ginseng', 'Royal jelly',
      'Ekstrak buah dan herbal',
    ],
    manfaat: ['Memelihara kesehatan', 'Menyegarkan tubuh'],
    saji: null,
    tautan: 'https://kkd.id/product/royal-honey',
    penanda: [],
  },
];

export const SERI_URUT: SeriProduk[] = ['Fitsol', 'Vitayang', 'Lainnya'];

/** Produk yang produsennya kaitkan dengan sebuah penanda pemeriksaan. */
export function produkUntukPenanda(jenis: JenisUkur): Produk[] {
  return PRODUK_KK.filter((p) => p.penanda.includes(jenis));
}

export function cariProduk(q: string): Produk[] {
  const s = q.trim().toLowerCase();
  if (!s) return PRODUK_KK;
  return PRODUK_KK.filter((p) =>
    p.nama.toLowerCase().includes(s)
    || p.ringkas.toLowerCase().includes(s)
    || p.komposisi.some((k) => k.toLowerCase().includes(s))
    || p.manfaat.some((m) => m.toLowerCase().includes(s)));
}

/**
 * Dari mana isi berkas ini berasal. Ditampilkan di halaman produk supaya
 * pembacanya tahu bahwa yang tertulis adalah keterangan produsen, dan tahu ke
 * mana harus memeriksa bila ada yang berubah.
 */
export const SUMBER_PRODUK = {
  utama: 'kkigroup.co.id/kesehatan-alami',
  fitsol: 'fitsolofficial.com',
  diambil: '27 Agustus 2026',
};
