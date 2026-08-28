/**
 * Kondisi peserta satu event, sekali lihat.
 *
 * Yang dijawab halaman ini: dari orang-orang yang datang hari ini, berapa yang
 * angkanya seluruhnya dalam rentang rujukan, berapa yang tidak, dan tentang
 * apa. Bukan diagnosis, dan bukan angka prevalensi — 42 pembacaan alat lapangan
 * dalam satu hari pada orang yang datang sendiri ke sebuah event, yang bukan
 * sampel acak dari siapa pun.
 *
 * Seluruh hitungannya dari `rekapEvent.ts`, yang membacanya dari data yang
 * sudah ada di perangkat. Tidak ada permintaan jaringan di sini, jadi rekap ini
 * tetap terbaca di lokasi tanpa sinyal.
 */
import { useState } from 'react';
import { Icon, ICONS, Paginasi, usePaginasi } from '../components/ui';
import { kondisiEvent, type BarisParam, type RekapKondisi } from '../lib/rekapEvent';
import type { PesertaRingkas } from '../lib/pesertaEvent';

/**
 * Batang selebar SELURUH peserta yang dinilai, bukan selebar yang diperiksa.
 *
 * Kalau tiap batang dinormalkan ke jumlah yang diperiksa, "5 dari 19 di luar
 * rujukan" tergambar sama besar dengan "5 dari 38" — dan yang membaca sekilas
 * akan menyimpulkan keduanya sama seringnya. Sisa abu-abu bukan ruang kosong:
 * ia menyatakan berapa banyak yang tidak kita ketahui.
 */
function Batang({ b, total }: { b: BarisParam; total: number }) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  const belum = total - b.diukur;
  return (
    <div className="kondisi-baris">
      <span className="kondisi-nama">{b.label}</span>
      <div className="kondisi-bar" role="img"
        aria-label={`${b.label}: ${b.aman} dalam rujukan, ${b.perhatian} rentang perantara, ${b.luar} di luar rujukan, dari ${b.diukur} yang diperiksa`}>
        {b.aman > 0 && <i className="t-aman" style={{ width: pct(b.aman) }} />}
        {b.perhatian > 0 && <i className="t-perhatian" style={{ width: pct(b.perhatian) }} />}
        {b.luar > 0 && <i className="t-luar" style={{ width: pct(b.luar) }} />}
        {belum > 0 && <i className="t-belum" style={{ width: pct(belum) }} />}
      </div>
      <span className="kondisi-n">{b.diukur} diukur</span>
    </div>
  );
}

/**
 * Batang mendatar, bukan kolom tegak.
 *
 * Kolom tegak menaruh angkanya di atas batang, jadi pada event yang timpang —
 * 0, 0, 1, 4 — keempat angkanya melayang di empat ketinggian berbeda di atas
 * ruang kosong. Mendatar, ia memakai kisi yang sama dengan dua bagian lain di
 * kartu ini, dan seluruh kartu jadi punya satu bahasa: label, batang, angka.
 */
function Sebaran({ r }: { r: RekapKondisi }) {
  const puncak = Math.max(...r.sebaran, 1);
  const baris: { n: number; label: string; kelas: string }[] = [
    { n: r.sebaran[0], label: '0 temuan', kelas: 't-aman' },
    { n: r.sebaran[1], label: '1 temuan', kelas: 't-perhatian' },
    { n: r.sebaran[2], label: '2 temuan', kelas: 't-perhatian' },
    { n: r.sebaran[3], label: '3+ temuan', kelas: 't-luar' },
  ];
  return (
    <>
      {baris.map((k) => (
        <div className="sebar-baris" key={k.label}>
          <span className="sebar-label">{k.label}</span>
          <div className="sebar-jalur">
            {/* Lebar minimum 3px lewat CSS: baris bernilai nol yang lenyap
                sama sekali membuat empat baris terbaca sebagai tiga. */}
            <div className={`sebar-bar ${k.kelas}`}
              style={{ width: `${(k.n / puncak) * 100}%` }} />
          </div>
          <span className="sebar-n">{k.n}</span>
        </div>
      ))}
    </>
  );
}

export function RekapKondisiEvent({ daftar, onBuka }: {
  daftar: PesertaRingkas[];
  onBuka: (p: PesertaRingkas) => void;
}) {
  /**
   * Daftar tindak lanjut tersembunyi secara bawaan.
   *
   * Bagian di atasnya adalah gambaran ruangan yang dibaca siapa saja yang
   * kebetulan melihat layar; daftar ini menyebut orang per orang berikut apa
   * yang ditemukan padanya. Ia dibuka saat petugas memang sedang mengerjakannya,
   * bukan tergelar begitu saja di layar yang terbuka di atas meja.
   */
  const [bukaTindak, setBukaTindak] = useState(false);
  const r = kondisiEvent(daftar);
  // Sepuluh per halaman, sama seperti daftar peserta. Daftarnya sudah terurut
  // dari yang paling berat, jadi halaman pertama memang yang paling mendesak —
  // tapi pada event yang hampir semua pesertanya punya temuan, "daftar tindak
  // lanjut" bisa berisi seluruh peserta, dan itu bukan daftar kerja lagi.
  const halaman = usePaginasi(r?.perluTindak ?? [], 10);
  if (!r || r.dinilai === 0) return null;

  const terbesar = Math.max(...r.usia.map((k) => k.total), 1);

  return (
    <section className="card kondisi-kartu">
      <b>Kondisi peserta</b>

      <div className="kondisi-pita">
        <div className="p-aman"><b>{r.tanpaTemuan}</b><span>tanpa temuan</span></div>
        <div className="p-perhatian"><b>{r.satuDua}</b><span>1–2 temuan</span></div>
        <div className="p-luar"><b>{r.tigaLebih}</b><span>3+ temuan</span></div>
      </div>

      <p className="kondisi-kalimat">
        Dari <b>{r.dinilai} peserta</b> yang sudah punya hasil,{' '}
        {r.tanpaTemuan === 0
          ? 'tidak ada yang seluruh angkanya dalam rentang rujukan'
          : <><b>{r.tanpaTemuan}</b> seluruh angkanya dalam rentang rujukan</>}
        {r.tigaLebih > 0 && <>, dan <b>{r.tigaLebih}</b> punya tiga penanda atau lebih di luar rentang</>}.
        {r.belumDiukur > 0 && (
          <> {r.belumDiukur} peserta lain belum punya satu angka pun, jadi belum ikut dihitung.</>
        )}
      </p>

      {/* Ketiga grafik dibungkus menjadi blok, bukan dibiarkan mendatar
          sebagai deretan anak kartu.

          Di ponsel bungkusnya tidak mengubah apa pun — satu kolom, dipisah
          garis. Di layar lebar ia yang membuat lebarnya terpakai: batang
          parameter di kiri, sebaran dan kelompok usia menumpuk di kanan.
          Tanpa itu, kartu selebar 1040px hanya berisi batang 340px dan
          setengahnya kosong. */}
      <div className="kondisi-kolom">
        <div className="kondisi-blok kb-param">
          <span className="kondisi-judul">Temuan per parameter</span>
          {r.perParam.map((b) => <Batang key={b.kode} b={b} total={r.dinilai} />)}
          <div className="kondisi-legenda">
            <span><i className="t-aman" />Dalam rujukan</span>
            <span><i className="t-perhatian" />Rentang perantara</span>
            <span><i className="t-luar" />Di luar rujukan</span>
            <span><i className="t-belum" />Tidak diperiksa</span>
          </div>
        </div>

        {/* Dua blok kanan dibungkus jadi satu kolom.

            Tanpa pembungkus, garis pemisah tegaknya adalah border-left pada
            MASING-MASING blok — dan karena tinggi keduanya berbeda, garisnya
            terputus di antaranya lalu berhenti sebelum dasar kartu. Dengan
            satu pembungkus, garisnya setinggi barisnya, dan ruang sisa di
            kolom yang lebih pendek terbaca sebagai ruang kolom, bukan sebagai
            garis yang lupa diselesaikan. */}
        <div className="kondisi-sisi">
          <div className="kondisi-blok">
            <span className="kondisi-judul">Berapa temuan per orang</span>
            <Sebaran r={r} />
            <small className="kondisi-catatan">
              Satu orang dengan tiga temuan bukan hal yang sama dengan tiga orang
              yang masing-masing satu, dan batang di atas tidak bisa membedakannya.
            </small>
          </div>

          {r.usia.length > 1 && (
            <div className="kondisi-blok">
              <span className="kondisi-judul">Menurut kelompok usia</span>
              {/* Dua hal sekaligus: PANJANG batang adalah besar kelompoknya, ISI
                  berwarna adalah yang punya temuan.

                  Kalau panjangnya selalu penuh dan hanya isinya yang berubah,
                  event yang semua pesertanya punya temuan menghasilkan tiga
                  batang penuh yang identik — tidak mengatakan apa pun, padahal
                  kelompok yang satu berisi sembilan orang dan yang lain dua
                  puluh. */}
              {r.usia.map((k) => (
                <div className="usia-baris" key={k.label}>
                  <span className="usia-label">{k.label}</span>
                  <div className="usia-jalur">
                    <div className="usia-bar" style={{ width: `${(k.total / terbesar) * 100}%` }}>
                      <i style={{ width: `${(k.denganTemuan / k.total) * 100}%` }} />
                    </div>
                </div>
                <span className="usia-n">{k.denganTemuan}/{k.total}</span>
              </div>
            ))}
            <small className="kondisi-catatan">
              Panjang batang menunjukkan besar kelompoknya; bagian merah adalah
              peserta dengan sedikitnya satu temuan.
            </small>
          </div>
        )}
        </div>
      </div>

      {r.perluTindak.length > 0 && (
        <>
          <div className="kondisi-sep" />
          <button className="kondisi-buka" aria-expanded={bukaTindak}
            onClick={() => setBukaTindak((v) => !v)}>
            <span>Paling perlu ditindaklanjuti ({r.perluTindak.length})</span>
            <Icon d={ICONS.chevR} size={16} />
          </button>

          {bukaTindak && (
            <div className="tindak-daftar">
              {halaman.potong.map((t) => (
                <button className="tindak-baris" key={t.peserta.clientId}
                  onClick={() => onBuka(t.peserta)}>
                  <span className="tindak-nama">
                    {t.peserta.nama}{t.usia == null ? '' : `, ${t.usia} th`}
                  </span>
                  <span className="tindak-chips">
                    {t.temuan.map((x) => (
                      <span key={x.kode} className={`tindak-chip ${x.tingkat === 'luar' ? 'luar' : 'perhatian'}`}>
                        {x.label}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
              <Paginasi {...halaman} satuan="peserta" onPindah={halaman.setHal} />
            </div>
          )}
        </>
      )}

      <small className="kondisi-kaki">
        Hasil skrining satu hari dengan alat lapangan pada orang yang datang
        sendiri ke event ini — bukan angka prevalensi, bukan sampel acak, dan
        bukan diagnosis. Rentang rujukannya pembanding umum; penilaian kesehatan
        tetap urusan tenaga medis.
      </small>
    </section>
  );
}
