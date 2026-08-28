/**
 * Kolom tanggal lahir yang bisa diisi sebagai usia.
 *
 * Di lapangan tanggal lahir sering tidak ada: orang tidak hafal, KTP tidak
 * dibawa, dan antrean di belakangnya tidak berhenti. Menuntut tanggal lahir di
 * sana berarti menghentikan pemeriksaan demi satu kolom, dan yang terjadi
 * berikutnya bisa ditebak — petugas mengarang tanggal supaya bisa lanjut, dan
 * karangannya masuk sebagai fakta.
 *
 * Jadi dua-duanya diterima. Yang diketik usia menghasilkan tanggal lahir
 * TAKSIRAN, ditandai sebagai taksiran, dan ditampilkan apa adanya sebagai
 * taksiran — bukan disembunyikan seolah-olah kita tahu.
 *
 * Dipakai form registrasi DAN form ubah data diri. Kalau hanya di satu tempat,
 * yang satunya menjadi pintu belakang dengan aturan yang berbeda.
 */
import { useState } from 'react';
import {
  batasTanggalLahir, fmtTanggal, periksaTanggalLahir, periksaUsia,
  tanggalLahirDariUsia, usiaDari,
} from '../lib/domain';

export type NilaiLahir = {
  /** "YYYY-MM-DD" — sungguhan atau taksiran, dibedakan oleh `asumsi`. */
  tanggalLahir: string;
  /** Usia sebagai teks, selalu selaras dengan `tanggalLahir`. */
  usia: string;
  asumsi: boolean;
};

type Mode = 'tanggal' | 'usia';

/** Pesan kesalahan untuk nilai sekarang, atau null. Dipakai juga oleh pemanggil. */
export function periksaLahir(n: NilaiLahir): string | null {
  return n.asumsi ? periksaUsia(n.usia) : periksaTanggalLahir(n.tanggalLahir);
}

export function IsianLahir({ id, nilai, onUbah, salah, onSentuh, usiaTercatat }: {
  id: string;
  nilai: NilaiLahir;
  onUbah: (n: NilaiLahir) => void;
  /** Pesan kesalahan yang sudah boleh ditampilkan; null berarti belum. */
  salah: string | null;
  onSentuh?: () => void;
  /**
   * Usia yang sudah tercatat pada orang ini tanpa tanggal lahir — hanya untuk
   * form ubah data diri, sebagai keterangan bahwa angkanya tidak hilang.
   */
  usiaTercatat?: string;
}) {
  const [mode, setMode] = useState<Mode>(nilai.asumsi || (!nilai.tanggalLahir && usiaTercatat) ? 'usia' : 'tanggal');
  const batas = batasTanggalLahir();
  const usiaTampil = usiaDari(nilai.tanggalLahir);

  const isiTanggal = (v: string) =>
    onUbah({ tanggalLahir: v, usia: String(usiaDari(v) ?? ''), asumsi: false });

  const isiUsia = (v: string) => {
    const bersih = v.replace(/\D/g, '').slice(0, 3);
    // Tanggalnya ikut dihitung SEKARANG, bukan saat dikirim: sinkronisasi bisa
    // terjadi berhari-hari kemudian di lapangan tanpa sinyal, dan taksiran yang
    // dihitung saat itu akan memundurkan usianya sebanyak hari yang lewat.
    onUbah({ tanggalLahir: tanggalLahirDariUsia(bersih) ?? '', usia: bersih, asumsi: true });
  };

  return (
    <div className="field">
      <div className="lahir-kepala">
        <label htmlFor={id}>
          {mode === 'tanggal' ? 'Tanggal lahir' : 'Usia'}
          {mode === 'tanggal' && usiaTampil != null && !nilai.asumsi && ` · ${usiaTampil} th`}
        </label>
        {/* Penukar mode, bukan dua kolom berdampingan. Dua kolom mengundang
            keduanya diisi dengan angka yang bertentangan, dan tidak ada jawaban
            benar untuk mana yang menang. */}
        <div className="lahir-mode" role="group" aria-label="Cara mengisi umur">
          <button type="button" className={mode === 'tanggal' ? 'on' : ''}
            aria-pressed={mode === 'tanggal'}
            onClick={() => setMode('tanggal')}>Tanggal</button>
          <button type="button" className={mode === 'usia' ? 'on' : ''}
            aria-pressed={mode === 'usia'}
            onClick={() => setMode('usia')}>Usia</button>
        </div>
      </div>

      {mode === 'tanggal' ? (
        <input id={id} className={`input${salah ? ' salah' : ''}`} type="date"
          value={nilai.asumsi ? '' : nilai.tanggalLahir}
          min={batas.min} max={batas.maks} aria-invalid={!!salah}
          onChange={(e) => isiTanggal(e.target.value)}
          onBlur={onSentuh} />
      ) : (
        <input id={id} className={`input${salah ? ' salah' : ''}`}
          inputMode="numeric" value={nilai.usia} aria-invalid={!!salah}
          onChange={(e) => isiUsia(e.target.value)}
          onBlur={onSentuh} placeholder="62" />
      )}

      {salah && <small className="field-salah">{salah}</small>}

      {/* Taksirannya diperlihatkan, tidak disembunyikan. Petugas berhak tahu apa
          yang akan tersimpan atas namanya, dan orang berikutnya yang membaca
          record ini berhak tahu bahwa tanggal itu tidak pernah ditanyakan. */}
      {!salah && mode === 'usia' && nilai.asumsi && nilai.tanggalLahir && (
        <small className="field-bantu">
          Tanggal lahir ditaksir {fmtTanggal(nilai.tanggalLahir, { day: 'numeric', month: 'long', year: 'numeric' })} dan
          ditandai sebagai taksiran. Isi tanggal aslinya bila nanti diketahui.
        </small>
      )}
      {!salah && mode === 'tanggal' && !nilai.tanggalLahir && usiaTercatat && (
        <small className="field-bantu">
          Tercatat {usiaTercatat} th tanpa tanggal lahir. Isi tanggalnya, atau
          ketuk “Usia” untuk memperbarui angkanya saja.
        </small>
      )}
    </div>
  );
}
