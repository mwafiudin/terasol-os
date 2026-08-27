import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Field, ICONS, InputRupiah, Navigasi, Sheet, Toast, type TabId } from './components/ui';
import { api, type ServerParticipant } from './lib/api';
import { CONV_LABEL, fmtTanggal, fmtWaktu } from './lib/domain';
import { useDraft } from './lib/draft';
import { activeEvent } from './lib/events';
import type { PesertaRingkas } from './lib/pesertaEvent';
import { installIdleLock, installNetworkWatch, useApp } from './lib/store';
import { isOnline, startAutoSync } from './lib/sync';
import type { ConvStatus, EventRow } from './lib/types';
import { Conflicts, Placeholder, Pusat, Settings } from './screens/Admin';
import { Master, type MasterTab } from './screens/Master';
import { Login, SetPin, Unlock } from './screens/Auth';
import { EventForm, Events, Recap } from './screens/Events';
import { Home } from './screens/Home';
import { Consent, Done, Register, Screening } from './screens/Participant';
import { EventPeserta, PesertaDetail, type SasaranAnalisis } from './screens/Peserta';
import { Analisis } from './screens/Analisis';
import { ProdukKatalog } from './screens/Produk';

type Screen =
  | 'home' | 'events' | 'outlet' | 'hs'
  | 'eventForm' | 'register' | 'consent' | 'screening' | 'done'
  | 'recap' | 'conflicts' | 'settings' | 'pusat' | 'master'
  | 'eventPeserta' | 'pesertaDetail' | 'analisis' | 'produk';

const TOP_SCREENS: Screen[] = ['home', 'events', 'outlet', 'hs'];

export default function App() {
  const { phase, boot, key, toast, say, user } = useApp();
  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<TabId>('home');
  const [recapEvent, setRecapEvent] = useState<EventRow | null>(null);
  const [eventPeserta, setEventPeserta] = useState<EventRow | null>(null);
  const [pesertaTerpilih, setPesertaTerpilih] = useState<PesertaRingkas | null>(null);
  const [sasaranAnalisis, setSasaranAnalisis] = useState<SasaranAnalisis | null>(null);
  /** Alur peserta bisa dimulai dari Beranda atau dari daftar peserta event. */
  const [asalPeserta, setAsalPeserta] = useState<'home' | 'eventPeserta'>('home');
  const [consentText, setConsentText] = useState<{ versi: string; isi: string } | null>(null);
  const [followUp, setFollowUp] = useState<ServerParticipant | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Diangkat ke sini supaya sub-menu sidebar bisa mengarahkannya langsung.
  const [masterTab, setMasterTab] = useState<MasterTab>("katalog");
  const startDraft = useDraft((s) => s.start);
  const restoreDraft = useDraft((s) => s.restore);

  useEffect(() => { void boot(); }, [boot]);
  useEffect(() => installNetworkWatch(), []);

  useEffect(() => {
    if (phase !== 'ready') return;
    const stopIdle = installIdleLock();
    const stopSync = startAutoSync(() => useApp.getState().key);
    return () => { stopIdle(); stopSync(); };
  }, [phase]);

  // Draft yang tertinggal dipulihkan begitu kunci tersedia.
  useEffect(() => { if (key) void restoreDraft(key); }, [key, restoreDraft]);

  // Teks consent + versinya diambil dari server dan dipakai saat merekam persetujuan.
  useEffect(() => {
    if (phase !== 'ready' || !isOnline()) return;
    api.consentText().then((t) => t && setConsentText(t)).catch(() => {});
  }, [phase]);

  const go = useCallback((next: string) => {
    const s = next as Screen;
    setScreen(s);
    if (TOP_SCREENS.includes(s)) setTab(s as TabId);
    window.scrollTo(0, 0);
    document.querySelector('.screen')?.scrollTo(0, 0);
  }, []);

  // Tombol kembali Android tidak boleh menutup aplikasi di tengah alur.
  useEffect(() => {
    history.pushState({ screen }, '');
    const onPop = () => { if (screen !== 'home') go('home'); else history.pushState({}, ''); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [screen, go]);

  async function mulaiRegistrasi(dari: 'home' | 'eventPeserta' = 'home', ev?: EventRow) {
    const target = ev ?? await activeEvent();
    if (!target) { say('Buat event dulu sebelum mencatat peserta.'); go('eventForm'); return; }
    setAsalPeserta(dari);
    startDraft(target.clientId, consentText?.versi ?? 'v1');
    go('register');
  }

  /**
   * Navigasi keluar dari alur peserta. Kalau alurnya dimulai dari daftar
   * peserta sebuah event, "kembali" berarti kembali ke daftar itu — bukan
   * melempar petugas ke Beranda dan memaksanya menelusuri ulang.
   */
  const goAlurPeserta = useCallback((s: string) => {
    setReloadKey((k) => k + 1);
    if (s === 'home' && asalPeserta === 'eventPeserta' && eventPeserta) {
      go('eventPeserta');
      return;
    }
    go(s);
  }, [asalPeserta, eventPeserta, go]);

  if (phase === 'booting') {
    return <div className="app boot"><img src="/terasol-mark.svg" alt="" width={56} height={56} /></div>;
  }
  if (phase === 'login') return <Shell><Login /></Shell>;
  if (phase === 'setPin') return <Shell><SetPin /></Shell>;
  if (phase === 'locked') return <Shell><Unlock /></Shell>;

  const showTabs = TOP_SCREENS.includes(screen);
  const koordinator = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  // Isian sekunder rel navigasi. Hanya muncul mulai tablet; di ponsel keduanya
  // sudah punya rumah sendiri (ikon gigi di kepala, dan kartu menu Beranda).
  const navSekunder = [
    ...(koordinator ? [{
      id: 'master', label: 'Master data', icon: ICONS.tag,
      anak: [
        { id: 'master:katalog', label: 'Produk & layanan' },
        { id: 'master:tim', label: 'Tim' },
        ...(user?.role === 'admin_pusat' ? [{ id: 'master:cabang', label: 'Cabang' }] : []),
      ],
    }] : []),
    // Terbuka untuk semua peran: pertanyaan 'ini isinya apa' datang di meja,
    // bukan di kantor, dan yang ditanya adalah petugas.
    { id: 'produk', label: 'Produk', icon: ICONS.cart },
    { id: 'settings', label: 'Pengaturan', icon: ICONS.gear },
  ];

  /** `master:katalog` dari sidebar dipetakan ke layar + tabnya. */
  const pilihNav = (id: string) => {
    if (id.startsWith('master:')) {
      setMasterTab(id.slice('master:'.length) as MasterTab);
      go('master');
      return;
    }
    go(id);
  };

  // Lebar layar yang menentukan bentuk, bukan peran. Petugas yang bekerja dari
  // tablet di meja pendaftaran memerlukan layout yang sama lapangnya dengan
  // Koordinator, dan Koordinator yang membuka dari HP tetap butuh layout ponsel.
  return (
    <div className="app">
      <main className="screen">
        {screen === 'home' && (
          <Home go={go} onFollowUp={setFollowUp} reloadKey={reloadKey}
            onDaftar={(ev) => void mulaiRegistrasi('home', ev)} />
        )}
        {screen === 'events' && (
          <Events go={go} reloadKey={reloadKey}
            onOpenRecap={(ev) => { setRecapEvent(ev); go('recap'); }}
            onOpenPeserta={(ev) => { setEventPeserta(ev); go('eventPeserta'); }} />
        )}
        {screen === 'eventPeserta' && eventPeserta && (
          <EventPeserta go={go} event={eventPeserta} reloadKey={reloadKey}
            onBuka={(p) => { setPesertaTerpilih(p); go('pesertaDetail'); }}
            onTambah={() => void mulaiRegistrasi('eventPeserta', eventPeserta)} />
        )}
        {screen === 'pesertaDetail' && pesertaTerpilih && (
          <PesertaDetail go={go} peserta={pesertaTerpilih}
            onUbah={() => setReloadKey((k) => k + 1)}
            onAnalisis={(s) => { setSasaranAnalisis(s); go('analisis'); }} />
        )}
        {screen === 'analisis' && sasaranAnalisis && (
          <Analisis go={() => go('pesertaDetail')} {...sasaranAnalisis} />
        )}
        {screen === 'eventForm' && <EventForm go={go} onSaved={() => setReloadKey((k) => k + 1)} />}
        {screen === 'register' && <Register go={goAlurPeserta} />}
        {screen === 'consent' && <Consent go={goAlurPeserta} consentText={consentText} />}
        {screen === 'screening' && <Screening go={goAlurPeserta} />}
        {screen === 'done' && <Done go={goAlurPeserta} />}
        {screen === 'recap' && recapEvent && (
          <Recap go={go} event={recapEvent}
            onArchived={() => setReloadKey((k) => k + 1)}
            onOpenPeserta={() => { setEventPeserta(recapEvent); go('eventPeserta'); }} />
        )}
        {screen === 'conflicts' && <Conflicts go={go} />}
        {screen === 'settings' && <Settings go={go} />}
        {screen === 'pusat' && user?.role === 'admin_pusat' && <Pusat go={go} />}
        {screen === 'master' && koordinator && (
          <Master go={go} tab={masterTab} onTab={setMasterTab} />
        )}
        {screen === 'produk' && <ProdukKatalog go={go} />}
        {screen === 'outlet' && <Placeholder kind="outlet" />}
        {screen === 'hs' && <Placeholder kind="hs" />}
      </main>

      <Navigasi active={TOP_SCREENS.includes(screen) ? tab : screen}
        anakAktif={'master:' + masterTab}
        onSelect={pilihNav} sekunder={navSekunder}
        cabang={user?.tenantNama} sembunyiDiPonsel={!showTabs} />
      {toast && <Toast message={toast} />}
      {followUp && (
        <FollowUpSheet participant={followUp}
          onClose={() => setFollowUp(null)}
          onDone={() => { setFollowUp(null); setReloadKey((k) => k + 1); }} />
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const toast = useApp((s) => s.toast);
  return (
    <div className="app">
      <main className="screen">{children}</main>
      {toast && <Toast message={toast} />}
    </div>
  );
}

/** US-04 — Koordinator memperbarui status konversi setelah event. */
function FollowUpSheet({ participant, onClose, onDone }: {
  participant: ServerParticipant; onClose: () => void; onDone: () => void;
}) {
  const say = useApp((s) => s.say);
  const [buying, setBuying] = useState(false);
  const [nilai, setNilai] = useState('');
  const [produk, setProduk] = useState('');
  const [busy, setBusy] = useState(false);
  const conv = CONV_LABEL[participant.convStatus] ?? CONV_LABEL.baru!;

  async function set(status: ConvStatus, nilaiTransaksi = 0, produkNama: string | null = null) {
    setBusy(true);
    try {
      await api.setConversion(participant.id, { status, nilaiTransaksi, produk: produkNama });
      say(status === 'membeli' ? 'Konversi tercatat.' : 'Status diperbarui.');
      onDone();
    } catch {
      say('Gagal memperbarui status. Periksa koneksi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`${participant.nama}, ${participant.usia} th`}
      subtitle={participant.hp} onClose={onClose}>

      {/* US-04 — jejak peserta: event asal → tanggal screening → status terkini. */}
      <ol className="jejak">
        <li>
          <span className="jejak-label">Event asal</span>
          <span className="jejak-nilai">{participant.eventNama}</span>
        </li>
        <li>
          <span className="jejak-label">Tanggal screening</span>
          <span className="jejak-nilai">
            {participant.measuredAt
              ? fmtWaktu(participant.measuredAt)
              : fmtTanggal(participant.eventTanggal)}
          </span>
        </li>
        <li>
          <span className="jejak-label">Status terkini</span>
          <span className="jejak-nilai">
            <Badge tone={conv.tone}>{conv.label}</Badge>
            {participant.convUpdatedAt && (
              <span className="jejak-waktu">diperbarui {fmtWaktu(participant.convUpdatedAt)}</span>
            )}
          </span>
        </li>
      </ol>

      {!buying ? (
        <>
          <Button variant="secondary" full disabled={busy} onClick={() => void set('dihubungi')}>
            Tandai sudah dihubungi
          </Button>
          <Button full disabled={busy} onClick={() => setBuying(true)}>Membeli — isi transaksi</Button>
          <Button variant="ghost" full disabled={busy} onClick={() => void set('batal')}>Tidak jadi</Button>
        </>
      ) : (
        <>
          <Field label="Nilai transaksi" htmlFor="f-nilai">
            <InputRupiah id="f-nilai" value={nilai} onChange={setNilai} placeholder="1.400.000" />
          </Field>
          <Field label="Produk yang dibeli" htmlFor="f-produk">
            <input id="f-produk" className="input" value={produk}
              onChange={(e) => setProduk(e.target.value)} placeholder="cth. Paket herbal sendi" />
          </Field>
          <Button full disabled={busy || !nilai || !produk.trim()} icon={ICONS.check}
            onClick={() => void set('membeli', Number(nilai), produk.trim())}>
            Simpan pembelian
          </Button>
          <button className="link-btn" onClick={() => setBuying(false)}>Batal</button>
        </>
      )}
      <span className="hint-subtle">Perubahan status tercatat di audit log. Akses Koordinator.</span>
    </Sheet>
  );
}
