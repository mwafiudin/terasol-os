/**
 * Membagikan hasil pemeriksaan ke peserta lewat WhatsApp.
 *
 * Yang dibagikan adalah TAUTAN, bukan angkanya. Pesan WhatsApp melewati
 * perangkat, server, dan cadangan yang tidak satu pun kita kendalikan;
 * menuliskan "gula darah Anda 250" di sana menaruh hasil pemeriksaan orang di
 * tempat yang tidak bisa ditarik kembali. Tautannya bisa dicabut, isinya
 * tidak.
 */
import { useEffect, useState } from 'react';
import { Button, ICONS, Icon, Sheet } from '../components/ui';
import { api, type TautanHasil } from '../lib/api';
import { fmtTanggal, normalisasiHp } from '../lib/domain';
import { useApp } from '../lib/store';

/** wa.me menuntut bentuk internasional tanpa tanda: 0812… menjadi 62812… */
function nomorWa(hp: string | null): string | null {
  if (!hp) return null;
  const baku = normalisasiHp(hp);
  return baku.startsWith('0') ? `62${baku.slice(1)}` : baku || null;
}

/**
 * Pesan yang sudah jadi, tinggal dikirim.
 *
 * Sapaannya memakai nama apa adanya — petugas menulis "Ibu Ratna" atau "Bapak
 * Hasan" di kolom nama, dan menebak sapaan dari jenis kelamin akan salah pada
 * sebagian orang sekaligus menghapus yang sudah ditulis petugas.
 *
 * Tidak ada satu pun angka pemeriksaan di sini. Yang disebut hanya bahwa
 * hasilnya sudah ada, sampai kapan tautannya berlaku, dan bahwa halamannya
 * bisa disimpan sendiri.
 */
export function pesanWa(o: {
  nama: string; cabang: string; tautan: string; kedaluwarsa: string; petugas?: string | null;
}): string {
  const sampai = fmtTanggal(o.kedaluwarsa, { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    `Halo ${o.nama},`,
    '',
    `Terima kasih sudah mengikuti pemeriksaan kesehatan bersama ${o.cabang}.`,
    'Hasil pemeriksaan Anda sudah bisa dibuka di tautan berikut:',
    '',
    o.tautan,
    '',
    `Halamannya bisa disimpan sebagai PDF langsung dari HP Anda. Tautan ini berlaku sampai ${sampai} dan hanya untuk Anda.`,
    '',
    'Angka di dalamnya adalah perbandingan terhadap rentang rujukan umum, bukan diagnosis. Untuk penilaian kesehatan, silakan rujuk ke tenaga medis.',
    '',
    o.petugas ? `Salam sehat,\n${o.petugas} — ${o.cabang}` : `Salam sehat,\n${o.cabang}`,
  ].join('\n');
}

/**
 * Versi teks persetujuan yang pertama kali menyebut tautan hasil.
 *
 * Orang yang menyetujui teks sebelum ini tidak pernah diberi tahu bahwa
 * hasilnya bisa dikirimkan lewat tautan. Membagikannya tidak dilarang —
 * mengirim seseorang hasilnya sendiri ke nomornya sendiri masih wajar — tapi
 * petugas berhak tahu bahwa ia sedang melampaui apa yang tertulis, dan bisa
 * menanyakannya langsung ke orangnya yang biasanya berdiri di depannya.
 */
const VERSI_TAUTAN = 'v3';

export function BagikanHasil({ pelangganId, nama, hp, versiConsent, onTutup }: {
  pelangganId: string;
  nama: string;
  hp: string | null;
  /** Versi teks yang disetujui peserta; null bila tidak diketahui. */
  versiConsent: string | null;
  onTutup: () => void;
}) {
  const { say, user } = useApp();
  const [tautan, setTautan] = useState<TautanHasil | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.tautan(pelangganId)
      .then((d) => setTautan(d.tautan))
      .catch(() => setTautan(null));
  }, [pelangganId]);

  const cabang = user?.tenantNama ?? 'Rumah Sehat Terasol';
  const url = tautan ? `${window.location.origin}/h/${tautan.token}` : '';
  const wa = nomorWa(hp);

  async function buat() {
    setBusy(true);
    try {
      const d = await api.buatTautan(pelangganId);
      setTautan(d.tautan);
    } catch { say('Gagal membuat tautan. Periksa koneksi.'); }
    finally { setBusy(false); }
  }

  async function cabut() {
    setBusy(true);
    try {
      await api.cabutTautan(pelangganId);
      setTautan(null);
      say('Tautan dicabut. URL lamanya tidak berlaku lagi.');
    } catch { say('Gagal mencabut tautan. Periksa koneksi.'); }
    finally { setBusy(false); }
  }

  async function salin() {
    try {
      await navigator.clipboard.writeText(url);
      say('Tautan disalin.');
    } catch { say('Tidak bisa menyalin. Tekan lama pada tautannya.'); }
  }

  function kirimWa() {
    const teks = pesanWa({
      nama, cabang, tautan: url, kedaluwarsa: tautan!.kedaluwarsa, petugas: user?.nama ?? null,
    });
    // Nomornya boleh kosong: wa.me tanpa nomor membuka pemilih kontak, dan itu
    // tetap lebih berguna daripada tombol yang mati karena HP-nya belum dicatat.
    const dasar = wa ? `https://wa.me/${wa}` : 'https://wa.me/';
    window.open(`${dasar}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
  }

  // Perbandingan teks apa adanya: versinya berupa "v1", "v2", "v3" dan
  // urutannya sama dengan urutan abjadnya sampai v9. Kalau suatu saat ada
  // v10, baris ini yang harus diubah — dan uji e2e yang membaca versi aktif
  // akan menunjukkannya lebih dulu.
  const consentLama = !!versiConsent && versiConsent < VERSI_TAUTAN;

  return (
    <Sheet title="Bagikan hasil" subtitle={nama} onClose={onTutup}>
      {tautan === undefined && <span className="hint">Memuat…</span>}

      {consentLama && (
        <div className="range-warn">
          Peserta ini menyetujui teks {versiConsent}, yang belum menyebut
          pengiriman hasil lewat tautan. Tanyakan dulu sebelum mengirim.
        </div>
      )}

      {tautan === null && (
        <>
          <p className="bagikan-jelas">
            Peserta menerima <b>tautan</b>, bukan angkanya. Halamannya menampilkan
            hasil yang sama dengan lembar cetak, dan bisa disimpan sebagai PDF
            dari HP-nya sendiri.
          </p>
          <p className="bagikan-jelas">
            Tautan berlaku <b>30 hari</b> dan bisa dicabut kapan saja.
          </p>
          <Button full icon={ICONS.bagikan} disabled={busy} onClick={() => void buat()}>
            Buat tautan hasil
          </Button>
        </>
      )}

      {tautan && (
        <>
          <div className="bagikan-url">
            <code>{url}</code>
            <button className="ikon-btn" aria-label="Salin tautan" onClick={() => void salin()}>
              <Icon d={ICONS.salin} size={16} />
            </button>
          </div>

          <p className="bagikan-jelas">
            Berlaku sampai <b>{fmtTanggal(tautan.kedaluwarsa, { day: 'numeric', month: 'long', year: 'numeric' })}</b>.
            {tautan.dibukaKali > 0
              ? ` Sudah dibuka ${tautan.dibukaKali} kali, terakhir ${fmtTanggal(tautan.dibukaTerakhir!)}.`
              : ' Belum pernah dibuka.'}
          </p>

          <Button full icon={ICONS.chat} onClick={kirimWa}>
            {wa ? 'Kirim lewat WhatsApp' : 'Kirim lewat WhatsApp (pilih kontak)'}
          </Button>
          <Button full variant="secondary" onClick={() => void salin()}>Salin tautan</Button>
          <Button full variant="ghost" disabled={busy} onClick={() => void cabut()}>
            Cabut tautan
          </Button>

          <small className="field-bantu">
            Mencabut membuat URL-nya langsung mati, termasuk yang sudah terkirim
            di percakapan WhatsApp.
          </small>
        </>
      )}
    </Sheet>
  );
}
