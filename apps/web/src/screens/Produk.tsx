/**
 * Katalog produk — keterangan produsen, bukan daftar jualan cabang.
 *
 * Terbuka untuk semua peran, tidak seperti Master data yang dikunci
 * koordinator: petugas membukanya justru saat sedang berhadapan dengan orang
 * di meja, dan pertanyaan "ini isinya apa" datang di situ, bukan di kantor.
 *
 * Isinya statis di dalam bundel, jadi halaman ini bekerja tanpa jaringan.
 */
import { useMemo, useState } from 'react';
import { Badge, Icon, ICONS, PageHead, SegTabs } from '../components/ui';
import { rp } from '../lib/domain';
import {
  KATEGORI_PRODUK, PRODUK, SUMBER_PRODUK, cariProduk,
  type KategoriProduk, type Produk,
} from '../lib/produk';
import { UKUR } from '../lib/rujukan';

type Nav = (screen: string) => void;
type Saring = KategoriProduk | 'semua';

export function ProdukKatalog({ go }: { go: Nav }) {
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState<Saring>('semua');

  const hasil = useMemo(() => {
    const dasar = cariProduk(cari);
    return kategori === 'semua' ? dasar : dasar.filter((p) => p.kategori === kategori);
  }, [cari, kategori]);

  /* Dikelompokkan per seri di dalam kategori: petugas mencari "Fitsol yang
     mana", bukan "produk kecantikan yang mana". */
  const kelompok = useMemo(() => {
    const urut: string[] = [];
    const peta = new Map<string, Produk[]>();
    for (const p of hasil) {
      if (!peta.has(p.seri)) { peta.set(p.seri, []); urut.push(p.seri); }
      peta.get(p.seri)!.push(p);
    }
    return urut.map((seri) => ({ seri, isi: peta.get(seri)! }));
  }, [hasil]);

  const tab = [
    { id: 'semua' as const, label: 'Semua', jumlah: PRODUK.length },
    ...KATEGORI_PRODUK.map((k) => ({
      id: k.k, label: k.label, jumlah: PRODUK.filter((p) => p.kategori === k.k).length,
    })),
  ];

  return (
    <div className="page page-produk">
      <PageHead title="Produk" onBack={() => go('home')}
        right={<Badge tone="sage">{PRODUK.length} produk</Badge>} />

      <SegTabs tabs={tab} active={kategori} onSelect={setKategori} />

      <input className="input" type="search" value={cari}
        placeholder="Cari nama, kandungan, atau manfaat…"
        aria-label="Cari produk" onChange={(e) => setCari(e.target.value)} />

      {hasil.length === 0 ? (
        <span className="hint">Tidak ada produk yang cocok dengan "{cari}".</span>
      ) : (
        kelompok.map((g) => (
          <section key={g.seri} className="produk-seri">
            <h2 className="panel-grup">{g.seri}</h2>
            <div className="produk-grid">
              {g.isi.map((p) => <KartuProduk key={p.id} p={p} />)}
            </div>
          </section>
        ))
      )}

      {/* Asal keterangannya dinyatakan terus terang: yang tertulis di kartu di
          atas adalah kalimat produsen, dan pembaca berhak tahu itu tanpa harus
          menebak. */}
      <small className="hint">
        Keterangan dan harga daftar dihimpun dari {SUMBER_PRODUK.situs.join(' dan ')},
        diambil {SUMBER_PRODUK.diambil}. Komposisi dan manfaat adalah keterangan
        produsen. Harga jual cabang diatur terpisah di Master data.
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

      <div className="produk-meta">
        {p.ukuran && <span className="produk-ukuran">{p.ukuran}</span>}
        {p.harga != null && <span className="produk-harga">{rp(p.harga)}</span>}
      </div>

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
              <h3>Aturan pakai</h3>
              <p>{p.saji}</p>
            </div>
          )}
          {p.peringatan && (
            <div>
              <h3>Peringatan</h3>
              <p className="produk-peringatan">{p.peringatan}</p>
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
