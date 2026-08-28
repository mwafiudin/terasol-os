import { useEffect, useState } from 'react';
import { Button, Field, Icon, ICONS, PageHead } from '../components/ui';
import { db, putParticipant } from '../lib/db';
import {
  batasTanggalLahir, imtOf, normalisasiHp, num, PARAMS, periksaHp,
  periksaTanggalLahir, usiaDari,
} from '../lib/domain';
import { draftToRecord, hpSudahAda, useDraft } from '../lib/draft';
import { useApp } from '../lib/store';
import { refreshPending, syncNow } from '../lib/sync';
import type { KonteksGula } from '../lib/rujukan';
import type { ParamKey } from '../lib/types';
import { PapanUkur, PilihGrup, grupUntuk, type Grup } from './PapanUkur';

type Nav = (screen: string) => void;

/* ============================ 1. Registrasi ============================ */

export function Register({ go }: { go: Nav }) {
  const { key, say } = useApp();
  const { draft, patch } = useDraft();
  const [dedupWarn, setDedupWarn] = useState(false);
  const [dedupOk, setDedupOk] = useState(false);
  /**
   * Kolom yang sudah pernah ditinggalkan petugas.
   *
   * Kesalahan baru ditampilkan sesudahnya, bukan sejak huruf pertama: memerahi
   * "08" yang baru diketik separuh adalah menegur orang yang belum selesai
   * bicara. Sesudah menekan Lanjut, keduanya dianggap tersentuh.
   */
  const [sentuh, setSentuh] = useState<{ lahir?: boolean; hp?: boolean }>({});

  if (!draft || !key) return null;
  const set = (p: Parameters<typeof patch>[1]) => void patch(key, p);

  const salahLahir = draft.tanggalLahir ? periksaTanggalLahir(draft.tanggalLahir) : null;
  const salahHp = draft.hp ? periksaHp(draft.hp) : null;
  const usia = usiaDari(draft.tanggalLahir);
  const batas = batasTanggalLahir();

  /**
   * Usia disimpan sebagai turunan, bukan dihitung ulang saat dikirim.
   *
   * Yang dikirim adalah usia PADA SAAT PENDAFTARAN, dan pendaftaran ini terjadi
   * sekarang. Menghitungnya lagi saat sinkronisasi — yang bisa terjadi berhari
   * -hari kemudian di lapangan tanpa sinyal — akan mencatat usia pada hari
   * paketnya terkirim, bukan pada hari orangnya diperiksa.
   */
  const isiLahir = (v: string) => {
    const u = usiaDari(v);
    set({ tanggalLahir: v, usia: u == null ? '' : String(u) });
  };

  async function lanjut() {
    if (!draft || !key) return;
    setSentuh({ lahir: true, hp: true });
    if (!draft.nama || !draft.gender || !draft.tanggalLahir || !draft.hp) {
      say('Lengkapi nama, jenis kelamin, tanggal lahir, dan nomor HP.');
      return;
    }
    // Nomor yang salah bentuk tidak bisa dihubungi saat tindak lanjut, dan
    // memecah orang yang sama menjadi dua record karena dedup HP tidak cocok.
    if (periksaTanggalLahir(draft.tanggalLahir) || periksaHp(draft.hp)) return;

    // Disimpan dalam bentuk baku supaya "0812…", "+62812…", dan "62812…"
    // menjadi satu nomor yang sama bagi pencarian maupun dedup.
    const baku = normalisasiHp(draft.hp);
    if (baku !== draft.hp) set({ hp: baku });

    // §4.3.2 — deteksi lokal sebelum membuat record baru.
    if (!dedupOk && await hpSudahAda(key, draft.eventClientId, baku, draft.clientId)) {
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

      <div className="dua-kolom">
        {/* Usianya muncul di sebelah label begitu tanggalnya lengkap — petugas
            menyebut usia, bukan tanggal lahir, saat memastikan ke pesertanya.
            Tanpa itu kolom ini menuntut kepercayaan bahwa yang dihitung benar. */}
        <Field label={`Tanggal lahir${usia == null ? '' : ` · ${usia} th`}`} htmlFor="p-lahir">
          <input id="p-lahir" className={`input${sentuh.lahir && salahLahir ? ' salah' : ''}`}
            type="date" value={draft.tanggalLahir}
            min={batas.min} max={batas.maks}
            aria-invalid={!!(sentuh.lahir && salahLahir)}
            onChange={(e) => isiLahir(e.target.value)}
            onBlur={() => setSentuh((s) => ({ ...s, lahir: true }))} />
          {sentuh.lahir && salahLahir && <small className="field-salah">{salahLahir}</small>}
        </Field>
        <Field label="Nomor HP" htmlFor="p-hp">
          <input id="p-hp" className={`input${sentuh.hp && salahHp ? ' salah' : ''}`}
            inputMode="tel" value={draft.hp}
            aria-invalid={!!(sentuh.hp && salahHp)}
            onChange={(e) => {
              setDedupWarn(false); setDedupOk(false);
              // `+` dibiarkan supaya "+62…" bisa diketik apa adanya; pembakuan
              // ke bentuk 08… dilakukan saat kolomnya ditinggalkan.
              set({ hp: e.target.value.replace(/[^\d+]/g, '').slice(0, 16) });
            }}
            onBlur={() => {
              setSentuh((s) => ({ ...s, hp: true }));
              if (draft.hp && !periksaHp(draft.hp)) {
                const baku = normalisasiHp(draft.hp);
                if (baku !== draft.hp) set({ hp: baku });
              }
            }}
            placeholder="0812…" />
          {sentuh.hp && salahHp && <small className="field-salah">{salahHp}</small>}
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

/**
 * Input hasil pengukuran saat registrasi.
 *
 * Memakai papan yang sama persis dengan "Catat pengukuran" di layar peserta.
 * Sebelumnya keduanya adalah dua tampilan berbeda untuk pekerjaan yang sama —
 * baris memanjang di sini, ubin di sana — dan petugas yang hafal salah satunya
 * tetap harus mempelajari yang lain.
 *
 * Bedanya hanya penyimpanan: di sini tiap ketukan masuk ke draft terenkripsi
 * (US-03), supaya aplikasi yang tertutup mendadak di lapangan tidak
 * menghilangkan pengukuran yang sudah diambil.
 */
/**
 * Kunci slot menjadi kunci draft.
 *
 * Slot gula darah membawa konteksnya di dalam kunci ("gula:puasa") supaya ubin
 * bisa menampilkan kodenya. Draft menyimpannya sebagai satu nilai `gula`
 * dengan konteks di kolom terpisah — kalau tidak, satu peserta bisa punya tiga
 * angka gula darah yang tidak pernah dimaksudkan bersamaan.
 */
const keParam = (kunci: string) => kunci.split(':')[0] as ParamKey;

export function Screening({ go }: { go: Nav }) {
  const { key } = useApp();
  const { draft, setValue, patch } = useDraft();
  const [pilih, setPilih] = useState<{ grup: Grup; konteks: KonteksGula } | null>(null);

  if (!draft || !key) return null;

  const nama = `${draft.nama || 'Peserta'}${draft.usia ? ` · ${draft.usia} th` : ''}`;
  const adaNilai = (k: ParamKey) => (draft.values[k] ?? '') !== '';
  const terisiTotal = PARAMS.filter((p) => adaNilai(p.k)).length;

  // Kemajuan per kelompok, memakai kelompok yang sama dengan layar peserta.
  const perGrup: Record<string, number> = {};
  for (const g of grupUntuk(draft.konteksGula ?? 'sewaktu')) {
    perGrup[g.id] = g.slot.filter((s) => adaNilai(keParam(s.kunci))).length;
  }

  if (!pilih) {
    return (
      <div className="page">
        <PageHead title={nama} step={`LANGKAH 3 DARI 3 · ${terisiTotal} DARI ${PARAMS.length} TERISI`}
          onBack={() => go('consent')}
          right={<span className="saved-chip"><Icon d={ICONS.check} size={14} sw={2.2} />Tersimpan</span>} />
        <PilihGrup
          terisi={perGrup}
          onPilih={(grup, konteks) => {
            // Konteks gula ikut disimpan ke draft: angka gula darah tanpa
            // konteks tidak punya rentang rujukan yang benar.
            if (grup.id === 'darah') void patch(key, { konteksGula: konteks });
            setPilih({ grup, konteks });
          }}
          // Registrasi boleh diselesaikan tanpa satu pun angka: pesertanya sudah
          // terdaftar dan sudah menyetujui, dan pengukurannya bisa saja dilakukan
          // di meja lain atau tidak sama sekali.
          onSelesai={() => go('done')}
          onBatal={() => go('consent')}
          labelBatal="Kembali ke persetujuan"
        />
      </div>
    );
  }

  return (
    <PapanUkur
      judul={nama}
      subjudul={`${pilih.grup.label.toUpperCase()} · LANGKAH 3 DARI 3`}
      kanan={<span className="saved-chip"><Icon d={ICONS.check} size={14} sw={2.2} />Tersimpan</span>}
      slot={pilih.grup.slot}
      label={pilih.grup.label}
      konteksGula={pilih.konteks}
      labelSimpan="Simpan kelompok"
      bolehKosong
      // Nilai draft dipetakan ke kunci slot; gula darah dibawa ke kunci
      // berkonteks agar ubinnya menampilkan angka yang sudah terisi.
      nilai={Object.fromEntries(
        pilih.grup.slot.map((s) => [s.kunci, draft.values[keParam(s.kunci)] ?? '']),
      )}
      onNilai={(kunci: string, ubah: (lama: string) => string) => {
        const k = keParam(kunci);
        // Dibaca dari store, BUKAN dari draft hasil render: zustand menulisnya
        // sinkron, jadi ketukan beruntun tetap menumpuk dengan benar.
        const cur = useDraft.getState().draft?.values[k] ?? '';
        void setValue(key, k, ubah(cur));
      }}
      onBatal={() => setPilih(null)}
      // Kembali ke pemilih, bukan langsung selesai: kelompok berikutnya diambil
      // dari sana, dan kemajuannya terlihat sebagai penanda tercentang.
      onSimpan={async () => { setPilih(null); }}
    />
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
