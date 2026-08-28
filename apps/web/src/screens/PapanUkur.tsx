import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Icon, ICONS } from '../components/ui';
import { PARAMS, dec, num } from '../lib/domain';
import {
  KONTEKS_GULA, UKUR, diLuarWajar, ditolakBasisData, hitungImt, nilaiImt,
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
  // Kode hanya ditulis bila konteksnya memang sudah dipilih. Alur registrasi
  // tidak menanyakannya, jadi menempelkan "GDS" di sana mengklaim sesuatu yang
  // belum ditetapkan siapa pun.
  if (s.jenis === 'gula') return s.konteks ? `Gula · ${kodeGula}` : 'Gula darah';
  const label = UKUR[s.jenis].label;
  const awalan = 'Tensi — ';
  if (!label.startsWith(awalan)) return label;
  const sisa = label.slice(awalan.length);
  return sisa.charAt(0).toUpperCase() + sisa.slice(1);
}

export type Grup = { id: string; label: string; ikon: (string | [number, number, number])[]; slot: Slot[] };

/**
 * Tujuh parameter alur registrasi. Diturunkan dari PARAMS, bukan diketik ulang:
 * kuncinya harus sama persis dengan kunci draft agar nilai yang sudah diketik
 * tidak tercecer ke slot yang tidak pernah dibaca.
 */
export const SLOT_REGISTRASI: Slot[] = PARAMS.map((p) => slot(p.k as JenisUkur));

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
      slot: [slot('gula', konteksGula), slot('kolesterol'), slot('trigliserida'), slot('asam_urat')],
    },
  ];
}

/**
 * Peta jenis → nama kelompok, DITURUNKAN dari `grupUntuk` dan bukan diketik
 * ulang. Keanggotaan kelompok hanya boleh dinyatakan di satu tempat: kalau
 * suatu saat lingkar perut pindah kelompok, papan registrasi harus ikut pindah
 * tanpa ada yang mengingatnya.
 */
const GRUP_JENIS = new Map<JenisUkur, string>(
  grupUntuk('sewaktu').flatMap((g) => g.slot.map((s) => [s.jenis, g.label] as const)),
);

/**
 * Memecah daftar slot menjadi kelompok berjudul, dengan urutan slot apa adanya.
 *
 * Menggabungkan hanya yang BERDAMPINGAN, bukan mengelompokkan ulang: urutan
 * slot adalah urutan alat yang dipegang petugas, dan menyusun ulang demi
 * kerapian judul akan menyuruh orang bolak-balik antar alat.
 */
export function kelompokkan(slot: Slot[]): { label: string; slot: Slot[] }[] {
  const keluar: { label: string; slot: Slot[] }[] = [];
  for (const s of slot) {
    const label = GRUP_JENIS.get(s.jenis) ?? 'Lainnya';
    const akhir = keluar[keluar.length - 1];
    if (akhir && akhir.label === label) akhir.slot.push(s);
    else keluar.push({ label, slot: [s] });
  }
  return keluar;
}

/* ============================= pilih grup ============================= */

export function PilihGrup({ onPilih, onBatal, terisi, onSelesai, labelBatal }: {
  onPilih: (g: Grup, konteks: KonteksGula) => void;
  onBatal: () => void;
  /**
   * Berapa parameter yang sudah terisi per kelompok.
   *
   * Dipakai alur registrasi, yang melewati pemilih ini sekali per kelompok:
   * tanpa penanda kemajuan, layar yang sama muncul tiga kali dan petugas harus
   * mengingat sendiri mana yang sudah dikerjakan.
   */
  terisi?: Record<string, number>;
  /** Menyelesaikan tanpa mengisi kelompok berikutnya. */
  onSelesai?: () => void;
  labelBatal?: string;
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

      {grupUntuk('sewaktu').map((g) => {
        const isi = terisi?.[g.id] ?? 0;
        return (
          <button key={g.id} className={`grup-kartu${isi > 0 ? ' terisi' : ''}`}
            onClick={() => (g.id === 'darah' ? setTahapGula(true) : onPilih(g, 'sewaktu'))}>
            <span className="grup-ikon">
              {isi >= g.slot.length
                ? <Icon d={ICONS.check} size={20} sw={2.4} />
                : <Icon d={g.ikon} size={20} />}
            </span>
            <span className="grup-tx">
              <b>{g.label}</b>
              <span>
                {g.id === 'darah'
                  ? 'Gula darah · Kolesterol total · Asam urat'
                  : g.slot.map((s) => namaUbin(s, 'GDS')).join(' · ')}
              </span>
            </span>
            {terisi && <span className="grup-hitung">{isi}/{g.slot.length}</span>}
            <Icon d={ICONS.chevR} size={18} />
          </button>
        );
      })}

      {/* Menyelesaikan tanpa mengisi sisanya adalah jalan yang sah: sebagian
          alat mungkin tidak tersedia, atau peserta hanya diukur sebagian. */}
      {onSelesai && (
        <Button full icon={ICONS.check} onClick={onSelesai}>Selesai</Button>
      )}
      <button className="link-btn" onClick={onBatal}>{labelBatal ?? 'Batal'}</button>
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
export function PapanUkur({
  judul, subjudul, kanan, slot, label, konteksGula = 'sewaktu',
  tinggiAcuan = null, beratAcuan = null, labelSimpan, bolehKosong = false,
  nilai: nilaiLuar, onNilai, onBatal, onSimpan,
}: {
  judul: string;
  /** Menggantikan baris "KELOMPOK · N DARI M TERISI" bila diisi. */
  subjudul?: string;
  /** Isian di sudut kanan kepala, mis. penanda tersimpan. */
  kanan?: ReactNode;
  slot: Slot[];
  /** Nama kelompok, dipakai pada baris langkah dan label dialog. */
  label: string;
  konteksGula?: KonteksGula;
  /** Nilai terbaru yang sudah tercatat, supaya IMT tetap bisa dihitung. */
  tinggiAcuan?: number | null;
  beratAcuan?: number | null;
  labelSimpan?: string;
  /** Boleh menyelesaikan tanpa satu pun nilai terisi (alur registrasi). */
  bolehKosong?: boolean;
  /**
   * Mode terkendali. Alur registrasi menyimpan tiap ketukan ke draft
   * terenkripsi (US-03) — aplikasi yang tertutup mendadak di lapangan tidak
   * boleh menghilangkan pengukuran yang sudah diambil. Tanpa kedua prop ini,
   * papan mengurus nilainya sendiri di memori.
   */
  nilai?: Record<string, string>;
  /**
   * Menerima FUNGSI PENGUBAH, bukan nilai jadi. Pemanggil yang menyelesaikannya
   * terhadap state terbarunya sendiri — kalau papan yang menyelesaikan, ia
   * memakai nilai dari closure render, dan tiga ketukan beruntun akan membaca
   * isi yang sama sehingga dua di antaranya hilang tanpa jejak.
   */
  onNilai?: (kunci: string, ubah: (lama: string) => string) => void;
  onBatal: () => void;
  onSimpan: (nilai: { slot: Slot; nilai: number; outOfRange: boolean }[]) => Promise<void>;
}) {
  const [nilaiDalam, setNilaiDalam] = useState<Record<string, string>>({});
  const terkendali = nilaiLuar != null && onNilai != null;
  const nilai = terkendali ? nilaiLuar : nilaiDalam;
  /**
   * Satu jalan tulis untuk kedua mode.
   *
   * Bentuknya fungsional bukan kebetulan: petugas mengetik tiga angka lebih
   * cepat daripada React sempat merender ulang, dan handler yang membaca nilai
   * dari closure akan membuang dua di antaranya tanpa jejak.
   */
  const tulis = (kunci: string, ubah: (lama: string) => string) => {
    if (terkendali) { onNilai(kunci, ubah); return; }
    setNilaiDalam((prev) => ({ ...prev, [kunci]: ubah(prev[kunci] ?? '') }));
  };
  const [aktif, setAktif] = useState(slot[0]!.kunci);
  const [warn, setWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Ubin aktif ditarik ke dalam pandangan setiap kali berpindah.
   *
   * Papan tiga ubin selalu muat sekaligus, jadi ini tidak pernah terasa. Papan
   * registrasi memuat tujuh: menekan Lanjut dari ubin terakhir yang terlihat
   * memindahkan kursor ke ubin di balik lipatan, dan petugas mengetik angka ke
   * kotak yang tidak bisa dilihatnya.
   */
  const ubinRef = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const el = ubinRef.current[aktif];
    if (!el) return;
    const diam = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: diam ? 'auto' : 'smooth' });
  }, [aktif]);

  const idx = slot.findIndex((s) => s.kunci === aktif);
  const kini = slot[idx]!;
  const meta = UKUR[kini.jenis];
  const terakhir = idx >= slot.length - 1;

  const terisi = slot.filter((s) => (nilai[s.kunci] ?? '') !== '').length;

  // IMT ikut hidup selagi mengetik: kalau tinggi dan berat baru saja diukur,
  // angkanya dipakai; kalau hanya salah satu, sisanya diambil dari yang
  // terakhir tercatat — itulah yang dilakukan petugas di kepalanya.
  const t = num(nilai['tinggi'] ?? '') ?? tinggiAcuan;
  const b = num(nilai['berat'] ?? '') ?? beratAcuan;
  const imt = hitungImt(t, b);

  function maju() {
    setWarn(null);
    if (terakhir) return;
    setAktif(slot[idx + 1]!.kunci);
  }

  const tolak = (() => {
    const n = num(nilai[aktif] ?? '');
    return n == null ? null : ditolakBasisData(kini.jenis, n);
  })();

  function lanjut() {
    const n = num(nilai[aktif] ?? '');
    // Angka yang PASTI ditolak basis data tidak boleh lolos konfirmasi:
    // konfirmasi hanya berlaku untuk yang di luar rentang wajar tapi masih
    // bisa disimpan. Kalau tidak, angkanya tersimpan di perangkat lalu
    // menyumbat antrean sync selamanya.
    if (tolak) return;
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
    tulis(aktif, (cur) => {
      if (d === ',' && (!meta.desimal || !cur || cur.includes(','))) return cur;
      if (cur.length >= 5) return cur;
      return cur + d;
    });
  }

  function hapusDigit() {
    tulis(aktif, (cur) => cur.slice(0, -1));
  }

  async function simpan() {
    const isi = slot
      .map((s) => ({ slot: s, n: num(nilai[s.kunci] ?? '') }))
      .filter((x): x is { slot: Slot; n: number } => x.n != null)
      .map((x) => ({ slot: x.slot, nilai: x.n, outOfRange: diLuarWajar(x.slot.jenis, x.n) }));
    if (isi.length === 0 && !bolehKosong) return;
    setBusy(true);
    try { await onSimpan(isi); } finally { setBusy(false); }
  }

  const kodeGula = KONTEKS_GULA.find((k) => k.k === konteksGula)!;
  const kelompok = kelompokkan(slot);

  return (
    <div className="papan-veil" role="dialog" aria-modal="true" aria-label={`Catat ${label}`}>
      <div className="papan">
        <div className="scr-head">
          <button className="back-btn" onClick={onBatal} aria-label="Batal">
            <Icon d={ICONS.back} size={24} />
          </button>
          <div className="tx">
            <span className="name">{judul}</span>
            <span className="step-label">
              {subjudul ?? `${label.toUpperCase()} · ${terisi} DARI ${slot.length} TERISI`}
            </span>
          </div>
          {kanan}
        </div>

        <div className="papan-isi">
          <div className="papan-tengah">
            {/* Judul kelompok hanya muncul bila papan memang memuat lebih dari
                satu — pada "Catat pengukuran" kelompoknya sudah disebut di
                kepala layar, dan mengulanginya di sini hanya menambah baris. */}
            {kelompok.map((g) => (
              <div className="papan-grup" key={g.label}>
                {kelompok.length > 1 && <p className="papan-grup-judul">{g.label}</p>}
                <div className="papan-ubin">
                  {g.slot.map((s) => {
                    const v = nilai[s.kunci] ?? '';
                    const isAktif = s.kunci === aktif;
                    return (
                      <button key={s.kunci}
                        ref={(el) => { ubinRef.current[s.kunci] = el; }}
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

                {/* Menempel pada kelompok yang menghasilkannya, bukan di dasar
                    papan. Saat mengukur tensi, IMT bukan umpan balik — ia
                    sekadar angka yang kebetulan ada di layar; dan di papan
                    tujuh ubin, dasar papan berada di balik lipatan. */}
                {imt != null && g.slot.some((s) => s.jenis === 'tinggi' || s.jenis === 'berat') && (
                  <div className="imt-chip">
                    <b>IMT otomatis:</b>
                    <span>{dec(imt)} — {nilaiImt(imt).label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="keypad-dock">
          {/* Keduanya menerangkan angka yang SEDANG diketik, jadi tempatnya
              menempel pada papan angka, bukan di daftar ubin yang menggulung —
              begitu ubinnya bertambah, petunjuk yang ikut menggulung akan
              hilang persis ketika paling dibutuhkan. Peringatannya pun kini
              bersebelahan dengan tombol yang diminta diketuk ulang. */}
          {tolak ? (
            <div className="range-warn range-tolak">{tolak}</div>
          ) : warn === aktif ? (
            <div className="range-warn">
              Nilai di luar rentang wajar. Ketuk Lanjut sekali lagi untuk konfirmasi.
            </div>
          ) : (
            /* Nama lengkap parameternya, bukan nama ubin: kode seperti GDP
               adalah singkatan resmi dan tidak boleh diturunkan hurufnya. */
            <p className="papan-rentang">
              Rentang wajar {meta.label.toLowerCase()}: {meta.wajar.min}–{meta.wajar.max} {meta.satuan}
            </p>
          )}
          <div className="keypad-actions">
            {terakhir ? (
              <>
                <Button variant="ghost" onClick={onBatal}>Batal</Button>
                <Button style={{ flex: 1 }} icon={ICONS.check} disabled={busy || (terisi === 0 && !bolehKosong)}
                  onClick={() => void simpan()}>
                  {labelSimpan ?? `Simpan${terisi > 0 ? ` ${terisi} nilai` : ''}`}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost"
                  onClick={() => { tulis(aktif, () => ''); maju(); }}>Lewati</Button>
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
