/**
 * Katalog produk — satu entri per SKU.
 *
 * Dihimpun dari kkigroup.co.id (kesehatan-alami, kesehatan-umum, personal-care,
 * kecantikan, produk-lainnya) dan halaman produk kkd.id, diambil 28 Agustus
 * 2026. Seluruh isi `ringkas`, `komposisi`, `manfaat`, `saji`, dan `peringatan`
 * adalah KETERANGAN PRODUSEN, disalin apa adanya.
 *
 * SATU ENTRI PER SKU, termasuk varian ukuran — BZ Cleansing 200 ml dan 60 ml
 * adalah dua baris, karena keduanya dua barang berbeda di rak dengan harga
 * berbeda. Yang TIDAK dimasukkan (keputusan pemilik produk, 28 Agustus 2026):
 * 40 paket kelipatan ("3 btl Omega-3"), 16 paket kombinasi ("1 Set Fit Sol
 * Plus"), dan 11 paket KKL+BMC. Ketiganya menjual barang yang sudah ada di
 * sini, hanya dalam jumlah atau gabungan berbeda, dan harga paket adalah urusan
 * tabel `katalog` per cabang.
 *
 * KK Liforce dan Glanz+ ditambahkan dari kkigroup.co.id meski tidak punya SKU
 * tunggal di kkd.id — tanpa itu keduanya lenyap dari katalog sepenuhnya.
 *
 * Berbeda dari tabel `katalog` di basis data, yang berisi apa yang dijual tiap
 * cabang beserta harganya. Yang ini keterangan produk: sama di seluruh cabang,
 * jarang berubah, dan harus terbaca tanpa jaringan — petugas membukanya justru
 * saat sedang berhadapan dengan orang di meja.
 *
 * `harga` adalah harga daftar toko resmi pada tanggal pengambilan, dicatat
 * sebagai keterangan. BUKAN harga jual cabang.
 */
import type { JenisUkur } from './rujukan';

export type KategoriProduk = 'suplemen' | 'minuman' | 'kecantikan' | 'perawatan' | 'alat';

export type Produk = {
  id: string;
  /** Nama persis seperti tertulis di toko resmi. */
  nama: string;
  seri: string;
  kategori: KategoriProduk;
  ringkas: string;
  /** Isi kemasan menurut toko, mis. "30 kapsul". */
  ukuran: string | null;
  /** Harga daftar toko resmi saat pengambilan, dalam rupiah. */
  harga: number | null;
  komposisi: string[];
  manfaat: string[];
  saji: string | null;
  peringatan: string | null;
  tautan: string | null;
  /**
   * Penanda pemeriksaan yang DISEBUT PRODUSEN berkaitan dengan produk ini.
   *
   * Diturunkan dari kalimat produsen sendiri — "membantu menurunkan gula darah"
   * menjadi `gula`. Dipakai untuk menautkan produk ke hasil pemeriksaan
   * seseorang; bukan pernyataan bahwa produknya mengubah angka itu.
   */
  penanda: JenisUkur[];
};

const KKD = (slug: string) => `https://kkd.id/product/${slug}`;

/* Formulasi yang dipakai beberapa SKU sekaligus, agar varian ukuran tidak
   menyalin ulang isi yang sama dan berisiko menyimpang saat disunting. */
const CLEANSING = {
  komposisi: ['Allantoin'],
  manfaat: [
    'Membersihkan wajah dan leher dari kotoran dan sisa makeup tanpa iritasi',
    'Menjaga kelembaban, kulit terasa bersih, lembut, dan sejuk',
  ],
  saji: 'Ambil sedikit di telapak tangan atau kapas, usapkan ke wajah dan leher dengan gerakan melingkar dari bawah ke atas.',
};
const TONER = {
  komposisi: ['CM Glucan', 'Ekstrak Chamomile'],
  manfaat: [
    'Mendinginkan, menyegarkan, dan menghaluskan tekstur kulit',
    'Menjaga keseimbangan kelembaban alami kulit',
    'Mengecilkan pori-pori dan mengangkat minyak berlebih',
  ],
  saji: 'Gunakan setelah pemakaian cleansing.',
};
const PEARL = {
  komposisi: ['SPF 15'],
  manfaat: [
    'Mencerahkan warna kulit, menghaluskan, dan memperbarui sel kulit',
    'Melindungi kulit dari sinar UV',
    'Melembabkan, mencegah kulit kering dan kasar',
  ],
  saji: null,
};
const SGF = {
  komposisi: [
    'Alga Chlorella sorokiniana',
    'Spirulina platensis',
    'Protein dengan asam amino esensial dan non-esensial',
    'Zat non gizi: PPARs, fikosianin, klorofil, polifenol, isoflavon',
  ],
  manfaat: [
    'Memelihara daya tahan tubuh',
    'Melengkapi zat gizi sel yang lengkap dan seimbang',
  ],
  saji: null,
};
const BMC = {
  komposisi: [
    'Water', 'Pectin', 'Mentha piperita (peppermint) oil',
    'Citronella oil', 'Camphor', 'Cymbopogon flexuosus (lemon grass) oil',
  ],
  manfaat: [
    'Melembabkan dan memberikan rasa dingin pada kulit',
    'Membantu meringankan iritasi kulit',
  ],
  saji: 'Untuk pemakaian luar.',
};
const NATESH = {
  komposisi: ['Lapisan magnetik'],
  manfaat: ['Membantu menjaga kebersihan dan kesehatan area kewanitaan saat menstruasi'],
  saji: 'Produsen menganjurkan mengganti pembalut setiap 2–4 jam.',
};

export const PRODUK: Produk[] = [
  /* ============================== Fitsol ============================== */
  {
    id: 'fit-sol-cell-nutrition',
    nama: 'Fit Sol Cell Nutrition (CN)',
    seri: 'Fitsol', kategori: 'suplemen',
    ringkas: 'Serbuk larut air, bagian nutrisi sel dari rangkaian Fitsol.',
    ukuran: '600 gr', harga: 1_350_000,
    komposisi: [
      '32 enzim dasar dari berbagai buah dan sayuran',
      '12 jenis selulosa larut dan tidak larut',
      '2 jenis herba asli Swiss',
      'Probiotik aktif (probiotik AB lengkap)',
      'Fruktooligosakarida',
      'Antioksidan alami (vitamin A, C, E)',
      'Trace element (Selenium)',
    ],
    manfaat: [
      'Menyediakan nutrisi esensial',
      'Meningkatkan kesehatan usus dan pencernaan',
      'Imunitas, detoksifikasi, kecantikan, dan penyembuhan diri',
    ],
    saji: 'Campur 1 sendok takar besar (20 gr) dengan 200 ml air dingin atau suhu ruangan, sekali sehari. Disarankan pagi hari bersama Cell Energy.',
    peringatan: null, tautan: KKD('fit-sol-cell-nutrition'),
    penanda: ['gula', 'kolesterol'],
  },
  {
    id: 'fit-sol-cell-energy',
    nama: 'Fit Sol Cell Energy (CE)',
    seri: 'Fitsol', kategori: 'suplemen',
    ringkas: 'Bagian energi sel dari rangkaian Fitsol.',
    ukuran: '200 gr', harga: 850_000,
    komposisi: [
      'Vitamin B1, B2, B3 (niacin), B6, B12', 'Vitamin C', 'Asam folat',
      'Buah guarana', 'Alga coklat', 'Sereal hijau',
    ],
    manfaat: [
      'Dalam 10 menit setelah dikonsumsi, kadar oksigen naik 15%',
      'Meningkatkan suhu tubuh dan membuka jalur seluler',
      'Mendorong fokus, meningkatkan sirkulasi, menenangkan saraf',
    ],
    saji: 'Resep: 1 sendok takar besar (20 gr) Cell Nutrition + 3 sendok takar kecil (@2 gr × 3) Cell Energy + 200 ml air dingin atau suhu ruangan. Pagi hari.',
    peringatan: null, tautan: KKD('fit-sol-cell-energy'), penanda: [],
  },
  {
    id: 'fit-sol-cell-mineral',
    nama: 'Fit Sol Cell Mineral (CM)',
    seri: 'Fitsol', kategori: 'suplemen',
    ringkas: 'Bagian mineral sel dari rangkaian Fitsol.',
    ukuran: '200 gr', harga: 750_000,
    komposisi: ['Kalsium', 'Magnesium', 'Kromium', 'Vitamin D', 'Zinc', 'Selenium'],
    manfaat: [
      'Menyeimbangkan pH dan mendukung detoksifikasi',
      'Menguatkan tulang, merilekskan otot dan sendi',
      'Memperbaiki kesehatan rambut dan kulit',
      'Meningkatkan kualitas tidur',
    ],
    saji: 'Campurkan 3 sendok takar kecil (@2 gr × 3) dengan 80–100 ml air dingin atau suhu ruangan, sekali sehari. Disarankan sebelum tidur.',
    peringatan: null, tautan: KKD('fit-sol-cell-mineral'), penanda: ['gula'],
  },
  {
    id: 'fitsol-omega-3',
    nama: 'Fit Sol Omega 3',
    seri: 'Fitsol', kategori: 'suplemen',
    ringkas: 'Omega-3 dalam bentuk serbuk larut air.',
    ukuran: '1 set (250 gr)', harga: 1_300_000,
    komposisi: ['Omega-3'],
    manfaat: ['Menyediakan asam lemak esensial'],
    saji: 'Masukkan 3 sendok takar kecil ke dalam 50 ml air suhu biasa atau dingin, aduk, langsung konsumsi. Diminum 1 jam sebelum makan.',
    peringatan: null, tautan: KKD('fitsol-omega-3'), penanda: ['kolesterol'],
  },
  {
    id: 'fit-sol-vegan-protein-powder',
    nama: 'Fit Sol Vegan Protein Powder',
    seri: 'Fitsol', kategori: 'suplemen',
    ringkas: 'Protein nabati dari gabungan kedelai dan alga.',
    ukuran: '1 set', harga: 1_350_000,
    komposisi: [
      'Protein nabati gabungan kedelai dan alga',
      'Vitamin dan mineral tambahan',
    ],
    manfaat: [
      'Strukturnya mirip protein tubuh manusia sehingga tidak memberatkan liver',
      'Diserap melalui mukosa mulut, penyerapan 99%',
      'Membantu mengaktifkan kolagen',
    ],
    saji: 'Masukkan 2 sendok takar besar ke dalam 250 ml air suhu biasa atau dingin, aduk rata, langsung konsumsi.',
    peringatan: null, tautan: KKD('fit-sol-vegan-protein-powder'), penanda: [],
  },

  /* ============================= Vitayang ============================= */
  {
    id: 'milchrom-60-caps',
    nama: 'Milchrom (60 Caps)',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Suplemen kromium untuk penderita diabetes.',
    ukuran: '60 kapsul', harga: 1_100_000,
    komposisi: ['Kromium'],
    manfaat: [
      'Kromium membantu meningkatkan aktivitas insulin sehingga glukosa lebih mudah masuk ke dalam sel',
      'Memberi efek positif dalam menurunkan gula darah',
      'Meningkatkan metabolisme karbohidrat dan lipid',
    ],
    saji: 'Kebutuhan kromium orang dewasa berkisar 50–200 mikrogram per hari.',
    peringatan: null, tautan: KKD('milchrom-60-caps'), penanda: ['gula'],
  },
  {
    id: 'omega-3',
    nama: 'Omega-3',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Minyak ikan dalam bentuk softgel.',
    ukuran: '30 softgel', harga: 160_000,
    komposisi: ['EPA', 'DHA'],
    manfaat: ['Menyediakan asam lemak esensial', 'Mendukung kesehatan optimal'],
    saji: 'Anak 1–3 th: 1 softgel 2× seminggu. Anak 2–12 th: 1 softgel 3–4× seminggu. Remaja: 1 softgel per hari. Dewasa, ibu hamil dan menyusui: 2 × 1 softgel per hari. Langsung setelah makan.',
    peringatan: null, tautan: KKD('omega-3'), penanda: ['kolesterol'],
  },
  {
    id: 'bekatul-beras-merah',
    nama: 'Bekatul Beras Merah',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Ekstrak bekatul beras merah, kaya gamma-oryzanol.',
    ukuran: '30 kapsul', harga: 125_000,
    komposisi: ['Ekstrak Oryza sativa bran 350 mg per kapsul'],
    manfaat: [
      'Menurunkan kolesterol dalam darah',
      'Menurunkan kadar trigliserida dalam darah',
      'Mengurangi plak arteriosklerosis',
    ],
    saji: '3 × 1 kapsul per hari.',
    peringatan: 'Ibu hamil dan menyusui dianjurkan berkonsultasi dengan dokter sebelum menggunakan.',
    tautan: KKD('bekatul-beras-merah'), penanda: ['kolesterol'],
  },
  {
    id: 'stopirai-asam-urat',
    nama: 'Stopirai / Asam Urat',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Ramuan tiga herbal untuk asam urat.',
    ukuran: '30 kapsul', harga: 125_000,
    komposisi: [
      'Sida rhombifolia (sidaguri)',
      'Andrographis paniculata (sambiloto)',
      'Apium graveolens (seledri)',
    ],
    manfaat: [
      'Membantu meredakan gejala dan mencegah kekambuhan asam urat',
      'Mengurangi kadar asam urat dalam darah',
    ],
    saji: '3 × 1–2 kapsul per hari, sesudah makan.',
    peringatan: null, tautan: KKD('stopirai-asam-urat'), penanda: ['asam_urat'],
  },
  {
    id: 'coenzyme-q10',
    nama: 'Coenzyme Q10',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Koenzim Q-10 untuk pembentukan energi sel.',
    ukuran: '30 softgel', harga: 300_000,
    komposisi: ['Co-Q10 100 mg', 'Bahan tambahan: gelatin sapi, gliserin, air destilata'],
    manfaat: [
      'Membantu pembentukan energi (ATP)',
      'Menjaga elastisitas dan kontraksi otot jantung sehingga membantu mencegah penyakit jantung koroner dan hipertensi',
      'Memaksimalkan regenerasi sel',
      'Penetral radikal bebas',
    ],
    saji: null, peringatan: null, tautan: KKD('coenzyme-q10'), penanda: ['sistolik'],
  },
  {
    id: 'marine-calcium',
    nama: 'Marine Calcium',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Kalsium alami dari tulang ikan Ling dan Cod.',
    ukuran: '30 kapsul', harga: 160_000,
    komposisi: ['Kalsium dari tulang ikan Ling dan Cod'],
    manfaat: ['Memenuhi kebutuhan kalsium harian', 'Mendukung kesehatan tulang dan gigi'],
    saji: 'Kebutuhan harian menurut produsen: anak-anak 800 mg, dewasa 1.000–1.200 mg, ibu hamil dan menyusui perlu tambahan 300 mg.',
    peringatan: null, tautan: KKD('marine-calcium'), penanda: [],
  },
  {
    id: 'salmon-peptide-sop',
    nama: 'Salmon Peptide (SOP)',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Peptida dari membran telur ikan salmon liar.',
    ukuran: '15 sachet (@3 gr)', harga: 380_000,
    komposisi: [
      'Salmon Ovary Peptide 100 mg',
      'L-Glutathione 150 mg',
      'Kolagen 300 mg',
      'Vitamin C 200 mg',
      'Ekstrak Citrus nobilis fructus 300 mg',
    ],
    manfaat: [
      'Meningkatkan kekenyalan dan kelembaban kulit',
      'Mengencangkan kulit',
      'Mencegah flek, keriput, dan hiperpigmentasi',
    ],
    saji: 'Dewasa 3 × 1 sachet per hari sesudah makan. Larutkan dengan 200 ml air biasa atau dingin — tidak dengan air panas.',
    peringatan: 'Beri jarak minimal 2 jam dengan obat dokter. Simpan di tempat sejuk dan kering.',
    tautan: KKD('salmon-peptide-sop'), penanda: [],
  },
  {
    id: 'pureway-c-booster',
    nama: 'Pureway C Booster',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Vitamin C generasi Pureway-C dengan zat pendukung imunitas.',
    ukuran: '30 kaplet', harga: 170_000,
    komposisi: [
      'Vitamin C 500 mg (Pureway-C 250 mg dan sodium ascorbate 303 mg)',
      'Vitamin D3 200 IU', 'Vitamin E 5 mg', 'Zinc picolinate 5 mg',
      'Selenium selenite 11 mcg', 'Ekstrak Citrus aurantium L. fructus 50 mg',
    ],
    manfaat: [
      'Meningkatkan sistem imun dan respons sel imun terhadap patogen',
      'Menyehatkan sirkulasi darah',
      'Membantu menurunkan LDL teroksidasi',
      'Membantu metabolisme lemak dan karbohidrat',
    ],
    saji: null, peringatan: null, tautan: KKD('pureway-c-booster'), penanda: ['kolesterol'],
  },
  {
    id: 'raw-meal',
    nama: 'Raw Meal',
    seri: 'Vitayang', kategori: 'suplemen',
    ringkas: 'Makanan padat gizi dengan teknologi freeze drying.',
    ukuran: '10 sachet', harga: 600_000,
    komposisi: ['Bahan pangan utuh yang dikeringkan-beku (lyophilization)'],
    manfaat: [
      'Indeks glikemik rendah, baik bagi penderita diabetes melitus',
      'Menurunkan kadar gula darah dan memperbaiki resistensi insulin',
      'Detoksifikasi',
      'Rendah kalori, lemak, garam, dan non-kolesterol',
      'Tinggi protein, vitamin, mineral, dan serat',
    ],
    saji: null, peringatan: null, tautan: KKD('raw-meal'), penanda: ['gula'],
  },
  {
    id: 'susu-skim-bubuk-original',
    nama: 'Susu Skim Bubuk Original',
    seri: 'Vitayang', kategori: 'minuman',
    ringkas: 'Susu rendah lemak dengan kolostrum dan probiotik.',
    ukuran: '15 sachet', harga: 280_000,
    komposisi: [
      'Kolostrum sapi', 'Inulin', 'Omega-3', 'Rumput laut',
      'Probiotik', 'Vitamin dan mineral',
    ],
    manfaat: ['Membantu menjaga keseimbangan sistem daya tahan tubuh'],
    saji: 'Tuang 1 sachet ke dalam 150 ml air hangat, aduk rata.',
    peringatan: null, tautan: KKD('susu-skim-bubuk-original'), penanda: [],
  },
  {
    id: 'royal-honey',
    nama: 'Royal Honey',
    seri: 'Vitayang', kategori: 'minuman',
    ringkas: 'Madu dengan sari kurma, jintan hitam, dan herbal.',
    ukuran: '200 ml', harga: 125_000,
    komposisi: [
      'Per sendok makan (15 ml) — ekstrak Nigella sativa 90 mg',
      'Ekstrak Panax ginseng radix 90 mg',
      'Ekstrak Garcinia mangostana pericarpium 60 mg',
      'Ekstrak Vitis vinifera fructus 60 mg',
      'Ekstrak Daucus carota tuber 60 mg',
      'Royal jelly 60 mg',
      'Ekstrak Phoenix dactylifera fructus 1.800 mg',
      'Oleum olea europaea 75 mg',
      'Mel depuratum 12.750 mg',
    ],
    manfaat: ['Membantu memelihara kesehatan tubuh dan menyegarkan badan'],
    saji: 'Dewasa 2 kali sehari, 1–2 sendok makan, diminum langsung atau dilarutkan dalam ½–1 gelas air.',
    peringatan: 'Hati-hati pada penderita hipertensi atau diabetes. Hindari penggunaan pada anak-anak, ibu hamil, atau menyusui. Hati-hati pada yang memiliki riwayat alergi produk lebah.',
    tautan: KKD('royal-honey'), penanda: [],
  },

  /* ============================ Supergreen ============================ */
  {
    id: 'supergreen-food-50-tabs',
    nama: 'Supergreen 50 tabs',
    seri: 'Supergreen', kategori: 'suplemen',
    ringkas: 'Kombinasi alga Chlorella dan Spirulina, padat gizi.',
    ukuran: '50 tablet', harga: 110_000,
    ...SGF, peringatan: null, tautan: KKD('supergreen-food-50-tabs'),
    penanda: ['kolesterol', 'sistolik'],
  },
  {
    id: 'supergreen-food-150-tabs',
    nama: 'Supergreen 150 tabs',
    seri: 'Supergreen', kategori: 'suplemen',
    ringkas: 'Kombinasi alga Chlorella dan Spirulina, padat gizi.',
    ukuran: '150 tablet', harga: 300_000,
    ...SGF, peringatan: null, tautan: KKD('supergreen-food-150-tabs'),
    penanda: ['kolesterol', 'sistolik'],
  },
  {
    id: 'supergreen-food-600-tabs',
    nama: 'Supergreen 600 tabs',
    seri: 'Supergreen', kategori: 'suplemen',
    ringkas: 'Kombinasi alga Chlorella dan Spirulina, padat gizi.',
    ukuran: '600 tablet', harga: 980_000,
    ...SGF, peringatan: null, tautan: KKD('supergreen-food-600-tabs'),
    penanda: ['kolesterol', 'sistolik'],
  },

  /* ============================== lainnya ============================== */
  {
    id: 'niwana-sod',
    nama: 'Niwana',
    seri: 'Niwana', kategori: 'suplemen',
    ringkas: 'Suplemen multi antioksidan dari bahan alami.',
    ukuran: '30 sachet', harga: 1_380_000,
    komposisi: ['Bahan alami yang diproses untuk meningkatkan efektivitas antioksidan'],
    manfaat: [
      'Melindungi sel dari kerusakan oksidatif akibat radikal bebas',
      'Memperbaiki kualitas hidup penderita penyakit degeneratif',
      'Memperlambat proses penuaan dini',
    ],
    saji: null, peringatan: null, tautan: KKD('niwana-sod'), penanda: [],
  },
  {
    id: 'minuman-serbuk-kedelai',
    nama: 'Minuman Serbuk Kedelai',
    seri: 'KK', kategori: 'minuman',
    ringkas: 'Minuman kedelai, alternatif bagi yang alergi susu sapi.',
    ukuran: '400 gr', harga: 120_000,
    komposisi: [
      '8 jenis asam amino esensial lengkap', 'Kalsium dan fosfor',
      'Lemak tak jenuh termasuk omega-3', 'Isoflavon dan saponin', 'Serat',
    ],
    manfaat: [
      'Bebas kolesterol, kaya lemak tak jenuh',
      'Memperkuat tulang dan mencegah osteoporosis',
      'Fitoestrogen membantu meringankan gejala hot flashes',
    ],
    saji: null, peringatan: null, tautan: KKD('minuman-serbuk-kedelai'), penanda: [],
  },
  {
    id: 'kopi-tongkat-ali-new',
    nama: 'Kopi Tongkat Ali',
    seri: 'KK', kategori: 'minuman',
    ringkas: 'Kopi Arabika dengan ekstrak Tongkat Ali.',
    ukuran: '10 sachet', harga: 100_000,
    komposisi: [
      'Ekstrak kopi Arabika', 'Ekstrak akar Tongkat Ali (Eurycoma longifolia)',
      'Gula', 'Krimer',
    ],
    manfaat: ['Tongkat Ali dikenal secara tradisional sebagai perangsang dan penambah stamina pria'],
    saji: null, peringatan: null, tautan: KKD('kopi-tongkat-ali-new'), penanda: [],
  },

  /* ============================ Beautyzen ============================ */
  {
    id: 'bz-soft-cleansing-lotion-200ml',
    nama: 'BZ Soft Cleansing Lotion 200ml',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Pembersih wajah dan leher tanpa iritasi.',
    ukuran: '200 ml', harga: 600_000,
    ...CLEANSING, peringatan: null,
    tautan: KKD('bz-soft-cleansing-lotion-200ml'), penanda: [],
  },
  {
    id: 'bz-soft-cleansing-lotion-60ml',
    nama: 'BZ Soft Cleansing Lotion 60ml',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Pembersih wajah dan leher tanpa iritasi.',
    ukuran: '60 ml', harga: 200_000,
    ...CLEANSING, peringatan: null,
    tautan: KKD('bz-soft-cleansing-lotion-60ml'), penanda: [],
  },
  {
    id: 'bz-gentle-refreshing-toner-200-ml',
    nama: 'BZ Gentle Refreshing Toner 200 ml',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Penyegar kulit yang mendinginkan dan menghaluskan.',
    ukuran: '200 ml', harga: 600_000,
    ...TONER, peringatan: null,
    tautan: KKD('bz-gentle-refreshing-toner-200-ml'), penanda: [],
  },
  {
    id: 'bz-gentle-refreshing-toner-60-ml',
    nama: 'BZ Gentle Refreshing Toner 60 ml',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Penyegar kulit yang mendinginkan dan menghaluskan.',
    ukuran: '60 ml', harga: 200_000,
    ...TONER, peringatan: null,
    tautan: KKD('bz-gentle-refreshing-toner-60-ml'), penanda: [],
  },
  {
    id: 'bz-uv-protector',
    nama: 'BZ UV Protector',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Krim sunblock yang mengurangi pembentukan melanin.',
    ukuran: '30 ml', harga: 750_000,
    komposisi: [
      'Theobroma cacao (antioksidan)', 'Ekstrak Saxifraga sarmentosa',
      'Paeonia suffruticosa', 'Betaglukan',
    ],
    manfaat: [
      'Melindungi kulit dari sinar matahari',
      'Mengurangi pembentukan melanin dan mencerahkan kulit',
      'Antimelanogenesis dan anti kerut',
    ],
    saji: null, peringatan: null, tautan: KKD('bz-uv-protector'), penanda: [],
  },
  {
    id: 'bz-8-to-8-energizer-cream',
    nama: 'BZ 8 to 8 Energizer Cream',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Krim multifungsi untuk kulit dengan tanda penuaan.',
    ukuran: '30 ml', harga: 750_000,
    komposisi: [],
    manfaat: ['Merawat kulit yang menunjukkan gejala penuaan'],
    saji: 'Gunakan siang dan malam pada wajah dan leher yang telah dibersihkan, ke arah atas hingga terserap sempurna. Hindari kontak dengan mata.',
    peringatan: null, tautan: KKD('bz-8-to-8-energizer-cream'), penanda: [],
  },
  {
    id: 'bz-o2xy-face-cream',
    nama: 'BZ O2xy Face Cream',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Emulsi minyak dan air yang memasok air dan oksigen ke kulit.',
    ukuran: '30 ml', harga: 440_000,
    komposisi: ['Air', 'Oksigen', 'Beta karoten', 'Vitamin E', 'Beta glukan'],
    manfaat: [
      'Memasok kebutuhan kulit akan air dan oksigen',
      'Mempercepat penyerapan zat aktif ke dalam dermis',
    ],
    saji: null, peringatan: null, tautan: KKD('bz-o2xy-face-cream'), penanda: [],
  },
  {
    id: 'bz-skinrich-serum',
    nama: 'BZ Skinrich Serum',
    seri: 'Beautyzen', kategori: 'kecantikan',
    ringkas: 'Serum pelembab dan pengencang dengan stem cell apel.',
    ukuran: '30 ml', harga: 1_000_000,
    komposisi: [
      'Ekstrak bunga teratai (Nymphaea alba)',
      'Milk thistle (Silybum marianum)',
      'Stem cell apel (Malus domestica fruit cell culture ext.)',
      'Niacinamide (vitamin B3)', 'Zinc PCA',
    ],
    manfaat: [
      'Melembabkan kulit',
      'Mencegah dan mengurangi tanda-tanda penuaan',
      'Meningkatkan kekencangan kulit',
    ],
    saji: null, peringatan: null, tautan: KKD('bz-skinrich-serum'), penanda: [],
  },

  /* ========================= Kristine Ko-Kool ========================= */
  {
    id: 'refreshing-cream',
    nama: 'Refreshing Cream',
    seri: 'Kristine Ko-Kool', kategori: 'kecantikan',
    ringkas: 'Krim perawatan dari bahan alami, sekaligus pelindung matahari.',
    ukuran: '20 gr', harga: 280_000,
    komposisi: ['Ekstrak Witch Hazel', 'Chamomile', 'Ginkgo'],
    manfaat: ['Melembutkan dan melembabkan kulit', 'Pelindung sinar matahari'],
    saji: null, peringatan: null, tautan: KKD('refreshing-cream'), penanda: [],
  },
  {
    id: 'pearl-nourish-cream-20-gr',
    nama: 'Pearl Nourish Cream 20 gr',
    seri: 'Kristine Ko-Kool', kategori: 'kecantikan',
    ringkas: 'Krim pencerah dengan SPF 15.',
    ukuran: '20 gr', harga: 550_000,
    ...PEARL, peringatan: null,
    tautan: KKD('pearl-nourish-cream-20-gr'), penanda: [],
  },
  {
    id: 'pearl-nourishcream-5-gr',
    nama: 'Pearl NourishCream 5 gr',
    seri: 'Kristine Ko-Kool', kategori: 'kecantikan',
    ringkas: 'Krim pencerah dengan SPF 15.',
    ukuran: '5 gr', harga: 220_000,
    ...PEARL, peringatan: null,
    tautan: KKD('pearl-nourishcream-5-gr'), penanda: [],
  },

  /* ============================== Glanz+ ============================== */
  {
    id: 'glanz-plus',
    nama: 'Glanz+',
    seri: 'Glanz+', kategori: 'kecantikan',
    ringkas: 'Rangkaian anti-penuaan dengan ekstrak Edelweiss Pegunungan Alpen.',
    ukuran: 'Day Cream, Night Cream, Vitamin C Serum, Facial Foam', harga: null,
    komposisi: [
      'Ekstrak bunga Edelweiss', 'Ekstrak Lavandula stoechas',
      'Salmon ovary peptide', 'Hexapeptide-8',
      'Day Cream: anti-aging peptide, UV filter',
      'Night Cream: shea butter, anti-aging peptide',
      'Vitamin C Serum: vitamin C, niacinamide 10%',
    ],
    manfaat: [
      'Kulit tampak lebih kencang dan glowing dalam 7 hari',
      'Mencerahkan sambil menjaga hidrasi dan elastisitas',
      'Facial foam membersihkan lembut dan menyeimbangkan minyak berlebih',
    ],
    saji: null,
    // Di kkd.id Glanz+ hanya dijual sebagai paket, tidak ada SKU satuan.
    peringatan: null, tautan: 'https://kkigroup.co.id/kecantikan/', penanda: [],
  },

  /* =========================== perawatan diri =========================== */
  {
    id: 'bmc-bio-cream-60gr',
    nama: 'BMC (Bio Cream) 60gr',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Krim pelembab dengan efek mendinginkan kulit.',
    ukuran: '60 gr', harga: 330_000,
    ...BMC, peringatan: null, tautan: KKD('bmc-bio-cream-60gr'), penanda: [],
  },
  {
    id: 'bmc-bio-cream-30-gr',
    nama: 'BMC (Bio Cream) 30 gr',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Krim pelembab dengan efek mendinginkan kulit.',
    ukuran: '30 gr', harga: 170_000,
    ...BMC, peringatan: null, tautan: KKD('bmc-bio-cream-30-gr'), penanda: [],
  },
  {
    id: 'medigel-natural-aloe-vera',
    nama: 'Medigel Natural Aloe Vera',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Gel lidah buaya bebas alloin.',
    ukuran: '60 ml', harga: 150_000,
    komposisi: [
      'Aloe barbadensis (varietas dari Lembah Rio Grande, Texas)',
      'Allantoin alami', 'Ekstrak Chamomile, Yarrow, Comfrey',
    ],
    manfaat: [
      'Bebas alloin sehingga tidak menyebabkan gatal atau iritasi pada kulit dan mata',
      'Menenangkan kulit dan menjaga kelembaban',
    ],
    saji: null, peringatan: null, tautan: KKD('medigel-natural-aloe-vera'), penanda: [],
  },
  {
    id: 'tooth-paste',
    nama: 'Tooth Paste',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Pasta gigi dengan sodium monofluorophosphate.',
    ukuran: '80 gr', harga: 35_000,
    komposisi: [
      'Sodium monofluorophosphate', 'Calcium carbonate',
      'Allantoin', 'Mentha piperita oil',
    ],
    manfaat: [
      'Memperkuat enamel gigi dan menghambat bakteri memproduksi asam',
      'Mencegah karang gigi atau plak',
      'Membantu meredakan gusi berdarah',
    ],
    saji: null, peringatan: null, tautan: KKD('tooth-paste'), penanda: [],
  },
  {
    id: 'transparant-soap-epo',
    nama: 'Transparant Soap + EPO',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Sabun transparan dengan Evening Primrose Oil.',
    ukuran: '100 gr', harga: 50_000,
    komposisi: ['Gliserin', 'Minyak kelapa', 'Evening Primrose Oil (kaya Gamma Linolenic Acid)'],
    manfaat: [
      'Membantu regenerasi sel kulit baru',
      'Melembabkan dan melindungi kulit dari kekeringan',
      'pH seimbang, cocok untuk kulit sensitif',
    ],
    saji: null, peringatan: null, tautan: KKD('transparant-soap-epo'), penanda: [],
  },
  {
    id: 'transparant-soap-tea-tree-oil',
    nama: 'Transparant Soap + Tea Tree Oil',
    seri: 'Kangzen', kategori: 'perawatan',
    ringkas: 'Sabun transparan dengan Tea Tree Oil.',
    ukuran: '70 gr', harga: 55_000,
    komposisi: ['Gliserin', 'Hydrolized milk protein', 'Tea Tree Oil'],
    manfaat: [
      'Membatasi pertumbuhan bakteri P. acnes dan mengurangi peradangan',
      'Melarutkan kotoran dan kelebihan sebum',
    ],
    saji: null, peringatan: null, tautan: KKD('transparant-soap-tea-tree-oil'), penanda: [],
  },

  /* ============================== Natesh ============================== */
  {
    id: 'natesh-day-use',
    nama: 'Natesh Day Use',
    seri: 'Natesh', kategori: 'perawatan',
    ringkas: 'Pembalut siang dengan lapisan magnetik, panjang 245 mm.',
    ukuran: '10 pcs', harga: 43_000,
    ...NATESH, peringatan: null, tautan: KKD('natesh-day-use'), penanda: [],
  },
  {
    id: 'natesh-over-night-use',
    nama: 'Natesh Over Night Use',
    seri: 'Natesh', kategori: 'perawatan',
    ringkas: 'Pembalut malam dengan lapisan magnetik.',
    ukuran: '10 pcs', harga: 52_000,
    ...NATESH, peringatan: null, tautan: KKD('natesh-over-night-use'), penanda: [],
  },
  {
    id: 'natesh-night-extra-long',
    nama: 'Natesh Night Extra Long',
    seri: 'Natesh', kategori: 'perawatan',
    ringkas: 'Pembalut malam ekstra panjang dengan lapisan magnetik.',
    ukuran: '6 pcs', harga: 36_000,
    ...NATESH, peringatan: null, tautan: KKD('natesh-night-extra-long'), penanda: [],
  },
  {
    id: 'natesh-pantyliner',
    nama: 'Natesh Pantyliner',
    seri: 'Natesh', kategori: 'perawatan',
    ringkas: 'Pantyliner dengan lapisan magnetik.',
    ukuran: '20 pcs', harga: 36_000,
    ...NATESH, peringatan: null, tautan: KKD('natesh-pantyliner'), penanda: [],
  },

  /* =============================== alat =============================== */
  {
    id: 'silviang-3',
    nama: 'Silviang #3',
    seri: 'Silviang', kategori: 'alat',
    ringkas: 'Alat perawatan wajah hot & cool, menggabungkan tiga terapi.',
    ukuran: '1 set', harga: 950_000,
    komposisi: ['Terapi micro sonic vibration', 'Terapi panas', 'Terapi dingin'],
    manfaat: [
      'Perawatan wajah, leher, dan area mata',
      'Mudah digunakan di rumah, cocok untuk semua usia dan jenis kulit',
    ],
    saji: null, peringatan: null, tautan: KKD('silviang-3'), penanda: [],
  },
  {
    id: 'mesin-terahertz',
    nama: 'KK Smart99',
    seri: 'KK', kategori: 'alat',
    ringkas: 'Alat kesehatan pemancar gelombang energi frekuensi Tera.',
    ukuran: '1 set', harga: 13_800_000,
    komposisi: ['Gelombang energi frekuensi Tera dengan efek termoelektrik endogen'],
    manfaat: [
      'Mengedarkan panas ke sel-sel tubuh untuk mencapai keseimbangan suhu',
      'Multifungsi (Tera, EMS, dan Heat)',
      'Non-invasif',
    ],
    saji: null, peringatan: null, tautan: KKD('mesin-terahertz'), penanda: [],
  },
  {
    id: 'kk-liforce',
    nama: 'KK Liforce',
    seri: 'KK Liforce', kategori: 'alat',
    ringkas: 'Kalung dan gelang dengan elemen energi skalar.',
    ukuran: 'Beragam model: 24 Stone, Oval Full Stone, Love Full Stone, Square Stone, Circle Shell, Double Ring',
    harga: null,
    komposisi: ['Elemen energi skalar'],
    manfaat: ['Menunjang kesehatan dan membantu menjaga stamina tubuh'],
    saji: null,
    // Di kkd.id KK Liforce hanya dijual sebagai paket bersama BMC, tidak
    // pernah satuan, sehingga tidak punya harga daftar tunggal.
    peringatan: null, tautan: 'https://kkigroup.co.id/kesehatan-umum/', penanda: [],
  },
];

export const KATEGORI_PRODUK: { k: KategoriProduk; label: string }[] = [
  { k: 'suplemen', label: 'Suplemen' },
  { k: 'minuman', label: 'Minuman' },
  { k: 'kecantikan', label: 'Kecantikan' },
  { k: 'perawatan', label: 'Perawatan diri' },
  { k: 'alat', label: 'Alat' },
];

/** Produk yang produsennya kaitkan dengan sebuah penanda pemeriksaan. */
export function produkUntukPenanda(jenis: JenisUkur): Produk[] {
  return PRODUK.filter((p) => p.penanda.includes(jenis));
}

export function cariProduk(q: string): Produk[] {
  const s = q.trim().toLowerCase();
  if (!s) return PRODUK;
  return PRODUK.filter((p) =>
    p.nama.toLowerCase().includes(s)
    || p.seri.toLowerCase().includes(s)
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
  situs: ['kkigroup.co.id', 'kkd.id'],
  diambil: '28 Agustus 2026',
};
