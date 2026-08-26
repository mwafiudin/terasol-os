import { useState } from 'react';
import { Button, Field, Icon, ICONS } from '../components/ui';
import { ApiError } from '../lib/api';
import { demoLogins } from '../lib/demoLogins';
import { useApp } from '../lib/store';

const PIN_LENGTH = 6;

export function Login() {
  const login = useApp((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demos = demoLogins();

  async function masuk(pakaiEmail: string, pakaiPassword: string) {
    setBusy(true);
    setError(null);
    try {
      await login(pakaiEmail.trim(), pakaiPassword);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await masuk(email, password);
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <img src="/terasol-mark.svg" alt="" width={64} height={64} />
        <span className="auth-sub">Rumah Sehat Terasol</span>
        <span className="auth-title">Terasol OS</span>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@terasol.id" required />
        </Field>
        <Field label="Kata sandi" htmlFor="password">
          <input id="password" className="input" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <div className="auth-error">{error}</div>}
        <Button type="submit" size="lg" full disabled={busy || !email || !password}>
          {busy ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>

      {/* `import.meta.env.DEV` diganti literal `false` saat build produksi,
          sehingga seluruh blok ini dibuang bundler — bukan sekadar tidak
          dirender. Lihat lib/demoLogins.ts. */}
      {import.meta.env.DEV && demos.length > 0 && (
        <div className="demo-logins">
          <div className="demo-logins-head">
            <span className="demo-tag">LOKAL</span>
            <span>Masuk cepat sebagai</span>
          </div>
          <div className="demo-logins-row">
            {demos.map((d) => (
              <button key={d.email} className="demo-btn" disabled={busy}
                onClick={() => void masuk(d.email, d.password)}>
                {d.label}
              </button>
            ))}
          </div>
          <span className="demo-hint">
            Akun demo di tenant terpisah. Tombol ini hanya ada saat
            <code>npm run dev</code> dan tidak pernah ikut ke build produksi.
          </span>
        </div>
      )}

      <p className="auth-note">
        Akun dibuat oleh Koordinator cabang. Setelah masuk, Anda akan membuat PIN
        untuk mengunci data di perangkat ini.
      </p>
    </div>
  );
}

function Keypad({ onDigit, onBack }: { onDigit: (d: string) => void; onBack: () => void }) {
  return (
    <div className="keypad pin-keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} className="key" onClick={() => onDigit(d)}>{d}</button>
      ))}
      <span />
      <button className="key" onClick={() => onDigit('0')}>0</button>
      <button className="key" onClick={onBack} aria-label="Hapus">
        <Icon d={ICONS.backspace} size={24} />
      </button>
    </div>
  );
}

function Dots({ filled, error }: { filled: number; error?: boolean }) {
  return (
    <div className={`pin-dots ${error ? 'shake' : ''}`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <span key={i} className={`pin-dot ${i < filled ? 'on' : ''}`} />
      ))}
    </div>
  );
}

export function SetPin() {
  const { setPin, user, say } = useApp();
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stage = first.length === PIN_LENGTH ? 'confirm' : 'create';
  const current = stage === 'create' ? first : second;

  function push(d: string) {
    setError(null);
    if (stage === 'create') {
      const next = (first + d).slice(0, PIN_LENGTH);
      setFirst(next);
      return;
    }
    const next = (second + d).slice(0, PIN_LENGTH);
    setSecond(next);
    if (next.length === PIN_LENGTH) {
      if (next !== first) {
        setError('PIN tidak sama. Ulangi dari awal.');
        setFirst(''); setSecond('');
        return;
      }
      void setPin(next).then(() => say('PIN dibuat. Data di perangkat ini terenkripsi.'));
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <div className="auth-icon"><Icon d={ICONS.lock} size={28} /></div>
        <span className="auth-title">{stage === 'create' ? 'Buat PIN' : 'Ulangi PIN'}</span>
        <span className="auth-sub">
          {user?.nama} · {user?.tenantNama}
        </span>
      </div>
      <p className="pin-help">
        PIN mengunci data peserta di perangkat ini. Tanpa PIN, data tersimpan
        sebagai teks acak dan tidak bisa dibaca siapa pun.
      </p>
      <Dots filled={current.length} error={!!error} />
      {error && <div className="auth-error">{error}</div>}
      <Keypad
        onDigit={push}
        onBack={() => (stage === 'create' ? setFirst(first.slice(0, -1)) : setSecond(second.slice(0, -1)))}
      />
    </div>
  );
}

export function Unlock() {
  const { unlock, user, logout } = useApp();
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function push(d: string) {
    if (busy) return;
    setError(null);
    const next = (pin + d).slice(0, PIN_LENGTH);
    setPinValue(next);
    if (next.length < PIN_LENGTH) return;

    setBusy(true);
    const ok = await unlock(next);
    setBusy(false);
    if (!ok) {
      setError('PIN salah.');
      setPinValue('');
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <img src="/terasol-mark.svg" alt="" width={56} height={56} />
        <span className="auth-title">Masukkan PIN</span>
        <span className="auth-sub">{user?.nama} · {user?.tenantNama}</span>
      </div>
      <Dots filled={pin.length} error={!!error} />
      {error && <div className="auth-error">{error}</div>}
      {busy && <div className="auth-note">Membuka kunci…</div>}
      <Keypad onDigit={push} onBack={() => setPinValue(pin.slice(0, -1))} />
      <button className="link-btn" onClick={() => void logout()}>Keluar dan masuk sebagai akun lain</button>
    </div>
  );
}
