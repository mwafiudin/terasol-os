/**
 * Halaman hasil yang dibuka peserta dari tautan WhatsApp, tanpa login.
 *
 * Lembarnya PERSIS lembar yang dilihat petugas — komponen yang sama, bukan
 * susunan kedua yang mirip. Kalau dibuat terpisah, cepat atau lambat yang
 * dibaca peserta akan berbeda dari yang dilihat petugas sebelum
 * membagikannya, dan yang dipegang peserta adalah yang dibagikan.
 *
 * Yang berbeda hanya bingkainya: tidak ada navigasi, tidak ada tombol kembali
 * ke mana pun, dan tombolnya "Simpan PDF" — di HP, dialog cetak peramban
 * memang berujung ke sana, dan menyebutnya "Cetak" pada orang yang tidak
 * memegang printer hanya membuatnya ragu menekannya.
 */
import { useEffect, useState } from 'react';
import { Button, ICONS } from '../components/ui';
import { api, type PengukuranRow } from '../lib/api';
import { fmtTanggal, usiaTampil } from '../lib/domain';
import type { Gender } from '../lib/rujukan';
import { LembarAnalisis } from './Analisis';

type Isi = {
  pelanggan: {
    nama: string; gender: Gender; usia: number | null; tanggalLahir: string | null; cabang: string;
  };
  pengukuran: PengukuranRow[];
};

export function HasilPublik({ token }: { token: string }) {
  const [isi, setIsi] = useState<Isi | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    api.hasilPublik(token)
      .then((d) => { if (!batal) setIsi(d as Isi); })
      .catch(() => {
        if (!batal) {
          setGagal('Tautan ini tidak berlaku lagi. Hubungi petugas yang memeriksa Anda untuk tautan baru.');
        }
      });
    return () => { batal = true; };
  }, [token]);

  if (gagal) {
    return (
      <div className="publik">
        <div className="publik-kosong">
          <b>Hasil tidak bisa dibuka</b>
          <p>{gagal}</p>
        </div>
      </div>
    );
  }
  if (!isi) return <div className="publik"><span className="hint">Memuat hasil…</span></div>;

  const p = isi.pelanggan;
  return (
    <div className="publik">
      <div className="publik-bar">
        <span>
          <b>Hasil pemeriksaan</b>
          <em>{p.cabang}</em>
        </span>
        <Button size="sm" variant="secondary" icon={ICONS.tag} onClick={() => window.print()}>
          Simpan PDF
        </Button>
      </div>

      <div className="page page-analisis">
        <LembarAnalisis rows={isi.pengukuran} nama={p.nama} gender={p.gender}
          usia={usiaTampil(p.tanggalLahir, p.usia)}
          // Nomor HP tidak ikut dikirim server, dan tidak perlu: yang membaca
          // halaman ini adalah pemilik nomornya.
          hp={null} cabang={p.cabang} olehNama={null} />
      </div>

      <p className="publik-kaki">
        Halaman ini dibuat untuk Anda oleh {p.cabang}. Untuk menyimpannya,
        ketuk “Simpan PDF” lalu pilih “Simpan sebagai PDF”.
        Dibuka {fmtTanggal(new Date().toISOString())}.
      </p>
    </div>
  );
}
