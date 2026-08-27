import { useEffect, useState } from 'react';
import { Button, Field, Icon, ICONS, PageHead } from '../components/ui';
import { db, putParticipant } from '../lib/db';
import { imtOf, num, outOfRange, PARAMS } from '../lib/domain';
import { draftToRecord, hpSudahAda, useDraft } from '../lib/draft';
import { useApp } from '../lib/store';
import { refreshPending, syncNow } from '../lib/sync';
import type { ParamKey } from '../lib/types';

type Nav = (screen: string) => void;

/* ============================ 1. Registrasi ============================ */

export function Register({ go }: { go: Nav }) {
  const { key, say } = useApp();
  const { draft, patch } = useDraft();
  const [dedupWarn, setDedupWarn] = useState(false);
  const [dedupOk, setDedupOk] = useState(false);

  if (!draft || !key) return null;
  const set = (p: Parameters<typeof patch>[1]) => void patch(key, p);

  async function lanjut() {
    if (!draft || !key) return;
    if (!draft.nama || !draft.gender || !draft.usia || !draft.hp) {
      say('Lengkapi nama, jenis kelamin, usia, dan nomor HP.');
      return;
    }
    // §4.3.2 — deteksi lokal sebelum membuat record baru.
    if (!dedupOk && await hpSudahAda(key, draft.eventClientId, draft.hp, draft.clientId)) {
      setDedupWarn(true);
      return;
    }
    go('consent');
  }

  return (
    <div className="page">
      <PageHead title="Peserta baru" step="LANGKAH 1 DARI 3 · REGISTRASI" onBack={() => go('home')} />

      <Field label="Nama lengkap" htmlFor="p-nama">
        <input id="p-nama" className="input" value={draft.nama}
          onChange={(e) => set({ nama: e.target.value })} placeholder="cth. Ibu Ratna" />
      </Field>

      <div className="field">
        <label>Jenis kelamin</label>
        <div className="pill-row">
          <button className={`pill-choice ${draft.gender === 'P' ? 'on' : ''}`}
            onClick={() => set({ gender: 'P' })}>Perempuan</button>
          <button className={`pill-choice ${draft.gender === 'L' ? 'on' : ''}`}
            onClick={() => set({ gender: 'L' })}>Laki-laki</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
        <Field label="Usia" htmlFor="p-usia">
          <input id="p-usia" className="input" inputMode="numeric" value={draft.usia}
            onChange={(e) => set({ usia: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="62" />
        </Field>
        <Field label="Nomor HP" htmlFor="p-hp">
          <input id="p-hp" className="input" inputMode="numeric" value={draft.hp}
            onChange={(e) => { setDedupWarn(false); setDedupOk(false); set({ hp: e.target.value.replace(/[^\d+]/g, '') }); }}
            placeholder="0812…" />
        </Field>
      </div>

      {dedupWarn && (
        <div className="dedup-card">
          <b>Nomor HP ini sudah terdaftar di event ini</b>
          <p>Periksa apakah peserta yang sama, atau tetap buat record baru.</p>
          <div className="row">
            <Button variant="secondary" size="sm" onClick={() => setDedupWarn(false)}>Periksa data</Button>
            <Button size="sm" onClick={() => { setDedupWarn(false); setDedupOk(true); go('consent'); }}>
              Tetap buat baru
            </Button>
          </div>
        </div>
      )}

      <Button size="lg" full iconRight={ICONS.arrowR} onClick={() => void lanjut()}>
        Lanjut ke persetujuan
      </Button>
      <span className="hint">Setiap field tersimpan otomatis dan terenkripsi di perangkat.</span>
    </div>
  );
}

/* ============================ 2. Persetujuan ============================ */

export function Consent({ go, consentText }: { go: Nav; consentText: { versi: string; isi: string } | null }) {
  const { key, say } = useApp();
  const { draft, patch, clear } = useDraft();
  if (!draft || !key) return null;

  const poin = (consentText?.isi ?? '').split('\n').filter(Boolean);

  async function tolak() {
    if (!draft) return;
    // US-02: peserta tetap dilayani, hasil TIDAK disimpan — hanya tally anonim.
    await db.anonTallies.put({
      clientId: crypto.randomUUID(),
      eventClientId: draft.eventClientId,
      paramsDiambil: [],
      createdAt: new Date().toISOString(),
      synced: 0,
    });
    await clear();
    await refreshPending();
    say('Dicatat sebagai tally anonim. Hasil tidak disimpan.');
    go('home');
  }

  return (
    <div className="page">
      <PageHead title="Persetujuan data" step="LANGKAH 2 DARI 3 · PERSETUJUAN"
        onBack={() => go('register')} />

      <div className="card consent-card">
        <svg className="wave" viewBox="0 0 360 32" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 16 C 50 5 110 27 180 16 S 310 5 360 16" stroke="rgba(18,84,90,.10)" strokeWidth="2" />
          <path d="M0 24 C 50 13 110 35 180 24 S 310 13 360 24" stroke="rgba(108,132,120,.14)" strokeWidth="2" />
        </svg>
        <b>Bacakan kepada peserta:</b>
        <div className="consent-points">
          {poin.map((t, i) => <div className="pt" key={i}><span>{t}</span></div>)}
        </div>
        <small>
          Teks consent {consentText?.versi ?? 'v1'} (draf — menunggu review hukum).
          Persetujuan direkam dengan waktu dan versi teks.
        </small>
      </div>

      <Button size="lg" full icon={ICONS.check}
        onClick={() => { void patch(key, { consentGranted: true, consentVersi: consentText?.versi ?? 'v1' }); go('screening'); }}>
        Peserta setuju
      </Button>
      <Button variant="secondary" full icon={ICONS.x} onClick={() => void tolak()}>
        Peserta menolak
      </Button>
      <span className="hint">
        Bila menolak, peserta tetap dilayani. Hasil tidak disimpan — hanya tally
        anonim untuk hitungan consumable.
      </span>
    </div>
  );
}

/* ============================ 3. Input hasil ============================ */

export function Screening({ go }: { go: Nav }) {
  const { key } = useApp();
  const { draft, active, warn, setActive, setValue, setWarn } = useDraft();
  if (!draft || !key) return null;

  const idx = PARAMS.findIndex((p) => p.k === active);
  const param = PARAMS[idx]!;
  const imt = imtOf(draft.values);
  const terakhir = idx >= PARAMS.length - 1;

  function maju() {
    if (terakhir) { go('done'); return; }
    setActive(PARAMS[idx + 1]!.k);
  }

  function lanjut() {
    const raw = draft!.values[active];
    // US-03: nilai di luar rentang wajar minta konfirmasi ulang, bukan ditolak.
    if (raw && outOfRange(active, raw) && warn !== active) {
      setWarn(active);
      return;
    }
    maju();
  }

  /**
   * Nilai berjalan dibaca dari store, BUKAN dari `draft` hasil render.
   *
   * Petugas mengetik tiga angka lebih cepat daripada React sempat merender
   * ulang. Dengan `draft` dari closure, ketiga ketukan itu membaca isi yang
   * sama dan hanya yang terakhir tersimpan: "156" menjadi "6", tanpa satu pun
   * tanda bahwa ada digit yang hilang. `getState()` selalu mengembalikan yang
   * terbaru karena zustand menulisnya secara sinkron.
   */
  function nilaiKini(): string {
    return useDraft.getState().draft?.values[active] ?? '';
  }

  function ketik(d: string) {
    const cur = nilaiKini();
    if (d === ',' && (!param.dec || !cur || cur.includes(','))) return;
    if (cur.length >= 5) return;
    void setValue(key!, active, cur + d);
  }

  return (
    <div className="scr-wrap">
      <div className="scr-head">
        <button className="back-btn" onClick={() => go('consent')} aria-label="Kembali">
          <Icon d={ICONS.back} size={24} />
        </button>
        <div className="tx">
          <span className="name">{draft.nama || 'Peserta'}{draft.usia ? ` · ${draft.usia} th` : ''}</span>
          <span className="step-label">LANGKAH 3 DARI 3 · PARAMETER {idx + 1} DARI {PARAMS.length}</span>
        </div>
        <span className="saved-chip"><Icon d={ICONS.check} size={14} sw={2.2} />Tersimpan</span>
      </div>

      <div className="scr-rows">
        {PARAMS.map((p) => {
          const v = draft.values[p.k] ?? '';
          const isActive = p.k === active;
          const cls = `param-row${isActive ? ' active' : v ? ' filled' : ''}`;
          return (
            <button key={p.k} className={cls} onClick={() => setActive(p.k)}>
              <span className="tx">
                <b>{p.label}</b>
                <span>{p.unit} · rentang {String(p.min).replace('.', ',')}–{String(p.max).replace('.', ',')}</span>
              </span>
              <span className="val">{v || (isActive ? '' : '–')}</span>
            </button>
          );
        })}

        {warn === active && (
          <div className="range-warn">
            Nilai di luar rentang wajar ({param.min}–{param.max} {param.unit}).
            Ketuk Lanjut sekali lagi untuk konfirmasi.
          </div>
        )}
        {imt && (
          <div className="imt-chip">
            <b>IMT otomatis:</b>
            <span>{imt.nilai.toLocaleString('id-ID')} — {imt.kategori}</span>
          </div>
        )}
      </div>

      <div className="keypad-dock">
        <div className="keypad-actions">
          <Button variant="ghost" onClick={() => { void setValue(key, active, ''); maju(); }}>Lewati</Button>
          <Button style={{ flex: 1 }} onClick={lanjut}>{terakhir ? 'Selesai' : 'Lanjut'}</Button>
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="key" onClick={() => ketik(d)}>{d}</button>
          ))}
          <button className="key" onClick={() => ketik(',')}>,</button>
          <button className="key" onClick={() => ketik('0')}>0</button>
          <button className="key" aria-label="Hapus"
            onClick={() => void setValue(key, active, nilaiKini().slice(0, -1))}>
            <Icon d={ICONS.backspace} size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ 4. Selesai ============================ */

export function Done({ go }: { go: Nav }) {
  const { key, say } = useApp();
  const { draft, patch, clear, start } = useDraft();
  const [busy, setBusy] = useState(false);
  if (!draft || !key) return null;

  const imt = imtOf(draft.values);
  const diambil = (Object.keys(draft.values) as ParamKey[]).filter((k) => (draft.values[k] ?? '') !== '').length;

  async function simpan(next: 'register' | 'home') {
    if (!draft || !key || busy) return;
    setBusy(true);
    try {
      const { secret } = draftToRecord(draft);
      const now = new Date().toISOString();
      await putParticipant(key, {
        clientId: draft.clientId,
        eventClientId: draft.eventClientId,
        createdAt: draft.startedAt,
        updatedAt: now,
        synced: 0,
        needsReview: 0,
        berminat: draft.berminat ? 1 : 0,
        convStatus: draft.berminat ? 'baru' : null,
        nilaiTransaksi: 0,
        produk: null,
      }, secret);

      const ev = draft.eventClientId;
      const versi = draft.consentVersi;
      await clear();
      await refreshPending();
      say('Peserta tersimpan di perangkat.');
      void syncNow(key, { silent: true }).catch(() => {});

      if (next === 'register') { start(ev, versi); go('register'); }
      else go('home');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-home">
      <div className="done-head">
        <svg className="deco" viewBox="0 0 170 170" fill="none" aria-hidden="true">
          <circle cx="85" cy="85" r="50" stroke="rgba(18,84,90,.09)" strokeWidth="1.5"
            strokeDasharray="290 40" strokeLinecap="round" transform="rotate(30 85 85)" />
          <circle cx="85" cy="85" r="68" stroke="rgba(108,132,120,.11)" strokeWidth="1.5"
            strokeDasharray="370 60" strokeLinecap="round" transform="rotate(-60 85 85)" />
          <circle cx="138" cy="50" r="4" fill="rgba(204,156,72,.5)" />
        </svg>
        <div className="ok"><Icon d={ICONS.check} size={28} sw={2} /></div>
        <b>Hasil tercatat</b>
      </div>

      <div className="card summary-card">
        <div className="summary-row">
          <span>Peserta</span>
          <span>{draft.nama || 'Peserta'}{draft.usia ? `, ${draft.usia} th` : ''}</span>
        </div>
        <div className="summary-row">
          <span>Parameter diambil</span><span>{diambil} dari {PARAMS.length}</span>
        </div>
        {imt && (
          <div className="summary-row">
            <span>IMT</span><span>{imt.nilai.toLocaleString('id-ID')} — {imt.kategori}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Persetujuan</span>
          <span className="good">Setuju · {draft.consentVersi}</span>
        </div>
      </div>

      <button className={`minat-toggle ${draft.berminat ? 'on' : ''}`}
        onClick={() => void patch(key, { berminat: !draft.berminat })}>
        <span className="tx">
          <b>Peserta berminat produk</b>
          <span>Masuk daftar tindak lanjut Koordinator</span>
        </span>
        <span className="ring">{draft.berminat && <Icon d={ICONS.check} size={18} sw={2.4} />}</span>
      </button>

      <Button size="lg" full icon={ICONS.userPlus} disabled={busy} onClick={() => void simpan('register')}>
        Simpan &amp; peserta berikutnya
      </Button>
      <Button variant="ghost" full icon={ICONS.home} disabled={busy} onClick={() => void simpan('home')}>
        Simpan &amp; kembali ke beranda
      </Button>
    </div>
  );
}

/** Memulihkan draft yang tertinggal saat aplikasi ditutup mendadak. */
export function useRestoreDraft(key: CryptoKey | null) {
  const restore = useDraft((s) => s.restore);
  useEffect(() => {
    if (key) void restore(key);
  }, [key, restore]);
}

export { num };
