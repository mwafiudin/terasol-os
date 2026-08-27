import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge, Button, Field, Icon, ICONS, InputRupiah, PageHead, Paginasi, SegTabs, Sheet,
  usePaginasi,
} from '../components/ui';
import {
  TEMUAN_LABEL, adaYangDinilai, temuanPeserta, type KodeTemuan,
} from '../lib/analisis';
import { api, type ParticipantDetail } from '../lib/api';
import { readParticipant } from '../lib/db';
import {
  CONV_LABEL, PARAM_LABEL, PARAMS, bisaTerimaPeserta,
  dec, fmtTanggal, fmtWaktu, imtOf, normalisasiHp, num, periksaHp, periksaUsia, rp, statusTampil,
} from '../lib/domain';
import { db } from '../lib/db';
import { pesertaEvent, rekapSementara, type PesertaRingkas, type RekapSementara } from '../lib/pesertaEvent';
import { nilaiImt, type Gender } from '../lib/rujukan';
import { useApp } from '../lib/store';
import { isOnline } from '../lib/sync';
import type { ConvStatus, EventRow, ParamKey } from '../lib/types';
import { KartuTerhapus, TabBelanja, TabPengukuran } from './Riwayat';

type Nav = (screen: string) => void;

/* ===================== Daftar peserta sebuah event ===================== */

type FilterKey = 'semua' | KodeTemuan | 'bersih' | 'antre' | 'ditinjau';

/**
 * Penyaring daftar peserta, berdasarkan HASIL PEMERIKSAAN.
 *
 * Sebelumnya barisnya berisi status tindak lanjut — belum dihubungi, membeli,
 * tidak jadi. Itu pertanyaan yang datang berhari-hari sesudahnya, dan tempatnya
 * memang ada: daftar "Tindak lanjut peserta" di Beranda. Yang dicari orang
 * SAAT event masih berjalan adalah siapa yang angkanya di luar rentang rujukan,
 * karena merekalah yang perlu diajak bicara sebelum pulang.
 *
 * Dua penyaring operasional tetap tinggal: antrean sync dan record yang perlu
 * ditinjau. Keduanya bukan keputusan CRM, melainkan keadaan data itu sendiri.
 */
const FILTER: { k: FilterKey; label: string; cocok: (p: PesertaRingkas) => boolean }[] = [
  { k: 'semua', label: 'Semua', cocok: () => true },
  ...(Object.keys(TEMUAN_LABEL) as KodeTemuan[]).map((kode) => ({
    k: kode as FilterKey,
    label: TEMUAN_LABEL[kode],
    cocok: (p: PesertaRingkas) => temuanPeserta(p.nilai, p.gender).has(kode),
  })),
  {
    k: 'bersih',
    label: 'Dalam rujukan',
    // Hanya bagi yang memang punya angka untuk dinilai. Peserta yang belum
    // diukur sama sekali bukan "dalam rujukan" — ia belum diperiksa.
    cocok: (p) => adaYangDinilai(p.nilai) && temuanPeserta(p.nilai, p.gender).size === 0,
  },
  { k: 'antre', label: 'Antre', cocok: (p) => p.belumSync },
  { k: 'ditinjau', label: 'Perlu ditinjau', cocok: (p) => p.needsReview },
];

/** Nomor HP dicocokkan tanpa spasi/tanda supaya "0812 3456" tetap ketemu. */
const angkaSaja = (s: string) => s.replace(/\D/g, '');

function cocokPencarian(p: PesertaRingkas, kata: string): boolean {
  const q = kata.trim().toLowerCase();
  if (!q) return true;
  if (p.nama.toLowerCase().includes(q)) return true;
  const digit = angkaSaja(q);
  return digit.length > 0 && angkaSaja(p.hp).includes(digit);
}

export function EventPeserta({ go, event, onBuka, onTambah, reloadKey }: {
  go: Nav;
  event: EventRow;
  onBuka: (p: PesertaRingkas) => void;
  onTambah: () => void;
  reloadKey: number;
}) {
  const { key } = useApp();
  const [daftar, setDaftar] = useState<PesertaRingkas[] | null>(null);
  const [rekap, setRekap] = useState<RekapSementara | null>(null);
  const [cari, setCari] = useState('');
  const [filter, setFilter] = useState<FilterKey>('semua');
  const chipAktif = useRef<HTMLButtonElement>(null);

  // Baris chip bisa lebih panjang dari layar; chip yang sedang aktif digulir
  // ke tengah supaya selalu terlihat mana yang dipilih.
  useEffect(() => {
    chipAktif.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [filter]);

  const muat = useCallback(async () => {
    const d = await pesertaEvent(key, event);
    setDaftar(d);
    setRekap(await rekapSementara(event, d));
  }, [key, event]);

  useEffect(() => { void muat(); }, [muat, reloadKey]);

  const status = statusTampil(event);
  // Peserta masih boleh dicatat pada event yang dijadwalkan: orang datang lebih
  // awal, dan menutup jalannya tanpa penjelasan lebih buruk daripada terlalu
  // longgar. Event selesai dan diarsipkan tidak lagi menerima.
  const bisaTambah = bisaTerimaPeserta(event.status);

  // Hitungan chip mengikuti kata pencarian, supaya angkanya selalu sesuai
  // dengan apa yang benar-benar akan muncul kalau chip itu diketuk.
  const terjaring = (daftar ?? []).filter((p) => cocokPencarian(p, cari));
  const jumlahPerFilter = new Map<FilterKey, number>(
    FILTER.map((f) => [f.k, terjaring.filter(f.cocok).length]),
  );
  const aktif = FILTER.find((f) => f.k === filter) ?? FILTER[0]!;
  const tampil = terjaring.filter(aktif.cocok);
  // Sepuluh kartu, bukan dua puluh: di ponsel dua puluh kartu adalah empat
  // layar gulir, dan itu persis keluhan yang membuat paginasi ini ada.
  // Pencarian di atas tetap jalan tercepat menuju satu orang tertentu.
  const halaman = usePaginasi(tampil, 10);
  const adaPenyaring = cari.trim() !== '' || filter !== 'semua';

  return (
    <div className="page">
      <PageHead title={event.nama} onBack={() => go('events')}
        right={<Badge tone={status.tone} dot={status.hariIni}>{status.label}</Badge>} />

      <span className="recap-sub">
        <span>
          {fmtTanggal(event.tanggal)} · {event.lokasi} ·{' '}
          {event.tipe === 'berbayar' ? rp(event.hargaPaket) : 'Gratis'}
        </span>
      </span>

      {/* Rekap sementara — dihitung di perangkat supaya tetap tampil saat
          offline, termasuk peserta yang belum sempat terkirim. */}
      {rekap && (
        <div className="card consumable-card rekap-lebar">
          <b>Rekap sementara</b>
          <div className="stat-grid">
            <div className="stat-card"><b>{rekap.peserta}</b><span>Peserta</span></div>
            <div className="stat-card"><b>{rekap.berminat}</b><span>Berminat</span></div>
            <div className="stat-card"><b>{rekap.tallyAnonim}</b><span>Tally anonim</span></div>
            <div className="stat-card"><b>{rekap.belumSync}</b><span>Belum tersync</span></div>
          </div>

          {rekap.paramTerpakai.length > 0 && (
            <>
              <div className="consumable-sep" />
              {rekap.paramTerpakai.map((p) => (
                <div className="consumable-row" key={p.param}>
                  <span>{PARAM_LABEL[p.param]}</span>
                  <span>{p.jumlah} peserta</span>
                </div>
              ))}
              <div className="consumable-total">
                <span>Estimasi consumable</span>
                {rekap.estimasiConsumable === null
                  ? <span className="belum">harga belum diatur</span>
                  : <span>{rp(rekap.estimasiConsumable)}</span>}
              </div>
            </>
          )}

          {rekap.perluDitinjau > 0 && (
            <div className="belum-note">
              {rekap.perluDitinjau} record menunggu peninjauan dan belum ikut
              dihitung. Selesaikan dari Beranda → record perlu ditinjau.
            </div>
          )}
          <small>
            Angka sementara dari perangkat ini. Rekap resmi dihitung server
            setelah semua data tersinkron.
          </small>
        </div>
      )}

      {bisaTambah && (
        <Button size="lg" full icon={ICONS.userPlus} onClick={onTambah}>
          Tambah peserta baru
        </Button>
      )}

      <span className="section-title">
        Daftar peserta{daftar ? ` (${daftar.length})` : ''}
      </span>

      {daftar !== null && daftar.length > 0 && (
        <>
          <div className="cari-kotak">
            <span className="cari-ikon"><Icon d={ICONS.cari} size={18} /></span>
            <input className="input cari-input" type="search" value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama atau nomor HP" aria-label="Cari peserta" />
            {cari && (
              <button className="cari-hapus" onClick={() => setCari('')} aria-label="Hapus pencarian">
                <Icon d={ICONS.x} size={16} />
              </button>
            )}
          </div>

          {/* Chip hanya ditampilkan bila memang ada isinya, supaya barisnya
              tidak penuh pilihan yang pasti kosong. */}
          <div className="chip-baris">
            {FILTER.filter((f) => f.k === 'semua' || (jumlahPerFilter.get(f.k) ?? 0) > 0 || f.k === filter)
              .map((f) => (
                <button key={f.k} className={`chip ${filter === f.k ? 'on' : ''}`}
                  ref={filter === f.k ? chipAktif : undefined}
                  onClick={() => setFilter(f.k)}>
                  {f.label}
                  <span className="chip-jumlah">{jumlahPerFilter.get(f.k) ?? 0}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {daftar === null && <span className="hint">Memuat…</span>}

      {daftar?.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.users} size={26} /></div>
          <b>Belum ada peserta</b>
          <p>
            {bisaTambah
              ? 'Ketuk "Tambah peserta baru" untuk mulai mencatat.'
              : 'Event ini berakhir tanpa peserta tercatat.'}
          </p>
        </div>
      )}

      {daftar !== null && daftar.length > 0 && tampil.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.cari} size={26} /></div>
          <b>Tidak ada yang cocok</b>
          <p>
            {cari.trim()
              ? `Tidak ada peserta dengan nama atau nomor "${cari.trim()}"${filter !== 'semua' ? ` pada status ${aktif.label.toLowerCase()}` : ''}.`
              : `Belum ada peserta berstatus ${aktif.label.toLowerCase()}.`}
          </p>
          <Button size="sm" variant="secondary"
            onClick={() => { setCari(''); setFilter('semua'); }}>
            Tampilkan semua
          </Button>
        </div>
      )}

      {/* Hitungan hasil penyaringan tidak lagi diulang di sini: baris paginasi
          di bawah daftar sudah menyebut "n–m dari N peserta". */}
      {adaPenyaring && tampil.length > 0 && halaman.totalHal <= 1 && (
        <span className="hint" style={{ textAlign: 'left' }}>
          Menampilkan {tampil.length} dari {daftar!.length} peserta.
        </span>
      )}

      {/* Kejujuran tentang asal daftar ini.
          Saat tanpa jaringan, yang tampil adalah salinan yang diambil terakhir
          kali — peserta yang baru saja didaftarkan rekan di meja sebelah belum
          ada di dalamnya. Menyembunyikan itu membuat petugas menyangka orangnya
          belum terdaftar, lalu mendaftarkannya kedua kali. */}
      {(() => {
        const salinan = tampil.map((p) => p.dariCermin).filter((w): w is string => !!w).sort().at(-1);
        return salinan ? (
          <span className="belum-note">
            Tanpa jaringan — daftar ini salinan yang diambil {fmtWaktu(salinan)}.
            Peserta yang dicatat perangkat lain sesudah itu belum terlihat.
          </span>
        ) : null;
      })()}

      {halaman.potong.map((p) => {
        const conv = CONV_LABEL[p.convStatus ?? 'baru']!;
        const temuan = [...temuanPeserta(p.nilai, p.gender)];
        return (
          <button key={p.clientId} className="card peserta-card" onClick={() => onBuka(p)}>
            <div className="peserta-atas">
              <span className="peserta-nama">
                {p.nama}{p.usia ? `, ${p.usia} th` : ''}
              </span>
              {p.belumSync && <Badge tone="warning">Antre</Badge>}
              {p.needsReview && <Badge tone="danger">Ditinjau</Badge>}
            </div>
            <span className="peserta-meta">
              {p.imt != null ? `IMT ${dec(p.imt)}` : 'IMT belum ada'}
              {' · '}{p.paramsDiambil.length} dari {PARAMS.length} parameter
            </span>

            {/* Temuan ikut di kartu, bukan hanya jadi penyaring: daftar yang
                bisa disaring menurut temuan tetapi tidak menampilkannya memaksa
                petugas membuka satu per satu untuk tahu apa yang ditemukan. */}
            {temuan.length > 0 && (
              <span className="peserta-temuan">
                {temuan.map((t) => (
                  <span key={t} className="temuan-tag">{TEMUAN_LABEL[t]}</span>
                ))}
              </span>
            )}

            {p.berminat && <Badge tone={conv.tone}>{conv.label}</Badge>}
          </button>
        );
      })}

      <Paginasi {...halaman} satuan="peserta" onPindah={halaman.setHal} />
    </div>
  );
}

/* ======================== Rekap satu peserta ======================== */

type DetailLokal = {
  nama: string; gender: 'P' | 'L'; usia: string; hp: string;
  consent: { granted: boolean; versiTeks: string; ts: string } | null;
  nilai: Partial<Record<ParamKey, string>>;
  imt: { nilai: number; kategori: string } | null;
  measuredAt: string | null;
  belumSync: boolean;
};

export type SasaranAnalisis = {
  pelangganId: string; nama: string; gender: Gender; usia: number | null; hp: string | null;
};

export function PesertaDetail({ go, peserta, onUbah, onAnalisis }: {
  go: Nav; peserta: PesertaRingkas; onUbah: () => void;
  onAnalisis: (s: SasaranAnalisis) => void;
}) {
  const { key, user, say } = useApp();
  const [server, setServer] = useState<ParticipantDetail | null>(null);
  const [lokal, setLokal] = useState<DetailLokal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [beliBuka, setBeliBuka] = useState(false);
  const [nilai, setNilai] = useState('');
  const [produk, setProduk] = useState('');
  const [tab, setTab] = useState<'diri' | 'belanja' | 'lain'>('diri');
  const [ubahDiri, setUbahDiri] = useState(false);
  const koordinator = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  const muat = useCallback(async () => {
    setError(null);
    // Peserta yang belum tersinkron hanya ada di perangkat ini.
    if (peserta.serverId && isOnline()) {
      try { setServer(await api.participantDetail(peserta.serverId)); return; }
      catch { setError('Gagal memuat dari server — menampilkan data perangkat.'); }
    }
    const baris = await db.participants.get(peserta.clientId);
    if (!baris) { setError('Data peserta tidak ada di perangkat ini.'); return; }
    const view = await readParticipant(key, baris);
    if (!view.secret) { setError('Identitas sudah dibersihkan dari perangkat sesuai retensi.'); return; }
    const s = view.secret;
    setLokal({
      nama: s.nama, gender: s.gender, usia: s.usia, hp: s.hp,
      consent: s.consent,
      nilai: s.screening?.values ?? {},
      imt: imtOf(s.screening?.values ?? {}),
      measuredAt: s.screening?.measuredAt ?? null,
      belumSync: baris.synced === 0,
    });
  }, [peserta, key]);

  useEffect(() => { void muat(); }, [muat]);

  async function setStatus(status: ConvStatus, nilaiTransaksi = 0, produkNama: string | null = null) {
    if (!peserta.serverId) { say('Peserta ini belum tersinkron — sync dulu.'); return; }
    setBusy(true);
    try {
      await api.setConversion(peserta.serverId, { status, nilaiTransaksi, produk: produkNama });
      say(status === 'membeli' ? 'Konversi tercatat.' : 'Status diperbarui.');
      setBeliBuka(false);
      onUbah();
      await muat();
    } catch {
      say('Gagal memperbarui status. Periksa koneksi.');
    } finally { setBusy(false); }
  }

  const nama = server?.nama ?? lokal?.nama ?? peserta.nama;
  const usia = server ? String(server.usia) : lokal?.usia ?? peserta.usia;
  const gender = server?.gender ?? lokal?.gender ?? peserta.gender;
  const hp = server?.hp ?? lokal?.hp ?? peserta.hp;
  const consent = server?.consent ?? lokal?.consent ?? null;
  const conv = server?.conversion ?? null;
  const status = conv?.status ?? peserta.convStatus ?? 'baru';
  const label = CONV_LABEL[status]!;

  // Nilai pengukuran: dari server bila ada, kalau tidak dari perangkat.
  const barisNilai = PARAMS.map((p) => {
    let v: string | null = null;
    if (server?.screening) {
      const s = server.screening;
      const peta: Record<ParamKey, number | null> = {
        tinggi: s.tinggi, berat: s.berat, lingkar_perut: s.lingkarPerut,
        sistolik: s.sistolik, diastolik: s.diastolik, nadi: s.nadi,
        gula: s.gula, kolesterol: s.kolesterol, asam_urat: s.asamUrat,
      };
      v = peta[p.k] == null ? null : dec(peta[p.k]!);
    } else if (lokal) {
      const raw = lokal.nilai[p.k];
      v = raw ? String(raw) : null;
    }
    return { ...p, nilai: v };
  });

  const imtNilai = server?.screening?.imt ?? lokal?.imt?.nilai ?? null;
  const imtPenilaian = imtNilai == null ? null : nilaiImt(imtNilai);

  // Riwayat lintas-event hidup di server: ia menyatukan kunjungan-kunjungan
  // yang di perangkat ini tidak pernah terlihat bersama. Selama peserta belum
  // tersinkron, tab riwayat memang belum punya apa-apa untuk ditampilkan.
  /**
   * Server dulu, cermin sesudahnya.
   *
   * Sebelum ini nilainya HANYA dari `api.participantDetail`, sehingga petugas
   * tanpa sinyal tidak pernah memilikinya — dan tanpa `pelangganId`, layar ini
   * jatuh ke mode baca-saja. Persis pada petugas stasiun kedua yang justru
   * datang untuk mengukur.
   */
  const pelangganId = server?.pelangganId ?? peserta.pelangganId ?? null;

  // Persetujuan dan tindak lanjut adalah catatan administratif — keduanya
  // milik kunjungan, bukan milik orangnya, dan mendorong turun hal yang
  // sebenarnya dicari saat layar ini dibuka.
  const daftarTab = [
    { id: 'diri' as const, label: 'Profil', icon: ICONS.user },
    { id: 'belanja' as const, label: 'Belanja', icon: ICONS.cart },
    { id: 'lain' as const, label: 'Lain-lain', icon: ICONS.gear },
  ];

  return (
    <div className="page">
      <PageHead title={nama} onBack={() => go('eventPeserta')}
        right={
          <>
            {/* Butuh pelangganId, yang hanya ada setelah peserta tersinkron:
                analisis membaca seluruh riwayat lintas kunjungan, dan tanpa itu
                yang tersaji hanya satu kunjungan yang menyamar sebagai tren. */}
            {pelangganId && (
              <Button size="sm" variant="secondary" icon={ICONS.chart}
                onClick={() => onAnalisis({
                  pelangganId, nama, gender, hp,
                  // `usia` di layar ini bisa datang sebagai teks dari server.
                  usia: usia ? Number(usia) : null,
                })}>
                Analisis
              </Button>
            )}
            {peserta.belumSync && <Badge tone="warning">Antre</Badge>}
          </>
        } />

      {/* Identitas dinyatakan sekali saja, di sini. Kartu "Data diri" dulu
          mengulang baris ini kata demi kata — nama, usia, jenis kelamin, dan
          nomor HP yang sama, dua sentimeter di bawahnya. */}
      <div className="identitas-baris">
        <span>
          {usia ? `${usia} th · ` : ''}{gender === 'P' ? 'Perempuan' : 'Laki-laki'}
          {hp ? ` · ${hp}` : ''}
        </span>
        {koordinator && pelangganId && (
          <button className="ikon-btn" aria-label="Ubah data diri"
            onClick={() => setUbahDiri(true)}>
            <Icon d={ICONS.pencil} size={16} />
          </button>
        )}
      </div>

      {ubahDiri && pelangganId && (
        <FormDataDiri pelangganId={pelangganId}
          nama={nama} gender={gender} usia={usia} hp={hp}
          onTutup={() => setUbahDiri(false)}
          onTersimpan={() => { setUbahDiri(false); onUbah(); void muat(); }} />
      )}

      <SegTabs tabs={daftarTab} active={tab} onSelect={setTab} />

      {error && <div className="belum-note">{error}</div>}

      {tab === 'belanja' && !pelangganId && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.refresh} size={26} /></div>
          <b>Riwayat belum tersedia</b>
          <p>
            {peserta.belumSync
              ? 'Peserta ini masih antre dikirim. Setelah tersinkron, seluruh riwayatnya di cabang ini muncul di sini.'
              : 'Riwayat dibaca dari server dan butuh koneksi. Data pengukuran hari ini tetap aman tersimpan di perangkat.'}
          </p>
        </div>
      )}

      {tab === 'diri' && (pelangganId ? (
        <TabPengukuran pelangganId={pelangganId} participantId={peserta.serverId ?? null}
          gender={gender} nama={nama} onUbah={() => { onUbah(); void muat(); }} />
      ) : (
        /* Tanpa riwayat server, hasil kunjungan ini adalah satu-satunya yang
           kita punya — dan justru inilah yang paling dibutuhkan petugas yang
           baru saja mengukurnya. Saat riwayat tersedia, kartu ini tidak
           ditampilkan: setiap angkanya sudah ada di daftar, dengan tanggalnya. */
        <div className="card consumable-card">
          <b>Pengukuran kunjungan ini</b>
          <small>
            {peserta.belumSync
              ? 'Belum tersinkron — riwayat lintas kunjungan muncul setelah terkirim.'
              : 'Riwayat lintas kunjungan butuh koneksi.'}
          </small>
          {barisNilai.map((p) => (
            <div className="consumable-row" key={p.k}>
              <span>{p.label}</span>
              {p.nilai
                ? <span>{p.nilai} {p.unit}</span>
                : <span className="muted">tidak diambil</span>}
            </div>
          ))}
          <div className="consumable-sep" />
          <div className="consumable-total">
            <span>IMT</span>
            {imtNilai == null
              ? <span className="muted">belum bisa dihitung</span>
              : <span>{dec(imtNilai)} — {imtPenilaian!.label}</span>}
          </div>
          {(server?.screening?.measuredAt ?? lokal?.measuredAt) && (
            <small>Diukur {fmtWaktu(server?.screening?.measuredAt ?? lokal?.measuredAt)}</small>
          )}
          {server?.screening?.outOfRange && (
            <div className="belum-note">
              Ada nilai di luar rentang wajar yang dikonfirmasi petugas saat pencatatan.
            </div>
          )}
        </div>
      ))}

      {tab === 'belanja' && pelangganId && (
        <TabBelanja pelangganId={pelangganId} participantId={peserta.serverId ?? null}
          onUbah={() => { onUbah(); void muat(); }} />
      )}

      {tab === 'lain' && (
        <>
      {koordinator && pelangganId && (
        <KartuTerhapus pelangganId={pelangganId}
          onUbah={() => { onUbah(); void muat(); }} />
      )}

      <div className="card consumable-card">
        <b>Persetujuan</b>
        {consent ? (
          <>
            <div className="consumable-row">
              <span>Status</span>
              <span className={consent.granted ? '' : 'belum'}>
                {consent.granted ? 'Setuju' : 'Menolak'}
              </span>
            </div>
            <div className="consumable-row"><span>Versi teks</span><span>{consent.versiTeks}</span></div>
            <div className="consumable-row"><span>Direkam</span><span>{fmtWaktu(consent.ts)}</span></div>
          </>
        ) : <small>Belum ada record persetujuan.</small>}
        <small>
          Persetujuan tidak bisa diubah setelah direkam — itulah yang membuatnya
          bernilai sebagai bukti.
        </small>
      </div>

      <div className="card consumable-card">
        <b>Tindak lanjut</b>
        <div className="consumable-row">
          <span>Status</span><Badge tone={label.tone}>{label.label}</Badge>
        </div>
        {conv?.status === 'membeli' && (
          <>
            <div className="consumable-row"><span>Produk</span><span>{conv.produk}</span></div>
            <div className="consumable-row"><span>Nilai transaksi</span><span>{rp(conv.nilaiTransaksi)}</span></div>
          </>
        )}
        {conv?.updatedAt && <small>Diperbarui {fmtWaktu(conv.updatedAt)}</small>}

        {!koordinator && <small>Perubahan status hanya bisa dilakukan Koordinator.</small>}

        {koordinator && !peserta.serverId && (
          <small>Peserta ini belum tersinkron. Sync dulu sebelum status bisa diubah.</small>
        )}

        {koordinator && peserta.serverId && !beliBuka && (
          <div className="warn-aksi">
            <Button variant="secondary" size="sm" disabled={busy}
              onClick={() => void setStatus('dihubungi')}>Sudah dihubungi</Button>
            <Button size="sm" disabled={busy} onClick={() => setBeliBuka(true)}>Membeli</Button>
            <button className="link-btn sm" disabled={busy}
              onClick={() => void setStatus('batal')}>Tidak jadi</button>
          </div>
        )}

        {koordinator && peserta.serverId && beliBuka && (
          <>
            <Field label="Nilai transaksi" htmlFor="d-nilai">
              <InputRupiah id="d-nilai" value={nilai} onChange={setNilai} placeholder="1.400.000" />
            </Field>
            <Field label="Produk yang dibeli" htmlFor="d-produk">
              <input id="d-produk" className="input" value={produk}
                onChange={(e) => setProduk(e.target.value)} placeholder="cth. Paket herbal sendi" />
            </Field>
            <Button full disabled={busy || !nilai || !produk.trim()} icon={ICONS.check}
              onClick={() => void setStatus('membeli', Number(nilai), produk.trim())}>
              Simpan pembelian
            </Button>
            <button className="link-btn" onClick={() => setBeliBuka(false)}>Batal</button>
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
}

/* ===================== Identitas pelanggan + ubah ===================== */

/**
 * Data diri yang bisa diperbaiki.
 *
 * Sebelumnya tidak ada jalan sama sekali untuk membetulkan nama yang salah
 * ketik atau nomor HP yang tertukar — padahal nomor HP adalah kunci yang
 * menyatukan kunjungan seseorang, jadi satu digit yang keliru memecah
 * riwayatnya menjadi dua orang yang tidak pernah bertemu.
 */
function FormDataDiri({ pelangganId, nama, gender, usia, hp, onTutup, onTersimpan }: {
  pelangganId: string;
  nama: string;
  gender: 'P' | 'L';
  usia: string;
  hp: string;
  onTutup: () => void;
  onTersimpan: () => void;
}) {
  const { say } = useApp();
  const [f, setF] = useState({ nama, gender, usia: usia || '', hp, catatan: '' });
  const [busy, setBusy] = useState(false);

  // Pemeriksaan yang sama dengan form registrasi. Kalau hanya dipasang di
  // sana, layar ini menjadi pintu belakang yang menerima nomor tak berbentuk.
  const salahHp = f.hp ? periksaHp(f.hp) : null;
  const salahUsia = f.usia ? periksaUsia(f.usia) : null;

  async function simpan() {
    if (!f.nama.trim() || !f.hp.trim()) { say('Nama dan nomor HP tidak boleh kosong.'); return; }
    if (salahHp) { say(salahHp); return; }
    if (salahUsia) { say(salahUsia); return; }
    setBusy(true);
    try {
      await api.updatePelanggan(pelangganId, {
        nama: f.nama.trim(),
        gender: f.gender,
        usia: f.usia ? Number(f.usia) : null,
        hp: normalisasiHp(f.hp),
        catatan: f.catatan.trim() || null,
      });
      say('Data diri diperbarui.');
      onTersimpan();
    } catch { say('Gagal menyimpan. Periksa koneksi.'); }
    finally { setBusy(false); }
  }

  return (
    <Sheet title="Ubah data diri" subtitle={nama} onClose={onTutup}>
      <Field label="Nama" htmlFor="i-nama">
        <input id="i-nama" className="input" value={f.nama} maxLength={160}
          onChange={(e) => setF({ ...f, nama: e.target.value })} autoFocus />
      </Field>
      <div className="field">
        <label>Jenis kelamin</label>
        <div className="pill-row">
          <button className={`pill-choice ${f.gender === 'P' ? 'on' : ''}`}
            onClick={() => setF({ ...f, gender: 'P' })}>Perempuan</button>
          <button className={`pill-choice ${f.gender === 'L' ? 'on' : ''}`}
            onClick={() => setF({ ...f, gender: 'L' })}>Laki-laki</button>
        </div>
      </div>
      <div className="dua-kolom">
        <Field label="Usia" htmlFor="i-usia">
          <input id="i-usia" className={`input${salahUsia ? ' salah' : ''}`}
            inputMode="numeric" value={f.usia} aria-invalid={!!salahUsia}
            onChange={(e) => setF({ ...f, usia: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
          {salahUsia && <small className="field-salah">{salahUsia}</small>}
        </Field>
        <Field label="Nomor HP" htmlFor="i-hp">
          <input id="i-hp" className={`input${salahHp ? ' salah' : ''}`}
            inputMode="tel" value={f.hp} maxLength={16} aria-invalid={!!salahHp}
            onChange={(e) => setF({ ...f, hp: e.target.value.replace(/[^\d+]/g, '') })} />
          {salahHp && <small className="field-salah">{salahHp}</small>}
        </Field>
      </div>
      <div className="belum-note">
        Nomor HP adalah kunci yang menyatukan kunjungan orang ini. Mengubahnya
        memengaruhi bagaimana kunjungan berikutnya dikenali.
      </div>
      <Button full icon={ICONS.check} disabled={busy} onClick={() => void simpan()}>
        Simpan perubahan
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}

export { num };
