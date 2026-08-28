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
  { k: 'lingkar_perut', label: 'Lingkar perut', unit: 'cm', min: 40, max: 200 },
  { k: 'sistolik', label: 'Tensi — sistolik', unit: 'mmHg', min: 70, max: 250 },
  { k: 'diastolik', label: 'Tensi — diastolik', unit: 'mmHg', min: 40, max: 150 },
  { k: 'nadi', label: 'Nadi', unit: 'bpm', min: 40, max: 180 },
  { k: 'gula', label: 'Gula darah', unit: 'mg/dL', min: 50, max: 500 },
  { k: 'kolesterol', label: 'Kolesterol', unit: 'mg/dL', min: 100, max: 400 },
  { k: 'trigliserida', label: 'Trigliserida', unit: 'mg/dL', min: 30, max: 800 },
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

export const hariIni = () => new Date().toISOString().slice(0, 10);

/**
 * Status yang DITAMPILKAN, diturunkan dari tanggal.
 *
 * Status tersimpan ditetapkan sekali saat event dibuat — `active` bila
 * tanggalnya hari ini atau sudah lewat, `planned` bila masih di depan — dan
 * setelah itu tidak pernah berubah sendiri. Akibatnya event dua hari lalu
 * tetap mengaku "Berlangsung", sementara event yang benar-benar berjalan hari
 * ini masih "Terjadwal" karena begitulah keadaannya saat ia dibuat.
 *
 * Yang dijawab di sini adalah pertanyaan tampilan — "apa yang sedang terjadi"
 * — dan itu pertanyaan tentang TANGGAL. Izin mencatat peserta sengaja TIDAK
 * ikut diturunkan dari sini dan tetap memakai status tersimpan: petugas yang
 * merampungkan data keesokan pagi tidak boleh terkunci hanya karena harinya
 * berganti.
 *
 * Event yang diarsipkan tetap diarsipkan, apa pun tanggalnya.
 */
export function statusTampil(ev: { tanggal: string; status: EventStatus }): {
  label: string; tone: string; hariIni: boolean;
} {
  if (ev.status === 'archived') return { ...EVENT_STATUS.archived, hariIni: false };
  const kini = hariIni();
  if (ev.tanggal === kini) return { ...EVENT_STATUS.active, hariIni: true };
  if (ev.tanggal < kini) return { ...EVENT_STATUS.done, hariIni: false };
  return { ...EVENT_STATUS.planned, hariIni: false };
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

/**
 * Mengembalikan pesan kesalahan, atau null bila nomornya masuk akal.
 *
 * Kolom kosong TETAP kesalahan. "Tidak punya HP" adalah pilihan yang harus
 * diketuk, bukan kolom yang dilewati — kalau keduanya sama saja, tidak ada
 * yang bisa membedakan peserta yang memang tak bernomor dari peserta yang
 * nomornya lupa ditanyakan.
 */
export function periksaHp(raw: string): string | null {
  const d = normalisasiHp(raw);
  if (!d) return 'Nomor HP belum diisi.';
  if (!d.startsWith('08')) return 'Nomor HP seluler diawali 08, +628, atau 628.';
  if (d.length < HP_MIN || d.length > HP_MAKS) {
    return `Nomor seluler terdiri dari ${HP_MIN}–${HP_MAKS} angka; yang diketik ${d.length}.`;
  }
  return null;
}

/* ============================== tanggal lahir ============================== */

/**
 * Batas usia. Bukan batas medis, melainkan batas kewajaran pengisian: tahun
 * lahir 1902 hampir pasti salah ketik, dan menyimpannya membuat rerata usia
 * peserta event itu tidak berarti apa-apa.
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

/**
 * Taksiran tanggal lahir dari usia: hari ini dikurangi usianya.
 *
 * Bukan 1 Januari, dan bukan pertengahan tahun. Orang yang HARI INI berusia 62
 * pasti lahir antara (hari ini − 63 tahun + 1 hari) dan (hari ini − 62 tahun);
 * memilih ujung terakhir rentang itu membuat usianya benar hari ini — angka
 * yang baru saja diketik petugas harus muncul apa adanya di layar — dan benar
 * lagi pada setiap ulang tahun tanggal pencatatan sesudahnya. Di antara
 * keduanya ia meleset paling banyak satu tahun, dan tidak ada asumsi yang bisa
 * lebih baik dari data yang hanya berisi satu angka usia.
 *
 * Yang dihasilkan WAJIB disimpan bersama penanda `asumsi`. Tanpa penanda itu,
 * tanggal ini tidak bisa dibedakan dari tanggal lahir sungguhan oleh siapa pun
 * yang membacanya kemudian.
 */
export function tanggalLahirDariUsia(usia: string | number): string | null {
  const n = Number(usia);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < USIA_MIN || n > USIA_MAKS) return null;
  const k = new Date();
  return lokalIso(new Date(k.getFullYear() - n, k.getMonth(), k.getDate()));
}

/**
 * Batas kolom tanggal lahir, dinyatakan sebagai tanggal supaya pemilih tanggal
 * bawaan peramban ikut menegakkannya sebelum petugas sempat salah.
 *
 * Dihitung dari `USIA_MAKS`, bukan dari tahun tetap: keduanya menyatakan hal
 * yang sama, dan dua angka yang harus dijaga tetap sama pada akhirnya berbeda.
 */
export function batasTanggalLahir(): { min: string; maks: string } {
  const kini = new Date();
  const min = new Date(kini.getFullYear() - USIA_MAKS, kini.getMonth(), kini.getDate());
  return { min: lokalIso(min), maks: hariIni() };
}

/** `toISOString()` memakai UTC dan menggeser tanggal sehari di zona WIB. */
function lokalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Usia penuh pada hari ini, dari tanggal lahir "YYYY-MM-DD".
 *
 * Menghitungnya sebagai selisih tahun saja membuat orang bertambah tua pada 1
 * Januari, bukan pada hari ulang tahunnya — meleset sampai sebelas bulan, dan
 * di ambang seperti 45 tahun itu cukup untuk memindahkan seseorang ke sisi
 * yang salah. Karena itu bulan dan tanggalnya ikut diperiksa.
 */
export function usiaDari(tglLahir: string | null | undefined, pada = hariIni()): number | null {
  if (!tglLahir || !/^\d{4}-\d{2}-\d{2}$/.test(tglLahir)) return null;
  const [tl, bl, hl] = tglLahir.split('-').map(Number) as [number, number, number];
  const [tk, bk, hk] = pada.split('-').map(Number) as [number, number, number];
  let usia = tk - tl;
  if (bk < bl || (bk === bl && hk < hl)) usia -= 1;
  return usia < 0 ? null : usia;
}

/**
 * Usia yang ditampilkan, dengan tanggal lahir sebagai sumber utama.
 *
 * Usia tersimpan adalah angka yang benar pada hari pendaftaran dan makin salah
 * setiap tahun sesudahnya; ia hanya dipakai untuk orang yang terdaftar sebelum
 * tanggal lahir ditanyakan, dan bagi mereka memang tidak ada yang lebih baik.
 */
export function usiaTampil(
  tglLahir: string | null | undefined, usiaTersimpan: number | null | undefined,
): number | null {
  return usiaDari(tglLahir) ?? usiaTersimpan ?? null;
}

/** Mengembalikan pesan kesalahan, atau null bila tanggalnya masuk akal. */
export function periksaTanggalLahir(raw: string): string | null {
  if (!raw.trim()) return 'Tanggal lahir belum diisi.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'Tanggal lahir belum lengkap.';
  const { min, maks } = batasTanggalLahir();
  if (raw > maks) return 'Tanggal lahir tidak bisa di masa depan.';
  if (raw < min) return `Usia di luar rentang wajar (maksimal ${USIA_MAKS} tahun).`;
  // Tanggal yang tidak ada — 31 Februari — lolos pemeriksaan pola di atas.
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime()) || lokalIso(d) !== raw) return 'Tanggal itu tidak ada.';
  const u = usiaDari(raw);
  if (u != null && u < USIA_MIN) return `Peserta termuda yang dicatat berusia ${USIA_MIN} tahun.`;
  return null;
}
