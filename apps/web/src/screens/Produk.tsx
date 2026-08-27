/**
 * Katalog produk KK Indonesia — keterangan produsen, bukan daftar jualan.
 *
 * Terbuka untuk semua peran, tidak seperti Master data yang dikunci
 * koordinator: petugas membukanya justru saat sedang berhadapan dengan orang
 * di meja, dan pertanyaan "ini isinya apa" datang di situ, bukan di kantor.
 *
 * Isinya statis di dalam bundel, jadi halaman ini bekerja tanpa jaringan.
 */
import { useMemo, useState } from 'react';
import { Badge, Icon, ICONS, PageHead, SegTabs } from '../components/ui';
import {
  PRODUK_KK, SERI_URUT, SUMBER_PRODUK, cariProduk,
  type Produk, type SeriProduk,
} from '../lib/produkKK';
import { UKUR } from '../lib/rujukan';

type Nav = (screen: string) => void;
type Saring = SeriProduk | 'Semua';

export function ProdukKK({ go }: { go: Nav }) {
  const [cari, setCari] = useState('');
  const [seri, setSeri] = useState<Saring>('Semua');

  const hasil = useMemo(() => {
    const dasar = cariProduk(cari);
    return seri === 'Semua' ? dasar : dasar.filter((p) => p.seri === seri);
  }, [cari, seri]);

  const kelompok = useMemo(() => SERI_URUT
    .map((s) => ({ seri: s, isi: hasil.filter((p) => p.seri === s) }))
    .filter((g) => g.isi.length > 0), [hasil]);

  const tab = [
    { id: 'Semua' as const, label: 'Semua', jumlah: PRODUK_KK.length },
    ...SERI_URUT.map((s) => ({
      id: s, label: s, jumlah: PRODUK_KK.filter((p) => p.seri === s).length,
    })),
  ];

  return (
    <div className="page page-produk">
      <PageHead title="Produk KK" onBack={() => go('home')}
        right={<Badge tone="sage">{PRODUK_KK.length} produk</Badge>} />

      <SegTabs tabs={tab} active={seri} onSelect={setSeri} />

      <input className="input" type="search" value={cari}
        placeholder="Cari nama, kandungan, atau manfaat…"
        aria-label="Cari produk" onChange={(e) => setCari(e.target.value)} />

      {hasil.length === 0 ? (
        <span className="hint">Tidak ada produk yang cocok dengan "{cari}".</span>
      ) : (
        kelompok.map((g) => (
          <section key={g.seri} className="produk-seri">
            {seri === 'Semua' && <h2 className="panel-grup">{g.seri}</h2>}
            <div className="produk-grid">
              {g.isi.map((p) => <KartuProduk key={p.id} p={p} />)}
            </div>
          </section>
        ))
      )}

      {/* Asal keterangannya dinyatakan terus terang: yang tertulis di kartu-kartu
          di atas adalah kalimat produsen, dan pembaca berhak tahu itu tanpa
          harus menebak. */}
      <small className="hint">
        Keterangan produk dihimpun dari {SUMBER_PRODUK.utama} dan{' '}
        {SUMBER_PRODUK.fitsol}, diambil {SUMBER_PRODUK.diambil}. Isi, komposisi,
        dan manfaat adalah keterangan produsen.
      </small>
    </div>
  );
}

function KartuProduk({ p }: { p: Produk }) {
  const [buka, setBuka] = useState(false);

  return (
    <article className={`produk-kartu${buka ? ' buka' : ''}`}>
      <button className="produk-kepala" onClick={() => setBuka((b) => !b)}
        aria-expanded={buka}>
        <span className="produk-tx">
          <b>{p.nama}</b>
          <span>{p.ringkas}</span>
        </span>
        {/* Satu ikon yang diputar CSS, sama seperti baris pengukuran — bukan
            dua ikon berbeda yang harus dijaga tetap serupa. */}
        <span className="produk-chev"><Icon d={ICONS.chevR} size={18} /></span>
      </button>

      {/* Penanda pemeriksaan yang dikaitkan produsen. Ada di ringkasan, bukan
          di dalam lipatan: inilah yang dicari petugas yang baru saja melihat
          angka seseorang. */}
      {p.penanda.length > 0 && (
        <div className="produk-penanda">
          {p.penanda.map((j) => (
            <span key={j} className="produk-tag">{UKUR[j].label}</span>
          ))}
        </div>
      )}

      {buka && (
        <div className="produk-isi">
          {p.komposisi.length > 0 && (
            <div>
              <h3>Kandungan</h3>
              <ul>{p.komposisi.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          )}
          <div>
            <h3>Keterangan produsen</h3>
            <ul>{p.manfaat.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
          {p.saji && (
            <div>
              <h3>Aturan saji</h3>
              <p>{p.saji}</p>
            </div>
          )}
          {p.tautan && (
            <a className="link-btn" href={p.tautan} target="_blank" rel="noreferrer noopener">
              Halaman produk ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
