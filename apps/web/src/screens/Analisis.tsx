/**
 * Halaman analisis satu pelanggan, dan sekaligus lembar yang dicetak.
 *
 * Satu susunan untuk layar dan kertas, dibedakan hanya oleh stylesheet cetak.
 * Kalau lembar cetaknya disusun terpisah, cepat atau lambat yang tercetak akan
 * berbeda dari yang dilihat petugas sebelum menekan Cetak — dan yang dipegang
 * pelanggan adalah yang tercetak.
 *
 * Seluruh isinya dihitung `analisis.ts` dari data yang sudah tersimpan. Tidak
 * ada panggilan model bahasa di sini.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, ICONS, PageHead, Rujukan } from '../components/ui';
import { api, type PengukuranRow } from '../lib/api';
import { analisa, labelArah, type Analisis, type Penanda } from '../lib/analisis';
import { angka, bangunDeret, type Deret } from '../lib/deret';
import { dec, fmtTanggal } from '../lib/domain';
import {
  DISCLAIMER, UKUR, rentangSasaran, SASARAN_IMT,
  type Gender, type JenisUkur,
} from '../lib/rujukan';
import { useApp } from '../lib/store';

type Nav = (screen: string) => void;

/* =============================== grafik =============================== */

type Seri = { nama: string; nilai: (number | null)[]; tegas: boolean };

/** Keterangan pita. Rentang bisa berbatas dua sisi, satu sisi, atau tidak ada. */
function ketPita(band: { min: number | null; max: number | null } | null, satuan: string): string {
  if (!band) return `Satuan ${satuan}`;
  const { min, max } = band;
  if (min != null && max != null) {
    // Satu sisi berdesimal membuat sisi lainnya ikut: "2,4–6" terbaca seperti
    // dua besaran yang berbeda ketelitiannya.
    const ada = !Number.isInteger(min) || !Number.isInteger(max);
    const tulis = (n: number) => (ada ? n.toFixed(1).replace('.', ',') : String(n));
    return `Area teduh: rentang rujukan ${tulis(min)}–${tulis(max)} ${satuan}`;
  }
  if (max != null) return `Area teduh: rentang rujukan di bawah ${dec(max)} ${satuan}`;
  if (min != null) return `Area teduh: rentang rujukan di atas ${dec(min)} ${satuan}`;
  return `Satuan ${satuan}`;
}

/**
 * Grafik tren dengan PITA RUJUKAN sebagai latar.
 *
 * Pitanya bukan hiasan: ia yang mengubah deretan angka menjadi perbandingan.
 * Titik di dalam area teduh berarti dalam rentang rujukan tanpa perlu satu kata
 * pun, dan seberapa jauh di luarnya terbaca sebagai jarak, bukan sebagai
 * selisih yang harus dihitung sendiri pembacanya.
 */
function GrafikTren({ seri, band, satuan, label }: {
  seri: Seri[];
  band: { min: number | null; max: number | null } | null;
  satuan: string;
  label: string;
}) {
  const semua = seri.flatMap((s) => s.nilai).filter((n): n is number => n != null);
  if (!semua.length) return null;

  // Skala mencakup angka DAN pita, supaya keduanya selalu terlihat bersama.
  const kandidat = [...semua];
  if (band?.min != null) kandidat.push(band.min);
  if (band?.max != null) kandidat.push(band.max);
  const lo = Math.min(...kandidat);
  const hi = Math.max(...kandidat);
  // Rentang nol (satu titik, atau semua sama) tetap harus punya tinggi.
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(hi) * 0.1, 1);
  const bawah = lo - pad;
  const atas = hi + pad;

  const W = 320, H = 96, KIRI = 4, KANAN = 4;
  const n = Math.max(seri[0]!.nilai.length, 1);
  const x = (i: number) => (n === 1 ? W / 2 : KIRI + (i * (W - KIRI - KANAN)) / (n - 1));
  const y = (v: number) => H - ((v - bawah) / (atas - bawah)) * H;

  const pitaAtas = band?.max != null ? y(band.max) : 0;
  const pitaBawah = band?.min != null ? y(band.min) : H;

  return (
    <figure className="grafik" aria-label={`Tren ${label}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        {band && (
          <rect x="0" y={Math.max(0, pitaAtas)} width={W}
            height={Math.max(0, Math.min(H, pitaBawah) - Math.max(0, pitaAtas))}
            className="grafik-pita" />
        )}
        {seri.map((s) => {
          const titik = s.nilai
            .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
            .filter((p): p is string => p != null);
          if (!titik.length) return null;
          return (
            <g key={s.nama}>
              {titik.length > 1 && (
                <polyline points={titik.join(' ')}
                  className={`grafik-garis${s.tegas ? '' : ' tipis'}`} />
              )}
              {s.nilai.map((v, i) => (v == null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r={i === s.nilai.length - 1 ? 4.5 : 3}
                  className={`grafik-titik${s.tegas ? '' : ' tipis'}`} />
              )))}
            </g>
          );
        })}
      </svg>
      <figcaption>{ketPita(band, satuan)}</figcaption>
    </figure>
  );
}

/**
 * Deret diurutkan terbaru dulu; grafik dibaca kiri ke kanan menurut waktu.
 *
 * `gender` WAJIB diteruskan: rentang asam urat dan lingkar perut ditentukan
 * olehnya, dan tanpa itu keduanya kehilangan pita rujukannya diam-diam —
 * grafiknya tetap tergambar, hanya kehilangan satu-satunya hal yang
 * membuatnya sebuah perbandingan.
 */
function seriDari(d: Deret, gender: Gender): { seri: Seri[]; band: ReturnType<typeof rentangSasaran> } {
  const lama = [...d.titik].reverse();
  if (d.kunci === 'tensi') {
    const ambil = (jenis: JenisUkur) => lama.map((t) => {
      const r = t.rekaman.find((x) => x.jenis === jenis);
      return r ? angka(r.nilai) : null;
    });
    return {
      seri: [
        { nama: 'Sistolik', nilai: ambil('sistolik'), tegas: true },
        { nama: 'Diastolik', nilai: ambil('diastolik'), tegas: false },
      ],
      // Pita digambar dari ambang sistolik; diastolik dibaca sebagai garis
      // pembanding. Menggambar dua pita bertumpuk hanya membuat keduanya kabur.
      band: { min: null, max: 120 },
    };
  }
  const konteks = d.titik[0]?.rekaman[0]?.konteks ?? null;
  return {
    seri: [{ nama: d.nama, nilai: lama.map((t) => t.nilai), tegas: true }],
    band: rentangSasaran(d.jenis, { gender, konteks }),
  };
}

/* ============================== halaman ============================== */

export function Analisis({ go, pelangganId, nama, gender, usia, hp }: {
  go: Nav;
  pelangganId: string;
  nama: string;
  gender: Gender;
  usia: number | null;
  hp: string | null;
}) {
  const { user } = useApp();
  const [rows, setRows] = useState<PengukuranRow[] | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGagal(null);
    try { setRows((await api.pengukuran(pelangganId)).pengukuran); }
    catch { setGagal('Gagal memuat pengukuran. Periksa koneksi.'); setRows([]); }
  }, [pelangganId]);
  useEffect(() => { void muat(); }, [muat]);

  const hasil = useMemo<Analisis | null>(() => {
    if (!rows) return null;
    return analisa(bangunDeret(rows, gender, null), gender);
  }, [rows, gender]);

  if (rows === null) return <span className="hint">Memuat analisis…</span>;
  if (gagal) return <span className="hint">{gagal}</span>;

  const kosong = !hasil || hasil.penanda.length === 0;

  return (
    <div className="page page-analisis">
      <PageHead title="Analisis" onBack={() => go('peserta')}
        right={<Button size="sm" variant="secondary" icon={ICONS.tag}
          onClick={() => window.print()}>Cetak</Button>} />

      <div className="lembar">
        <header className="lembar-kop">
          <div>
            <h1>{nama}</h1>
            <p>
              {[usia ? `${usia} th` : null, gender === 'L' ? 'Laki-laki' : 'Perempuan', hp]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="lembar-kop-kanan">
            <b>{user?.tenantNama ?? 'Rumah Sehat Terasol'}</b>
            {hasil?.terakhirDiukur && (
              <span>Pengukuran terakhir {fmtTanggal(hasil.terakhirDiukur)}</span>
            )}
          </div>
        </header>

        {kosong ? (
          <p className="hint">
            Belum ada pengukuran yang bisa dianalisis. Catat pengukuran lebih dulu.
          </p>
        ) : (
          <>
            <Sorotan hasil={hasil!} />
            {hasil!.imt && <KartuImt imt={hasil!.imt} />}

            <section className="lembar-bagian">
              <h2>Rincian pemeriksaan</h2>
              <div className="penanda-grid">
                {hasil!.penanda.map((p) => <KartuPenanda key={p.deret.kunci} p={p} gender={gender} />)}
              </div>
            </section>

            {hasil!.belumDiukur.length > 0 && (
              <p className="lembar-catatan">
                Belum pernah diukur: {hasil!.belumDiukur.map((j) => UKUR[j].label).join(', ')}.
              </p>
            )}
          </>
        )}

        <footer className="lembar-kaki">
          <Rujukan>{DISCLAIMER}</Rujukan>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ sorotan ------------------------------ */

/**
 * Yang di luar rentang rujukan, paling mendesak lebih dulu — dan yang membaik.
 *
 * Keduanya berdampingan dengan sengaja. Lembar yang hanya memuat temuan buruk
 * dibaca sebagai vonis, dan orang yang beratnya turun 3 kg pantas melihatnya
 * disebut meski gula darahnya masih tinggi.
 */
function Sorotan({ hasil }: { hasil: Analisis }) {
  if (!hasil.sorotan.length && !hasil.perbaikan.length) {
    return (
      <section className="lembar-bagian sorotan-baik">
        <h2>Ringkasan</h2>
        <p>Seluruh angka yang terukur berada dalam rentang rujukan.</p>
      </section>
    );
  }
  return (
    <section className="lembar-bagian">
      <h2>Ringkasan</h2>
      <ul className="sorotan">
        {hasil.sorotan.map((p) => (
          <li key={p.deret.kunci} className={`sorot nada-${p.terbaru.penilaian!.nada}`}>
            <span className="sorot-nama">
              {p.deret.nama}{p.deret.kode ? ` (${p.deret.kode})` : ''}
            </span>
            <b className="sorot-nilai">{p.terbaru.tampil} <small>{p.deret.satuan}</small></b>
            <span className="sorot-vonis">{p.terbaru.penilaian!.label}</span>
          </li>
        ))}
        {hasil.perbaikan.map((p) => (
          <li key={`baik-${p.deret.kunci}`} className="sorot nada-membaik">
            <span className="sorot-nama">{p.deret.nama}</span>
            <b className="sorot-nilai">{p.terbaru.tampil} <small>{p.deret.satuan}</small></b>
            <span className="sorot-vonis">{labelArah(p)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------- IMT -------------------------------- */

function KartuImt({ imt }: { imt: NonNullable<Analisis['imt']> }) {
  const { min, max } = imt.beratSasaran;
  const selisih = imt.berat - max;
  return (
    <section className="lembar-bagian">
      <h2>Indeks massa tubuh</h2>
      <div className="imt-blok">
        <div className="imt-angka">
          <b>{dec(imt.nilai)}</b>
          <span>kg/m²</span>
          <Badge tone={imt.penilaian.nada === 'normal' ? 'success' : 'accent'}>
            {imt.penilaian.label}
          </Badge>
        </div>
        <div className="imt-terang">
          <p>
            Dari tinggi {dec(imt.tinggi)} cm dan berat {dec(imt.berat)} kg.
          </p>
          <p>
            {/* Desimal Indonesia memakai koma. "18.5" di lembar berbahasa
                Indonesia terbaca sebagai angka ribuan yang aneh. */}
            Rentang rujukan IMT {dec(SASARAN_IMT.min)}–{dec(SASARAN_IMT.max)} setara berat{' '}
            <b>{dec(min)}–{dec(max)} kg</b> pada tinggi ini
            {selisih > 0.5 && <> — selisih {dec(selisih)} kg dari batas atasnya</>}.
          </p>
          <small>{imt.penilaian.sumber}</small>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- satu penanda ---------------------------- */

function KartuPenanda({ p, gender }: { p: Penanda; gender: Gender }) {
  const { seri, band } = seriDari(p.deret, gender);
  const arah = labelArah(p);
  const nada = p.terbaru.penilaian?.nada ?? 'netral';

  return (
    <article className={`penanda nada-${nada}`}>
      <header>
        <span className="penanda-nama">{p.deret.nama}</span>
        {p.deret.kode && <span className="penanda-kode">{p.deret.kode}</span>}
      </header>
      <div className="penanda-nilai">
        <b>{p.terbaru.tampil}</b>
        <span>{p.deret.satuan}</span>
      </div>
      {p.terbaru.penilaian && (
        <span className={`vonis vonis-${nada}`}>{p.terbaru.penilaian.singkat}</span>
      )}

      {p.deret.titik.length > 1 && (
        <GrafikTren seri={seri} band={band} satuan={p.deret.satuan} label={p.deret.nama} />
      )}

      {arah && <p className="penanda-arah">{arah}</p>}
      {p.terbaru.penilaian && (
        <small className="penanda-sumber">{p.terbaru.penilaian.sumber}</small>
      )}
    </article>
  );
}
