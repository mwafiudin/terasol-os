import { useState } from 'react';
import { Button, Icon, ICONS } from '../components/ui';
import { dec, num } from '../lib/domain';
import {
  KONTEKS_GULA, UKUR, diLuarWajar, hitungImt, nilaiImt,
  type JenisUkur, type KonteksGula,
} from '../lib/rujukan';

/* ============================ grup pengukuran ============================ */

export type Slot = {
  jenis: JenisUkur;
  konteks: KonteksGula | null;
  /** Kunci nilai. Gula darah dibedakan per konteks. */
  kunci: string;
  label: string;
};

const slot = (jenis: JenisUkur, konteks: KonteksGula | null = null): Slot => ({
  jenis,
  konteks,
  kunci: konteks ? `${jenis}:${konteks}` : jenis,
  label: konteks
    ? `${UKUR[jenis].label} · ${KONTEKS_GULA.find((k) => k.k === konteks)!.kode}`
    : UKUR[jenis].label,
});

/**
 * Nama singkat untuk ubin dan daftar kelompok.
 *
 * `UKUR` menyimpan "Tensi — sistolik", yang benar sebagai nama lengkap tetapi
 * mengulang kata "Tensi" tiga kali begitu ketiganya berdampingan. Di dalam
 * kelompok Tekanan darah, kata itu sudah menjadi judulnya.
 */
export function namaUbin(s: Slot, kodeGula: string): string {
  if (s.jenis === 'gula') return `Gula · ${kodeGula}`;
  const label = UKUR[s.jenis].label;
  const awalan = 'Tensi — ';
  if (!label.startsWith(awalan)) return label;
  const sisa = label.slice(awalan.length);
  return sisa.charAt(0).toUpperCase() + sisa.slice(1);
}

export type Grup = { id: string; label: string; ikon: (string | [number, number, number])[]; slot: Slot[] };

/**
 * Alat di lapangan datang per kelompok, bukan per parameter: timbangan dan
 * meteran dipakai bersama, tensimeter sendiri, alat strip 3-in-1 sendiri lagi.
 * Memilih kelompok dulu membuat urutan pencatatan mengikuti urutan alat yang
 * benar-benar dipegang petugas.
 */
export function grupUntuk(konteksGula: KonteksGula): Grup[] {
  return [
    {
      id: 'antropometri', label: 'Antropometri', ikon: ICONS.users,
      slot: [slot('tinggi'), slot('berat'), slot('lingkar_perut')],
    },
    {
      id: 'tensi', label: 'Tekanan darah', ikon: ICONS.pulse,
      slot: [slot('sistolik'), slot('diastolik'), slot('nadi')],
    },
    {
      id: 'darah', label: 'Pemeriksaan darah', ikon: ICONS.tag,
      slot: [slot('gula', konteksGula), slot('kolesterol'), slot('asam_urat')],
    },
  ];
}

/* ============================= pilih grup ============================= */

export function PilihGrup({ onPilih, onBatal }: {
  onPilih: (g: Grup, konteks: KonteksGula) => void;
  onBatal: () => void;
}) {
  // Jenis gula darah ditanya sebagai langkah kedua, bukan sebagai kolom yang
  // menggantung di bawah daftar. Ia hanya berlaku untuk satu kelompok, jadi
  // menampilkannya sebelum kelompok dipilih adalah pertanyaan yang belum tentu
  // perlu dijawab — dan sesudah angkanya diketik, sudah terlambat.
  const [tahapGula, setTahapGula] = useState(false);

  if (tahapGula) {
    return (
      <div className="pilih-grup">
        <p className="pilih-grup-tanya">Gula darah yang mana?</p>
        {KONTEKS_GULA.map((k) => (
          <button key={k.k} className="grup-kartu"
            onClick={() => onPilih(grupUntuk(k.k).find((g) => g.id === 'darah')!, k.k)}>
            <span className="grup-kode">{k.kode}</span>
            <span className="grup-tx">
              <b>{k.label}</b>
              <span>{k.syarat}</span>
            </span>
            <Icon d={ICONS.chevR} size={18} />
          </button>
        ))}
        <button className="link-btn" onClick={() => setTahapGula(false)}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="pilih-grup">
      <p className="pilih-grup-tanya">Kelompok mana yang diukur sekarang?</p>

      {grupUntuk('sewaktu').map((g) => (
        <button key={g.id} className="grup-kartu"
          onClick={() => (g.id === 'darah' ? setTahapGula(true) : onPilih(g, 'sewaktu'))}>
          <span className="grup-ikon"><Icon d={g.ikon} size={20} /></span>
          <span className="grup-tx">
            <b>{g.label}</b>
            <span>
              {g.id === 'darah'
                ? 'Gula darah · Kolesterol total · Asam urat'
                : g.slot.map((s) => namaUbin(s, 'GDS')).join(' · ')}
            </span>
          </span>
          <Icon d={ICONS.chevR} size={18} />
        </button>
      ))}

      <button className="link-btn" onClick={onBatal}>Batal</button>
    </div>
  );
}

/* ============================== papan ukur ============================== */

/**
 * Papan pencatatan: ubin per parameter dengan papan angka di bawahnya.
 *
 * Bentuknya sengaja sama dengan layar screening saat registrasi. Petugas yang
 * sudah hafal satu papan tidak perlu belajar papan kedua, dan angka yang
 * diketik dengan ibu jari sambil berdiri tidak cocok dengan form biasa.
 */
export function PapanUkur({ judul, grup, konteksGula, tinggiAcuan, beratAcuan, onBatal, onSimpan }: {
  judul: string;
  grup: Grup;
  konteksGula: KonteksGula;
  /** Nilai terbaru yang sudah tercatat, supaya IMT tetap bisa dihitung. */
  tinggiAcuan: number | null;
  beratAcuan: number | null;
  onBatal: () => void;
  onSimpan: (nilai: { slot: Slot; nilai: number; outOfRange: boolean }[]) => Promise<void>;
}) {
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [aktif, setAktif] = useState(grup.slot[0]!.kunci);
  const [warn, setWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const idx = grup.slot.findIndex((s) => s.kunci === aktif);
  const kini = grup.slot[idx]!;
  const meta = UKUR[kini.jenis];
  const terakhir = idx >= grup.slot.length - 1;

  const terisi = grup.slot.filter((s) => (nilai[s.kunci] ?? '') !== '').length;

  // IMT ikut hidup selagi mengetik: kalau tinggi dan berat baru saja diukur,
  // angkanya dipakai; kalau hanya salah satu, sisanya diambil dari yang
  // terakhir tercatat — itulah yang dilakukan petugas di kepalanya.
  const t = num(nilai['tinggi'] ?? '') ?? tinggiAcuan;
  const b = num(nilai['berat'] ?? '') ?? beratAcuan;
  const imt = hitungImt(t, b);

  function maju() {
    setWarn(null);
    if (terakhir) return;
    setAktif(grup.slot[idx + 1]!.kunci);
  }

  function lanjut() {
    const n = num(nilai[aktif] ?? '');
    // US-03: nilai di luar rentang wajar minta konfirmasi, bukan ditolak.
    if (n != null && diLuarWajar(kini.jenis, n) && warn !== aktif) {
      setWarn(aktif);
      return;
    }
    maju();
  }

  /**
   * Penambahan digit WAJIB memakai bentuk fungsional.
   *
   * Petugas mengetik tiga angka lebih cepat daripada React sempat merender
   * ulang. Kalau handler-nya membaca `nilai` dari closure, ketiga ketukan itu
   * membaca isi yang sama dan hanya yang terakhir tersimpan: "134" menjadi "4",
   * tanpa satu pun tanda bahwa ada digit yang hilang.
   */
  function ketik(d: string) {
    setWarn(null);
    setNilai((prev) => {
      const cur = prev[aktif] ?? '';
      if (d === ',' && (!meta.desimal || !cur || cur.includes(','))) return prev;
      if (cur.length >= 5) return prev;
      return { ...prev, [aktif]: cur + d };
    });
  }

  function hapusDigit() {
    setNilai((prev) => ({ ...prev, [aktif]: (prev[aktif] ?? '').slice(0, -1) }));
  }

  async function simpan() {
    const isi = grup.slot
      .map((s) => ({ slot: s, n: num(nilai[s.kunci] ?? '') }))
      .filter((x): x is { slot: Slot; n: number } => x.n != null)
      .map((x) => ({ slot: x.slot, nilai: x.n, outOfRange: diLuarWajar(x.slot.jenis, x.n) }));
    if (isi.length === 0) return;
    setBusy(true);
    try { await onSimpan(isi); } finally { setBusy(false); }
  }

  const kodeGula = KONTEKS_GULA.find((k) => k.k === konteksGula)!;

  return (
    <div className="papan-veil" role="dialog" aria-modal="true" aria-label={`Catat ${grup.label}`}>
      <div className="papan">
        <div className="scr-head">
          <button className="back-btn" onClick={onBatal} aria-label="Batal">
            <Icon d={ICONS.back} size={24} />
          </button>
          <div className="tx">
            <span className="name">{judul}</span>
            <span className="step-label">
              {grup.label.toUpperCase()} · {terisi} DARI {grup.slot.length} TERISI
            </span>
          </div>
        </div>

        <div className="papan-isi">
          <div className="papan-tengah">
            <div className="papan-ubin">
              {grup.slot.map((s) => {
                const v = nilai[s.kunci] ?? '';
                const isAktif = s.kunci === aktif;
                return (
                  <button key={s.kunci}
                    className={`ubin${isAktif ? ' aktif' : v ? ' terisi' : ''}`}
                    onClick={() => { setAktif(s.kunci); setWarn(null); }}>
                    <span className="ubin-label">
                      {namaUbin(s, kodeGula.kode)} · {UKUR[s.jenis].satuan}
                    </span>
                    <span className="ubin-nilai">{v || (isAktif ? '' : '—')}</span>
                  </button>
                );
              })}
            </div>

            {/* Rentang wajar parameter yang sedang diketik. Petugas tahu angka
                itu masuk akal atau tidak sebelum menekan Lanjut, bukan sesudah
                diperingatkan. */}
            {/* Nama lengkap parameternya, bukan nama ubin: kode seperti GDP
                adalah singkatan resmi dan tidak boleh diturunkan hurufnya. */}
            <p className="papan-rentang">
              Rentang wajar {meta.label.toLowerCase()}: {meta.wajar.min}–{meta.wajar.max} {meta.satuan}
            </p>

            {warn === aktif && (
              <div className="range-warn">
                Nilai di luar rentang wajar. Ketuk Lanjut sekali lagi untuk konfirmasi.
              </div>
            )}

            {/* Hanya di kelompok yang benar-benar mengubahnya. Saat mengukur
                tensi, IMT bukan umpan balik — ia sekadar angka yang kebetulan
                ada di layar. */}
            {imt != null && grup.slot.some((s) => s.jenis === 'tinggi' || s.jenis === 'berat') && (
              <div className="imt-chip">
                <b>IMT otomatis:</b>
                <span>{dec(imt)} — {nilaiImt(imt).label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="keypad-dock">
          <div className="keypad-actions">
            {terakhir ? (
              <>
                <Button variant="ghost" onClick={onBatal}>Batal</Button>
                <Button style={{ flex: 1 }} icon={ICONS.check} disabled={busy || terisi === 0}
                  onClick={() => void simpan()}>
                  Simpan {terisi > 0 ? `${terisi} nilai` : ''}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost"
                  onClick={() => { setNilai((p) => ({ ...p, [aktif]: '' })); maju(); }}>Lewati</Button>
                <Button style={{ flex: 1 }} onClick={lanjut}>Lanjut</Button>
              </>
            )}
          </div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} className="key" onClick={() => ketik(d)}>{d}</button>
            ))}
            <button className="key" onClick={() => ketik(',')}>,</button>
            <button className="key" onClick={() => ketik('0')}>0</button>
            <button className="key" aria-label="Hapus" onClick={hapusDigit}>
              <Icon d={ICONS.backspace} size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
