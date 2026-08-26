import type { ReactNode } from 'react';

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
  tag: ['M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z', [7.5, 7.5, 1.2] as [number, number, number]],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'],
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

export const TABS = [
  { id: 'home', label: 'Beranda', icon: ICONS.home },
  { id: 'events', label: 'Event', icon: ICONS.calPlus },
  { id: 'outlet', label: 'Outlet', icon: ICONS.outlet },
  { id: 'hs', label: 'Home Service', icon: ICONS.van },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function TabBar({ active, onSelect }: { active: string; onSelect: (id: TabId) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigasi utama">
      {TABS.map((t) => (
        <button key={t.id} className={`tab ${active === t.id ? 'on' : ''}`} onClick={() => onSelect(t.id)}>
          <Icon d={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
