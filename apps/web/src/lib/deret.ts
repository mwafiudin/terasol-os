/**
 * Menyusun rekaman pengukuran mentah menjadi deret yang bisa dibaca manusia.
 *
 * Tinggal di pustaka, bukan di layar riwayat, karena dua tempat membacanya:
 * tab Hasil Pengukuran dan halaman Analisis. Kalau keduanya menyusun sendiri,
 * cepat atau lambat yang satu akan menggabungkan tensi sementara yang lain
 * memisahkannya — dan angka yang sama akan tampil berbeda di dua layar tentang
 * orang yang sama.
 */
import { dec } from './domain';
import {
  KONTEKS_GULA, UKUR, nilaiTensi, nilaiUkur,
  type Gender, type JenisUkur, type Penilaian,
} from './rujukan';
import type { PengukuranRow } from './api';

export const JENIS_URUT = Object.keys(UKUR) as JenisUkur[];

/** Angka pengukuran datang dari Postgres numeric, yang pg kirim sebagai string. */
export const angka = (v: string) => Number(v);

export function fmtNilai(jenis: JenisUkur, nilai: number): string {
  return UKUR[jenis].desimal ? dec(nilai) : String(Math.round(nilai));
}

/** Satu pembacaan pada satu waktu. Bisa ditopang dua rekaman (tensi). */
export type Titik = {
  waktu: string;
  /** Diambil pada kunjungan yang sedang dibuka. */
  kunjunganIni: boolean;
  tampil: string;
  /** Nilai tunggal untuk menghitung selisih; null bila berpasangan. */
  nilai: number | null;
  penilaian: Penilaian | null;
  outOfRange: boolean;
  oleh: string | null;
  event: string | null;
  catatan: string | null;
  rekaman: PengukuranRow[];
};

export type Deret = {
  kunci: string;
  /** Jenis wakil — menentukan kategori dan satuan deret. */
  jenis: JenisUkur;
  nama: string;
  kode: string | null;
  /** Arti kode, dieja saat baris dibuka. */
  keterangan: string | null;
  satuan: string;
  titik: Titik[];
};

/**
 * Dua penggabungan yang tidak bisa diserahkan ke tampilan:
 *
 *   Sistolik dan diastolik disatukan jadi "119/79". Tekanan darah dibaca,
 *   ditulis, dan dinilai sebagai satu angka; menampilkannya sebagai dua baris
 *   membuat vonis yang sama tercetak dua kali dari data yang sama.
 *
 *   Gula darah tetap dipisah per konteks. GDP dan GD2PP tidak sebanding, jadi
 *   menyatukannya jadi satu deret akan menghasilkan naik-turun tanpa arti.
 *
 * Titik diurutkan terbaru dulu.
 */
export function bangunDeret(
  rows: PengukuranRow[],
  gender: Gender,
  kunjungan: string | null,
): Deret[] {
  const ember = new Map<string, PengukuranRow[]>();
  for (const r of rows) {
    const k = r.jenis === 'gula' ? `gula:${r.konteks ?? 'sewaktu'}`
      : r.jenis === 'sistolik' || r.jenis === 'diastolik' ? 'tensi'
        : r.jenis;
    if (!ember.has(k)) ember.set(k, []);
    ember.get(k)!.push(r);
  }

  const hasil: Deret[] = [];

  for (const [kunci, isi] of ember) {
    isi.sort((a, b) => b.diukurPada.localeCompare(a.diukurPada));

    if (kunci === 'tensi') {
      // Dipasangkan lewat waktu ukur: satu screening menulis kedua angka
      // dengan timestamp yang sama persis.
      const perWaktu = new Map<string, PengukuranRow[]>();
      for (const r of isi) {
        if (!perWaktu.has(r.diukurPada)) perWaktu.set(r.diukurPada, []);
        perWaktu.get(r.diukurPada)!.push(r);
      }
      const titik: Titik[] = [...perWaktu.entries()].map(([waktu, pasangan]) => {
        const sis = pasangan.find((r) => r.jenis === 'sistolik');
        const dia = pasangan.find((r) => r.jenis === 'diastolik');
        const s = sis ? angka(sis.nilai) : null;
        const d = dia ? angka(dia.nilai) : null;
        const utama = sis ?? dia!;
        return {
          waktu,
          kunjunganIni: kunjungan != null && pasangan.some((r) => r.participantId === kunjungan),
          // Yang tidak terukur ditulis "–", bukan disembunyikan: pembacaan
          // tensi yang hanya separuh adalah fakta yang perlu terlihat.
          tampil: s != null && d != null
            ? `${Math.round(s)}/${Math.round(d)}`
            : `${s != null ? Math.round(s) : '–'}/${d != null ? Math.round(d) : '–'}`,
          nilai: null,
          penilaian: s != null && d != null ? nilaiTensi(s, d) : null,
          outOfRange: pasangan.some((r) => r.outOfRange),
          oleh: utama.diukurOlehNama,
          event: utama.eventNama,
          catatan: pasangan.map((r) => r.catatan).find(Boolean) ?? null,
          rekaman: pasangan,
        };
      });
      // "Tensi", bukan "Tekanan darah": judul kelompoknya sudah menyebut itu,
      // dan nama baris yang mengulang judul di atasnya hanya menambah baris
      // untuk dibaca tanpa menambah satu pun informasi.
      hasil.push({
        kunci, jenis: 'sistolik', nama: 'Tensi', kode: null,
        keterangan: 'Sistolik / diastolik', satuan: 'mmHg', titik,
      });
      continue;
    }

    const contoh = isi[0]!;
    const meta = UKUR[contoh.jenis];
    const kodeGula = contoh.jenis === 'gula'
      ? KONTEKS_GULA.find((k) => k.k === (contoh.konteks ?? 'sewaktu')) ?? null
      : null;

    hasil.push({
      kunci,
      jenis: contoh.jenis,
      // Kode GDS/GDP/GD2PP sudah dibawa chip di sebelah nama; mengeja
      // "Sewaktu" di samping chip "GDS" mengatakan hal yang sama dua kali.
      nama: meta.label,
      kode: kodeGula?.kode ?? null,
      keterangan: kodeGula ? `${kodeGula.label} — ${kodeGula.syarat.toLowerCase()}` : null,
      satuan: meta.satuan,
      titik: isi.map((r) => {
        const n = angka(r.nilai);
        return {
          waktu: r.diukurPada,
          kunjunganIni: kunjungan != null && r.participantId === kunjungan,
          tampil: fmtNilai(r.jenis, n),
          nilai: n,
          penilaian: nilaiUkur(r.jenis, n, { gender, konteks: r.konteks }),
          outOfRange: r.outOfRange,
          oleh: r.diukurOlehNama,
          event: r.eventNama,
          catatan: r.catatan,
          rekaman: [r],
        };
      }),
    });
  }

  return hasil.sort((a, b) => JENIS_URUT.indexOf(a.jenis) - JENIS_URUT.indexOf(b.jenis));
}
