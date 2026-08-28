import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/* ------------------------------- ikon ------------------------------- */

type IconProps = { d: (string | [number, number, number])[]; size?: number; sw?: number };

export function Icon({ d, size = 20, sw = 1.75 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((p, i) => Array.isArray(p)
        ? <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} />
        : <path key={i} d={p} />)}
    </svg>
  );
}

export const ICONS = {
  chevR: ['m9 6 6 6-6 6'],
  back: ['m15 18-6-6 6-6'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  arrowR: ['M5 12h14', 'm13 6 6 6-6 6'],
  plus: ['M12 5v14', 'M5 12h14'],
  download: ['M12 3v12', 'm6 11 6 6 6-6', 'M5 21h14'],
  home: ['M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3Z'],
  userPlus: ['M2 21a8 8 0 0 1 13.3-6.2', [10, 8, 5] as [number, number, number], 'M19 16v6', 'M22 19h-6'],
  refresh: ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v5h-5'],
  calPlus: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M12 13.5v5', 'M9.5 16h5'],
  chart: ['M3 21h18', 'M7 17V9', 'M12 17V5', 'M17 17v-7'],
  alert: ['M12 9v4', 'M12 17h.01', [12, 12, 9] as [number, number, number]],
  backspace: ['M21 5H9l-6 7 6 7h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z', 'm12 9 6 6', 'm18 9-6 6'],
  outlet: ['m4 7 2-4h12l2 4', 'M4 7h16v3a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10V7Z', 'M6 13v8h12v-8'],
  van: ['M3 17V7h11l4 4h3v6h-2', [7.5, 17.5, 2] as [number, number, number], [17.5, 17.5, 2] as [number, number, number], 'M9.5 17.5h6', 'M3 17h2.5'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  gear: [[12, 12, 3] as [number, number, number], 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  wifi: ['M5 12.5a11 11 0 0 1 14 0', 'M8.5 15.8a6 6 0 0 1 7 0', [12, 19, 1] as [number, number, number]],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', [9, 7, 4] as [number, number, number], 'M22 21v-2a4 4 0 0 0-3-3.9'],
  archive: ['M3 4h18v4H3z', 'M5 8v12h14V8', 'M10 12h4'],
  cari: [[11, 11, 7] as [number, number, number], 'm20 20-3.5-3.5'],
  tag: ['M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z', [7.5, 7.5, 1.2] as [number, number, number]],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z'],
  bagikan: [[6, 12, 2.6] as [number, number, number], [17.5, 6, 2.6] as [number, number, number], [17.5, 18, 2.6] as [number, number, number], 'm8.3 10.8 6.9-3.6', 'm8.3 13.2 6.9 3.6'],
  salin: ['M9 9h10v12H9z', 'M5 15H3V3h12v2'],
  lainnya: [[5, 12, 1.5] as [number, number, number], [12, 12, 1.5] as [number, number, number], [19, 12, 1.5] as [number, number, number]],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  pencil: ['M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z', 'm14.5 6.5 3 3'],
  cart: ['M3 4h2l2.4 11h9.7L20 7H6', [9, 20, 1.4] as [number, number, number], [17, 20, 1.4] as [number, number, number]],
  pulse: ['M3 12h4l2.5-7 4 14L16 12h5'],
  clock: [[12, 12, 9] as [number, number, number], 'M12 7v5l3 2'],
  user: [[12, 8, 4] as [number, number, number], 'M4 21a8 8 0 0 1 16 0'],
  naik: ['m5 15 7-7 7 7'],
  turun: ['m5 9 7 7 7-7'],
  info: [[12, 12, 9] as [number, number, number], 'M12 11v5', 'M12 8h.01'],
} satisfies Record<string, (string | [number, number, number])[]>;

/* ----------------------------- primitif ----------------------------- */

export function Badge({ tone = 'sage', dot, children }: {
  tone?: string; dot?: boolean; children: ReactNode;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

type BtnProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'onbrand';
  size?: 'md' | 'lg' | 'sm';
  full?: boolean;
  icon?: (string | [number, number, number])[];
  iconRight?: (string | [number, number, number])[];
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: ReactNode;
  style?: React.CSSProperties;
};

export function Button({
  variant = 'primary', size = 'md', full, icon, iconRight,
  onClick, disabled, type = 'button', children, style,
}: BtnProps) {
  const cls = [
    'btn',
    variant !== 'primary' && `btn-${variant}`,
    size === 'lg' && 'btn-lg',
    size === 'sm' && 'btn-sm',
    full && 'btn-full',
  ].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type} style={style}>
      {icon && <Icon d={icon} size={size === 'sm' ? 18 : 20} />}
      {children}
      {iconRight && <Icon d={iconRight} size={20} />}
    </button>
  );
}

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

/**
 * Kolom nominal rupiah dengan pemisah ribuan.
 *
 * `1050000` dan `10500000` nyaris tidak terbedakan sekilas, dan satu digit
 * kelebihan pada harga adalah kesalahan yang baru ketahuan saat rekap tidak
 * masuk akal. Dengan pemisah, `1.050.000` terbaca sebagai jumlah, bukan
 * sebagai deretan angka yang harus dihitung sendiri.
 *
 * Nilai yang dipegang pemanggil tetap digit polos — pemformatan hanya untuk
 * mata. Yang tersimpan tidak boleh bergantung pada cara ia ditampilkan.
 */
export function InputRupiah({ id, value, onChange, placeholder, autoFocus, disabled }: {
  id?: string;
  /** Digit polos, tanpa pemisah. String kosong berarti belum diisi. */
  value: string;
  onChange: (digit: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  const tampil = value === '' ? '' : Number(value).toLocaleString('id-ID');

  // Menyisipkan titik memindahkan teks di kanan kursor, jadi kursornya harus
  // ditempatkan ulang. Tanpa ini, mengetik di tengah angka melempar kursor ke
  // ujung dan digit berikutnya masuk ke tempat yang salah.
  useLayoutEffect(() => {
    if (caret.current == null || !ref.current) return;
    ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  function ubah(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const digitSebelumKursor = el.value
      .slice(0, el.selectionStart ?? el.value.length)
      .replace(/\D/g, '').length;

    const digit = el.value.replace(/\D/g, '');
    onChange(digit);

    // Kursor diletakkan setelah digit ke-N yang sama, dihitung pada teks baru.
    const baru = digit === '' ? '' : Number(digit).toLocaleString('id-ID');
    let terlewat = 0;
    let i = 0;
    while (i < baru.length && terlewat < digitSebelumKursor) {
      if (/\d/.test(baru[i]!)) terlewat++;
      i++;
    }
    caret.current = i;
  }

  return (
    <div className="input-uang">
      <span className="input-uang-awalan" aria-hidden="true">Rp</span>
      <input ref={ref} id={id} className="input" type="text" inputMode="numeric"
        value={tampil} onChange={ubah} placeholder={placeholder}
        autoFocus={autoFocus} disabled={disabled} autoComplete="off" />
    </div>
  );
}

export function PageHead({ title, onBack, right, step }: {
  title: string; onBack?: () => void; right?: ReactNode; step?: string;
}) {
  return (
    <div className="page-head">
      {onBack && (
        <button className="back-btn" onClick={onBack} aria-label="Kembali">
          <Icon d={ICONS.back} size={24} />
        </button>
      )}
      {step ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span className="page-title">{title}</span>
          <span className="step-label">{step}</span>
        </div>
      ) : (
        <span className="page-title">{title}</span>
      )}
      {right}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="toast-wrap">
      <div className="toast" role="status">
        <Icon d={ICONS.check} size={18} sw={2} />
        <span>{message}</span>
      </div>
    </div>
  );
}

/* ============================== menu aksi ============================== */

export type AksiMenu = {
  label: string;
  ikon: (string | [number, number, number])[];
  onPilih: () => void;
  /** Ditandai merah dan dipisah garis: menghapus tidak boleh sejajar menyunting. */
  bahaya?: boolean;
};

/**
 * Satu tombol yang membuka daftar aksi, menggantikan deretan ikon telanjang.
 *
 * Tiga ikon berjajar di ujung baris menuntut orang menebak arti tanda silang:
 * menonaktifkan? menghapus? menutup? Di dalam menu setiap aksi punya NAMA, dan
 * yang berbahaya bisa dipisahkan alih-alih berdiri sebahu dengan yang tidak.
 *
 * Menunya `position: fixed` dan dihitung dari letak tombolnya, bukan absolut
 * di dalam barisnya — `.panel` memakai `overflow: hidden`, dan menu absolut
 * di dalamnya akan terpotong tepat pada baris terakhir tabel, yaitu baris yang
 * paling sering perlu dihapus.
 */
export function MenuAksi({ label, aksi }: { label: string; aksi: AksiMenu[] }) {
  const [buka, setBuka] = useState(false);
  const [pos, setPos] = useState<{ atas: number; kanan: number } | null>(null);
  const tombol = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!buka || !tombol.current) return;
    const r = tombol.current.getBoundingClientRect();
    setPos({ atas: r.bottom + 6, kanan: window.innerWidth - r.right });
  }, [buka]);

  useEffect(() => {
    if (!buka) return;
    const tutup = () => setBuka(false);
    const padaTombol = (e: MouseEvent) =>
      menu.current?.contains(e.target as Node) || tombol.current?.contains(e.target as Node);
    const klik = (e: MouseEvent) => { if (!padaTombol(e)) setBuka(false); };
    const tuts = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setBuka(false); tombol.current?.focus(); }
    };
    // Menggulir menutup menunya: letaknya dihitung sekali, dan menu yang
    // bertahan di tempatnya sementara barisnya bergerak menunjuk baris yang
    // salah — persis saat orang menekan Hapus.
    window.addEventListener('mousedown', klik);
    window.addEventListener('keydown', tuts);
    window.addEventListener('resize', tutup);
    document.addEventListener('scroll', tutup, true);
    return () => {
      window.removeEventListener('mousedown', klik);
      window.removeEventListener('keydown', tuts);
      window.removeEventListener('resize', tutup);
      document.removeEventListener('scroll', tutup, true);
    };
  }, [buka]);

  return (
    <>
      <button ref={tombol} className={`ikon-btn${buka ? ' on' : ''}`}
        aria-label={label} aria-haspopup="menu" aria-expanded={buka}
        onClick={() => setBuka((v) => !v)}>
        <Icon d={ICONS.lainnya} size={18} />
      </button>

      {buka && pos && (
        <div ref={menu} className="menu-aksi" role="menu" aria-label={label}
          style={{ top: pos.atas, right: pos.kanan }}>
          {aksi.map((a, i) => (
            <button key={a.label} role="menuitem"
              className={`menu-aksi-item${a.bahaya ? ' bahaya' : ''}`}
              autoFocus={i === 0}
              onClick={() => { setBuka(false); a.onPilih(); }}>
              <Icon d={a.ikon} size={16} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function Sheet({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="sheet-veil" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-title">
          <b>{title}</b>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Tab di dalam halaman (bukan navigasi utama). Dipakai sebagai tablist yang
 * benar agar pembaca layar mengumumkannya sebagai tab, bukan tumpukan tombol.
 */
export function SegTabs<T extends string>({ tabs, active, onSelect }: {
  tabs: { id: T; label: string; icon?: (string | [number, number, number])[]; jumlah?: number }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="segtabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id}
          className={`segtab ${active === t.id ? 'on' : ''}`}
          onClick={() => onSelect(t.id)}>
          {t.icon && <Icon d={t.icon} size={17} />}
          <span>{t.label}</span>
          {t.jumlah != null && t.jumlah > 0 && <span className="segtab-jumlah">{t.jumlah}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Disclaimer rujukan. Sengaja sebuah komponen, bukan teks yang disalin-tempel:
 * kalau nanti kalimatnya perlu berubah, ia harus berubah di semua tempat
 * sekaligus — penilaian tanpa disclaimer adalah hal yang tidak boleh terjadi.
 */
export function Rujukan({ sumber, children }: { sumber?: string; children?: ReactNode }) {
  return (
    <div className="rujukan">
      <Icon d={ICONS.info} size={15} />
      <div>
        {children}
        {sumber && <div className="rujukan-sumber">Rujukan: {sumber}</div>}
      </div>
    </div>
  );
}

/* ============================== paginasi ============================== */

/**
 * Memotong daftar panjang menjadi halaman.
 *
 * Dipakai untuk daftar yang tumbuh tanpa batas seiring pemakaian — peserta,
 * akun, event, katalog. Daftar yang panjangnya ditentukan kenyataan usaha
 * (cabang, produk) dibiarkan utuh: memberi tombol halaman pada tujuh baris
 * hanya menambah krom.
 */
export function usePaginasi<T>(isi: T[], perHalaman = 20) {
  const [hal, setHal] = useState(1);
  const total = Math.max(1, Math.ceil(isi.length / perHalaman));

  // Daftar bisa menyusut di bawah kaki sendiri — setelah disaring atau dicari,
  // halaman yang sedang dibuka mungkin tidak ada lagi, dan yang terlihat adalah
  // layar kosong tanpa sebab yang jelas.
  useEffect(() => { if (hal > total) setHal(1); }, [hal, total]);

  const mulai = (hal - 1) * perHalaman;
  const halAman = Math.min(hal, total);
  return {
    hal: halAman,
    setHal,
    totalHal: total,
    potong: isi.slice((halAman - 1) * perHalaman, (halAman - 1) * perHalaman + perHalaman),
    dari: isi.length ? mulai + 1 : 0,
    sampai: Math.min(mulai + perHalaman, isi.length),
    jumlah: isi.length,
  };
}

/**
 * Kendali halaman. Hanya muncul bila memang ada lebih dari satu halaman —
 * baris "1–7 dari 7" dengan dua tombol mati tidak memberi tahu apa pun.
 *
 * `onPindah` juga menggulung ke puncak daftar: tanpa itu, halaman berikutnya
 * tiba di tengah-tengah dan pembacanya harus menggulung ke atas sendiri untuk
 * menemukan awalnya.
 */
export function Paginasi({ hal, totalHal, dari, sampai, jumlah, satuan = 'baris', onPindah }: {
  hal: number; totalHal: number; dari: number; sampai: number; jumlah: number;
  satuan?: string;
  onPindah: (h: number) => void;
}) {
  if (totalHal <= 1) return null;
  const pindah = (h: number) => {
    onPindah(Math.min(Math.max(1, h), totalHal));
    document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <nav className="paginasi" aria-label="Navigasi halaman">
      <span className="paginasi-jumlah">
        {dari}–{sampai} dari {jumlah} {satuan}
      </span>
      <div className="paginasi-tombol">
        <button className="ikon-btn" onClick={() => pindah(hal - 1)}
          disabled={hal <= 1} aria-label="Halaman sebelumnya">
          <Icon d={ICONS.back} size={18} />
        </button>
        <span className="paginasi-posisi" aria-live="polite">{hal} / {totalHal}</span>
        <button className="ikon-btn" onClick={() => pindah(hal + 1)}
          disabled={hal >= totalHal} aria-label="Halaman berikutnya">
          <Icon d={ICONS.chevR} size={18} />
        </button>
      </div>
    </nav>
  );
}

export const TABS = [
  { id: 'home', label: 'Beranda', icon: ICONS.home },
  { id: 'events', label: 'Event', icon: ICONS.calPlus },
  { id: 'outlet', label: 'Outlet', icon: ICONS.outlet },
  { id: 'hs', label: 'Home Service', icon: ICONS.van },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export type ItemNav = {
  id: string;
  label: string;
  icon: (string | [number, number, number])[];
  /** Sub-menu, hanya muncul saat induknya sedang aktif dan sidebar berlabel. */
  anak?: { id: string; label: string }[];
};

/**
 * Navigasi utama. Satu komponen, dua bentuk.
 *
 * Di ponsel ia baris tab di dasar layar — dalam jangkauan ibu jari, dan
 * disembunyikan pada layar berjenjang supaya tombol Kembali yang memimpin.
 * Mulai tablet ia menjadi rel di sisi kiri yang TIDAK pernah hilang: pada
 * layar selebar itu, kehilangan navigasi setiap kali membuka satu peserta
 * memaksa pengguna menelusuri balik hanya untuk berpindah kanal.
 *
 * Isian sekunder (master data, pengaturan) hanya muncul pada bentuk rel.
 * Di ponsel keduanya sudah punya rumah sendiri, dan memaksakannya ke baris
 * empat tab akan mengorbankan yang dipakai sepanjang hari.
 */
export function Navigasi({ active, anakAktif, onSelect, sekunder = [], cabang, sembunyiDiPonsel }: {
  active: string;
  /** Sub-menu yang sedang terbuka, bila induknya punya anak. */
  anakAktif?: string;
  onSelect: (id: string) => void;
  sekunder?: ItemNav[];
  cabang?: string;
  sembunyiDiPonsel?: boolean;
}) {
  const tombol = (t: ItemNav) => {
    const aktif = active === t.id;
    return (
      <div key={t.id} className="nav-item">
        <button className={`tab ${aktif ? 'on' : ''}`}
          onClick={() => onSelect(t.id)} aria-current={aktif && !t.anak ? 'page' : undefined}>
          <Icon d={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
        {/* Sub-menu hanya dibuka saat bagiannya sedang dipakai. Menampilkan
            seluruh cabang menu sepanjang waktu membuat rel yang tenang menjadi
            daftar panjang yang harus dibaca ulang setiap kali. */}
        {t.anak && aktif && (
          <div className="nav-anak">
            {t.anak.map((a) => (
              <button key={a.id} className={`tab-anak ${anakAktif === a.id ? 'on' : ''}`}
                onClick={() => onSelect(a.id)}
                aria-current={anakAktif === a.id ? 'page' : undefined}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={`tabbar ${sembunyiDiPonsel ? 'sembunyi-ponsel' : ''}`} aria-label="Navigasi utama">
      <div className="nav-merek">
        <img src="/terasol-mark.svg" alt="" width={28} height={28} />
        <span>
          <b>Terasol OS</b>
          {cabang && <em>{cabang}</em>}
        </span>
      </div>
      <div className="nav-utama">{TABS.map(tombol)}</div>
      {sekunder.length > 0 && <div className="nav-sekunder">{sekunder.map(tombol)}</div>}
    </nav>
  );
}
