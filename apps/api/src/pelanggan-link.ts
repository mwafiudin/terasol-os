import { createHash } from 'node:crypto';
import type { Tx } from './db.js';

/**
 * UUID v5-style deterministik dari sebuah string.
 *
 * Dipakai untuk `pengukuran.client_id` hasil cerminan screening. Perangkat
 * lapangan masih mengirim satu objek `screening` (kolom tetap), sedangkan model
 * baru menyimpan satu baris per parameter. Kalau id-nya diacak, setiap sync
 * ulang akan menggandakan riwayat. Dengan id turunan dari (clientId screening +
 * jenis + konteks), sync ke-sepuluh menghasilkan baris yang sama persis dengan
 * sync pertama.
 */
export function idTurunan(...bagian: string[]): string {
  const h = createHash('sha1').update(bagian.join('|')).digest();
  h[6] = (h[6]! & 0x0f) | 0x50; // versi 5
  h[8] = (h[8]! & 0x3f) | 0x80; // varian RFC 4122
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type Orang = {
  nama: string; gender: 'P' | 'L';
  usia?: number | null; tanggalLahir?: string | null;
  tanggalLahirAsumsi?: boolean; hp: string;
};

/**
 * Cari pelanggan yang cocok di cabang ini, atau buat baru.
 *
 * Pencocokan: nomor HP DAN nama (case-insensitive). HP saja tidak cukup —
 * satu nomor lazim dipakai sekeluarga, dan menggabungkan ibu dengan anaknya
 * jadi satu riwayat kesehatan jauh lebih berbahaya daripada memecah satu orang
 * jadi dua record. Kalau nanti ternyata orangnya sama, Koordinator bisa
 * menggabungkan; kalau tertukar, tidak ada yang tahu.
 */
export async function pelangganUntuk(
  tx: Tx, tenantId: string, o: Orang,
): Promise<string> {
  const found = await tx.query<{ id: string }>(
    `select id from pelanggan
      where tenant_id = $1 and hp = $2 and lower(nama) = lower($3) and erased_at is null
      order by created_at limit 1`,
    [tenantId, o.hp, o.nama],
  );
  if (found.rows[0]) {
    // Usia berubah tiap tahun; ambil yang terbaru supaya profil tidak basi.
    //
    // Tanggal lahir sebaliknya: sekali diketahui, ia tidak berubah. Yang
    // menang ditentukan KETELITIANNYA — tanggal sungguhan mengalahkan taksiran,
    // taksiran hanya mengisi yang kosong, dan null tidak pernah menimpa apa pun.
    // Tanpa itu, satu kunjungan yang dicatat cepat lewat usia akan menghapus
    // tanggal lahir yang susah payah ditanyakan pada kunjungan sebelumnya.
    if (o.usia != null || o.tanggalLahir != null) {
      const pakai = `$3::date is not null
        and (tanggal_lahir is null or tanggal_lahir_asumsi or not $4::boolean)`;
      await tx.query(
        `update pelanggan
            set usia = coalesce($2::smallint, usia),
                tanggal_lahir = case when ${pakai} then $3::date else tanggal_lahir end,
                tanggal_lahir_asumsi = case when ${pakai} then $4::boolean else tanggal_lahir_asumsi end
          where id = $1`,
        [found.rows[0].id, o.usia ?? null, o.tanggalLahir ?? null, o.tanggalLahirAsumsi ?? false],
      );
    }
    return found.rows[0].id;
  }
  const ins = await tx.query<{ id: string }>(
    `insert into pelanggan
       (tenant_id, nama, gender, usia, tanggal_lahir, tanggal_lahir_asumsi, hp)
     values ($1,$2,$3::gender,$4,$5,$6,$7) returning id`,
    [tenantId, o.nama, o.gender, o.usia ?? null, o.tanggalLahir ?? null,
     o.tanggalLahir ? (o.tanggalLahirAsumsi ?? false) : false, o.hp],
  );
  return ins.rows[0]!.id;
}

export type ScreeningMasuk = {
  clientId: string;
  tinggi?: number | null;
  berat?: number | null;
  lingkarPerut?: number | null;
  sistolik?: number | null;
  diastolik?: number | null;
  nadi?: number | null;
  gula?: number | null;
  konteksGula?: string | null;
  kolesterol?: number | null;
  asamUrat?: number | null;
  /** Benar bila ADA satu saja parameter di luar rentang wajar. */
  outOfRange: boolean;
  /**
   * Parameter MANA yang di luar rentang wajar. Opsional: perangkat versi lama
   * hanya mengirim benderanya, dan pada baris-baris itu penandanya menjadi
   * false — lebih baik diam daripada menandai kesembilan angka sekaligus.
   */
  diLuarWajar?: string[];
  measuredAt: string;
  diukurOleh?: string | null;
};

/**
 * Cerminkan satu screening menjadi baris-baris `pengukuran`.
 *
 * Ini jembatan, bukan tujuan akhir: begitu perangkat lapangan mengirim
 * pengukuran secara langsung, fungsi ini hanya perlu berhenti dipanggil —
 * datanya sudah berada di tempat yang benar sejak awal.
 */
export async function cerminkanScreening(
  tx: Tx, tenantId: string, pelangganId: string, participantId: string, s: ScreeningMasuk,
): Promise<number> {
  const baris: Array<[string, number | null | undefined, string | null]> = [
    ['tinggi', s.tinggi, null],
    ['berat', s.berat, null],
    ['lingkar_perut', s.lingkarPerut, null],
    ['sistolik', s.sistolik, null],
    ['diastolik', s.diastolik, null],
    ['nadi', s.nadi, null],
    ['gula', s.gula, s.gula == null ? null : (s.konteksGula ?? 'sewaktu')],
    ['kolesterol', s.kolesterol, null],
    ['asam_urat', s.asamUrat, null],
  ];

  let ditulis = 0;
  for (const [jenis, nilai, konteks] of baris) {
    if (nilai == null) continue;
    await tx.query(
      `insert into pengukuran (tenant_id, pelanggan_id, participant_id, client_id, jenis,
                               konteks, nilai, diukur_pada, diukur_oleh, out_of_range)
       values ($1,$2,$3,$4,$5::jenis_ukur,$6,$7,$8,$9,$10)
       on conflict (tenant_id, client_id) do update
          set nilai = excluded.nilai, konteks = excluded.konteks,
              diukur_pada = excluded.diukur_pada, out_of_range = excluded.out_of_range,
              diukur_oleh = coalesce(excluded.diukur_oleh, pengukuran.diukur_oleh)`,
      [tenantId, pelangganId, participantId, idTurunan(s.clientId, jenis, konteks ?? ''),
       jenis, konteks, nilai, s.measuredAt, s.diukurOleh ?? null,
       // Per parameter, bukan bendera bersama. Menyalin satu bendera ke semua
       // baris membuat satu angka mencurigakan menandai kesembilan angka
       // lainnya "di luar rentang wajar" — termasuk tinggi badan 180 cm.
       (s.diLuarWajar ?? []).includes(jenis)],
    );
    ditulis++;
  }
  return ditulis;
}
