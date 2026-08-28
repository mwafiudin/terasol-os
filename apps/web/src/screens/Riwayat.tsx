import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, InputRupiah, Rujukan, Sheet } from '../components/ui';
import {
  api,
  type DaftarTerhapus, type JenisTransaksi, type KatalogRow,
  type PengukuranRow, type TransaksiRow,
} from '../lib/api';
import { antreUkur, bacaAntreUkur } from '../lib/db';
import { angka, bangunDeret, fmtNilai, type Deret } from '../lib/deret';
import { dec, fmtTanggal, fmtWaktu, fmtWaktuSingkat, num, rp } from '../lib/domain';
import {
  DISCLAIMER, KATEGORI_LABEL, KONTEKS_GULA, UKUR, diLuarWajar, hitungImt, nilaiImt,
  type Gender, type JenisUkur, type KategoriUkur, type KonteksGula,
} from '../lib/rujukan';
import { useApp } from '../lib/store';
import { isOnline, refreshPending } from '../lib/sync';
import { PapanUkur, PilihGrup, type Grup } from './PapanUkur';

const KATEGORI_URUT: KategoriUkur[] = ['antropometri', 'tensi', 'darah'];

type Rekan = { id: string; nama: string; role: string };

/* ========================= Tab: Hasil Pengukuran ========================= */

export function TabPengukuran({ pelangganId, participantId, gender, nama, onUbah }: {
  pelangganId: string;
  participantId: string | null;
  gender: Gender;
  /** Nama pelanggan, ditampilkan di kepala papan ukur. */
  nama: string;
  onUbah?: () => void;
}) {
  const { user, say, key } = useApp();
  const [rows, setRows] = useState<PengukuranRow[] | null>(null);
  const [rekan, setRekan] = useState<Rekan[]>([]);
  // Berisi kunci deret, bukan jenis: gula darah punya satu baris per konteks.
  const [buka, setBuka] = useState<Set<string>>(new Set());
  // Mencatat berjalan dua tahap: pilih kelompok alat, lalu papan angka.
  // Mengubah satu nilai tetap lewat form biasa — di sana yang dibutuhkan bukan
  // kecepatan mengetik, melainkan melihat konteks lengkap satu rekaman.
  const [catat, setCatat] = useState<{ tahap: 'grup' } | { tahap: 'papan'; grup: Grup; konteks: KonteksGula } | null>(null);
  const [form, setForm] = useState<{ mode: 'ubah'; row: PengukuranRow } | null>(null);
  // Konfirmasi hapus dibuat di dalam aplikasi, bukan lewat `confirm()` bawaan
  // browser: dialog itu tampak asing di PWA terpasang, dan sebagian browser
  // meredamnya diam-diam — penghapusan yang tampak tidak terjadi apa-apa.
  const [konfirmHapus, setKonfirmHapus] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const bolehHapus = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  /**
   * Riwayat server DITAMBAH antrean lokal.
   *
   * Tanpa penggabungan ini, pengukuran yang dicatat saat offline tidak muncul
   * di mana pun sampai sinyal kembali — petugas menyangka simpanannya gagal
   * dan mengukur ulang, memakai strip kedua untuk angka yang sudah ada.
   */
  const muat = useCallback(async () => {
    setGagal(null);
    const antre = (await bacaAntreUkur(key, pelangganId))
      .filter((u) => u.synced === 0 && u.secret)
      .map<PengukuranRow>((u) => ({
        id: u.clientId,
        jenis: u.jenis as JenisUkur,
        konteks: (u.secret!.konteks as KonteksGula | null) ?? null,
        nilai: String(u.secret!.nilai),
        outOfRange: u.secret!.outOfRange,
        catatan: u.secret!.catatan,
        diukurPada: u.diukurPada,
        participantId: u.participantId,
        diukurOleh: null,
        diukurOlehNama: null,
        eventNama: null,
        antre: true,
      }));
    try {
      setRows([...(await api.pengukuran(pelangganId)).pengukuran, ...antre]);
    } catch {
      // Offline: antrean lokal adalah satu-satunya yang kita punya, dan itu
      // bukan kegagalan — hanya riwayat servernya yang belum terjangkau.
      if (antre.length) setRows(antre);
      else { setGagal('Gagal memuat riwayat pengukuran. Periksa koneksi.'); setRows([]); }
    }
  }, [pelangganId, key]);

  useEffect(() => { void muat(); }, [muat]);
  useEffect(() => {
    void api.rekan().then((r) => setRekan(r.rekan)).catch(() => setRekan([]));
  }, []);

  const deret = useMemo(
    () => bangunDeret(rows ?? [], gender, participantId),
    [rows, gender, participantId],
  );

  const terbaru = (jenis: JenisUkur): number | null => {
    const d = deret.find((x) => x.jenis === jenis);
    return d?.titik[0]?.nilai ?? null;
  };

  const imt = hitungImt(terbaru('tinggi'), terbaru('berat'));

  async function hapus(row: PengukuranRow) {
    setKonfirmHapus(null);
    try {
      await api.deletePengukuran(row.id);
      say('Pengukuran dihapus.');
      await muat(); onUbah?.();
    } catch { say('Gagal menghapus. Periksa koneksi.'); }
  }

  if (rows === null) return <span className="hint">Memuat riwayat…</span>;

  const imtNilai = imt == null ? null : nilaiImt(imt);
  const tinggi = terbaru('tinggi');
  const berat = terbaru('berat');
  // Waktu baru menjadi informasi begitu ada angka dari kunjungan lain.
  const campuran = deret.some((d) => d.titik.some((t) => !t.kunjunganIni));

  return (
    <>
      {gagal && <div className="belum-note">{gagal}</div>}

      {/* Keadaan kosong hanya sah bila pemuatannya berhasil. "Gagal memuat"
          berdampingan dengan "belum ada" mengatakan dua hal yang bertentangan,
          dan yang kedua adalah dugaan yang tidak kita ketahui. */}
      {rows.length === 0 && !gagal ? (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.pulse} size={26} /></div>
          <b>Belum ada pengukuran</b>
          <p>Setiap hasil yang dicatat di sini tersimpan dengan waktu dan petugasnya.</p>
          <Button size="sm" icon={ICONS.plus} onClick={() => setCatat({ tahap: 'grup' })}>
            Catat pengukuran
          </Button>
        </div>
      ) : (
        <Button size="lg" full icon={ICONS.plus} onClick={() => setCatat({ tahap: 'grup' })}>
          Catat pengukuran
        </Button>
      )}

      {/* IMT adalah satu-satunya angka turunan di layar ini — bukan hasil
          pengukuran, melainkan kesimpulan dari dua di antaranya. Permukaannya
          dibedakan supaya perannya terbaca tanpa perlu dijelaskan. */}
      {imtNilai && (
        <div className="imt-kartu">
          <div className="imt-atas">
            <span className="imt-judul">Indeks Massa Tubuh</span>
            <span className={`vonis vonis-${imtNilai.nada}`}>{imtNilai.singkat}</span>
          </div>
          <p className="imt-nilai"><b>{dec(imt!)}</b><span>kg/m²</span></p>
          <p className="imt-asal">
            dari {tinggi != null ? `${fmtNilai('tinggi', tinggi)} cm` : 'tinggi'}
            {' · '}{berat != null ? `${fmtNilai('berat', berat)} kg` : 'berat'} terbaru
          </p>
          <p className="imt-sumber">{imtNilai.sumber}</p>
        </div>
      )}

      {KATEGORI_URUT.map((kat) => {
        const isi = deret.filter((d) => UKUR[d.jenis].kategori === kat);
        if (isi.length === 0) return null;
        return (
          <section className="ukur-grup" key={kat}>
            <h3 className="ukur-grup-judul">{KATEGORI_LABEL[kat]}</h3>
            {/* Satu kartu per kategori, bukan per angka. Enam kartu setinggi
                layar dengan bobot identik membuat tidak ada yang menonjol. */}
            <div className="card ukur-daftar">
              {isi.map((d) => (
                <BarisUkur key={d.kunci} deret={d} campuran={campuran}
                  terbuka={buka.has(d.kunci)}
                  onToggle={() => setBuka((s) => {
                    const n = new Set(s);
                    if (n.has(d.kunci)) n.delete(d.kunci); else n.add(d.kunci);
                    return n;
                  })}
                  bolehHapus={bolehHapus}
                  konfirmHapus={konfirmHapus}
                  onUbah={(row) => setForm({ mode: 'ubah', row })}
                  onMintaHapus={setKonfirmHapus}
                  onHapus={(row) => void hapus(row)} />
              ))}
            </div>
          </section>
        );
      })}

      {rows.length > 0 && (
        <Rujukan>
          <span>{DISCLAIMER}</span>
        </Rujukan>
      )}

      {catat?.tahap === 'grup' && (
        <Sheet title="Catat pengukuran" subtitle={nama}
          onClose={() => setCatat(null)}>
          <PilihGrup
            onBatal={() => setCatat(null)}
            onPilih={(g, konteks) => setCatat({ tahap: 'papan', grup: g, konteks })} />
        </Sheet>
      )}

      {catat?.tahap === 'papan' && (
        <PapanUkur
          judul={nama}
          slot={catat.grup.slot}
          label={catat.grup.label}
          konteksGula={catat.konteks}
          tinggiAcuan={terbaru('tinggi')}
          beratAcuan={terbaru('berat')}
          onBatal={() => setCatat(null)}
          onSimpan={async (isi) => {
            // Satu waktu ukur untuk seluruh kelompok: ketiganya memang
            // diambil dalam satu sesi, dan waktu yang identik itulah yang
            // nanti memasangkan sistolik dengan diastoliknya.
            const diukurPada = new Date().toISOString();

            /**
             * Tanpa jaringan, pengukuran masuk antrean terenkripsi dan dikirim
             * sendiri saat sinyal kembali. Sebelum ini menekan Simpan di luar
             * jangkauan hanya memunculkan "Gagal menyimpan" dan angkanya hilang
             * — di aplikasi yang dibangun justru untuk bekerja tanpa jaringan,
             * dan pada alat yang stripnya sudah terpakai.
             */
            if (!isOnline() || !key) {
              if (!key) { say('Buka kunci dengan PIN dulu supaya data bisa dienkripsi.'); return; }
              for (const x of isi) {
                await antreUkur(key, {
                  clientId: crypto.randomUUID(),
                  pelangganId, participantId,
                  jenis: x.slot.jenis,
                  diukurPada,
                }, {
                  nilai: x.nilai,
                  konteks: x.slot.konteks,
                  outOfRange: x.outOfRange,
                  catatan: null,
                });
              }
              await refreshPending();
              say(`${isi.length} pengukuran masuk antrean — terkirim saat ada sinyal.`);
              setCatat(null);
              await muat(); onUbah?.();
              return;
            }

            try {
              for (const x of isi) {
                await api.createPengukuran({
                  pelangganId, participantId,
                  clientId: crypto.randomUUID(),
                  jenis: x.slot.jenis,
                  konteks: x.slot.konteks,
                  nilai: x.nilai,
                  diukurPada,
                  outOfRange: x.outOfRange,
                });
              }
              say(`${isi.length} pengukuran tercatat.`);
              setCatat(null);
              await muat(); onUbah?.();
            } catch {
              // Jaringan sempat ada saat tombol ditekan lalu putus di tengah.
              // Angkanya tetap tidak boleh hilang.
              if (key) {
                for (const x of isi) {
                  await antreUkur(key, {
                    clientId: crypto.randomUUID(),
                    pelangganId, participantId,
                    jenis: x.slot.jenis, diukurPada,
                  }, {
                    nilai: x.nilai, konteks: x.slot.konteks,
                    outOfRange: x.outOfRange, catatan: null,
                  });
                }
                await refreshPending();
                say('Koneksi terputus — pengukuran masuk antrean dan akan dikirim ulang.');
                setCatat(null);
                await muat(); onUbah?.();
              } else {
                say('Gagal menyimpan. Periksa koneksi.');
              }
            }
          }} />
      )}

      {form && (
        <FormPengukuran
          awal={form.row}
          rekan={rekan}
          userId={user?.id ?? null}
          onTutup={() => setForm(null)}
          onSimpan={async (nilaiBaru) => {
            try {
              await api.updatePengukuran(form.row.id, nilaiBaru);
              say('Pengukuran diperbarui.');
              setForm(null);
              await muat(); onUbah?.();
            } catch { say('Gagal menyimpan. Periksa koneksi.'); }
          }} />
      )}
    </>
  );
}

/* ------------------------------ satu baris ------------------------------ */

function BarisUkur({
  deret, campuran, terbuka, onToggle, bolehHapus, konfirmHapus, onUbah, onMintaHapus, onHapus,
}: {
  deret: Deret;
  /** Ada angka dari kunjungan lain, sehingga waktu menjadi pembeda. */
  campuran: boolean;
  terbuka: boolean;
  onToggle: () => void;
  bolehHapus: boolean;
  konfirmHapus: string | null;
  onUbah: (r: PengukuranRow) => void;
  onMintaHapus: (id: string | null) => void;
  onHapus: (r: PengukuranRow) => void;
}) {
  const kini = deret.titik[0]!;
  const sebelum = deret.titik[1];

  // Selisih hanya dihitung untuk deret bernilai tunggal, dan sengaja tidak
  // diberi warna baik/buruk: berat badan turun bisa berarti dua hal yang
  // sangat berbeda, dan menghakiminya sudah menjadi interpretasi.
  const selisih = kini.nilai != null && sebelum?.nilai != null
    ? Math.round((kini.nilai - sebelum.nilai) * 10) / 10
    : null;

  return (
    <div className={`ukur-item ${terbuka ? 'buka' : ''}`}>
      <button className="ukur-item-head" onClick={onToggle} aria-expanded={terbuka}>
        <span className="ukur-item-utama">
          <span className="ukur-item-nama">
            {deret.nama}
            {deret.kode && <span className="ukur-kode">{deret.kode}</span>}
          </span>
          <span className="ukur-item-meta">
            {kini.penilaian && (
              <span className={`vonis vonis-${kini.penilaian.nada}`}>{kini.penilaian.singkat}</span>
            )}
            {/* Penanda kewajaran pengetikan TIDAK ditampilkan berdampingan
                dengan penilaian rujukan.
                Keduanya menjawab pertanyaan yang berbeda — yang satu "apakah
                angkanya masuk akal untuk diketik", yang lain "apa artinya
                dibanding rentang rujukan" — dan menaruhnya sebagai dua chip
                sederajat membuat satu angka seolah punya dua vonis yang
                bertentangan: "Dalam rujukan" tepat di sebelah "Di luar rentang
                wajar". Keterangannya pindah ke dalam baris yang dibuka. */}
            {/* Waktu hanya ditulis kalau ia membedakan sesuatu. Bila seluruh
                angka berasal dari kunjungan yang sedang dibuka, baik tanggal
                maupun tanda "Kunjungan ini" mengatakan hal yang sudah jelas
                dari konteks layar — empat kali berturut-turut. */}
            {campuran && (
              <span>{kini.kunjunganIni ? 'Kunjungan ini' : fmtWaktuSingkat(kini.waktu)}</span>
            )}
          </span>
        </span>

        <span className="ukur-item-nilai">
          <b>{kini.tampil}</b>
          <span>{deret.satuan}</span>
          {selisih != null && selisih !== 0 && (
            <span className="ukur-tren">
              <Icon d={selisih > 0 ? ICONS.naik : ICONS.turun} size={12} sw={2.4} />
              {selisih > 0 ? '+' : '−'}{fmtNilai(deret.jenis, Math.abs(selisih))}
            </span>
          )}
        </span>

        <span className="ukur-item-chev"><Icon d={ICONS.chevR} size={18} /></span>
      </button>

      {terbuka && (
        <div className="ukur-item-detail">
          {deret.keterangan && <p className="ukur-keterangan">{deret.keterangan}</p>}
          {kini.penilaian && (
            <p className="ukur-rujukan">
              <b>{kini.penilaian.label}</b>
              <span>{kini.penilaian.sumber}</span>
            </p>
          )}

          <div className="riwayat-list">
            {deret.titik.map((t) => {
              // Selama masih di antrean, baris ini belum punya id server —
              // mengubah atau menghapusnya akan menyasar id yang tidak ada.
              const antre = t.rekaman.every((r) => r.antre);
              return (
              <div className="riwayat-baris" key={t.waktu}>
                <div className="riwayat-isi">
                  <b>{t.tampil} {deret.satuan}</b>
                  <span>
                    {fmtWaktu(t.waktu)}
                    {t.oleh ? ` · ${t.oleh}` : ''}
                    {t.event ? ` · ${t.event}` : ''}
                  </span>
                  {antre && <em className="riwayat-antre">Menunggu terkirim</em>}
                  {/* Provenans, bukan penilaian: petugas sempat diminta
                      mengonfirmasi angka ini saat mengetiknya. */}
                  {t.outOfRange && (
                    <em className="riwayat-wajar">Dikonfirmasi petugas saat dicatat</em>
                  )}
                  {t.catatan && <em>{t.catatan}</em>}
                </div>
                <div className="riwayat-aksi">
                  {/* Tensi ditopang dua rekaman, jadi tombolnya diberi nama
                      angka mana yang akan diubah — tanpa itu petugas menebak. */}
                  {!antre && t.rekaman.map((r) => (
                    <button key={r.id} className="ikon-btn"
                      aria-label={t.rekaman.length > 1 ? `Ubah ${UKUR[r.jenis].label}` : 'Ubah'}
                      title={t.rekaman.length > 1 ? UKUR[r.jenis].singkat : 'Ubah'}
                      onClick={() => onUbah(r)}>
                      {t.rekaman.length > 1
                        ? <span className="ikon-teks">{UKUR[r.jenis].singkat}</span>
                        : <Icon d={ICONS.pencil} size={16} />}
                    </button>
                  ))}
                  {!antre && bolehHapus && konfirmHapus !== t.waktu && (
                    <button className="ikon-btn bahaya" aria-label="Hapus"
                      onClick={() => onMintaHapus(t.waktu)}>
                      <Icon d={ICONS.trash} size={16} />
                    </button>
                  )}
                </div>
                {konfirmHapus === t.waktu && (
                  <div className="hapus-konfirm">
                    <span>Hapus pembacaan {t.tampil} {deret.satuan} ini?</span>
                    <button className="link-btn sm bahaya"
                      onClick={() => t.rekaman.forEach((r) => onHapus(r))}>Ya, hapus</button>
                    <button className="link-btn sm" onClick={() => onMintaHapus(null)}>Batal</button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Waktu lokal dalam format yang diterima <input type="datetime-local">. */
function untukInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/**
 * Mengubah satu rekaman yang sudah ada.
 *
 * Pencatatan baru tidak lewat sini — itu memakai papan angka, yang cocok untuk
 * mengetik cepat sambil berdiri. Yang dibutuhkan saat membetulkan satu angka
 * justru sebaliknya: melihat waktu, petugas, dan catatannya sekaligus.
 */
function FormPengukuran({ awal, rekan, userId, onTutup, onSimpan }: {
  awal: PengukuranRow;
  rekan: Rekan[];
  userId: string | null;
  onTutup: () => void;
  onSimpan: (v: Record<string, unknown>) => Promise<void>;
}) {
  const jenis = awal.jenis;
  const [konteks, setKonteks] = useState<KonteksGula>(awal.konteks ?? 'sewaktu');
  const [nilai, setNilai] = useState(fmtNilai(awal.jenis, angka(awal.nilai)));
  const [kapan, setKapan] = useState(untukInput(awal.diukurPada));
  const [oleh, setOleh] = useState(awal.diukurOleh ?? userId ?? '');
  const [catatan, setCatatan] = useState(awal.catatan ?? '');
  const [busy, setBusy] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);

  const meta = UKUR[jenis];
  const n = num(nilai);
  const luar = n != null && diLuarWajar(jenis, n);
  const syaratGula = KONTEKS_GULA.find((k) => k.k === konteks);

  // US-03: nilai di luar rentang wajar tidak ditolak, tapi harus dikonfirmasi
  // sekali. Salah ketik jauh lebih sering daripada angka ekstrem yang asli,
  // dan menolaknya mentah-mentah akan membuang data yang benar.
  const siap = n != null && (!luar || konfirmasi);

  async function simpan() {
    if (!siap) return;
    setBusy(true);
    try {
      await onSimpan({
        jenis, nilai: n,
        konteks: jenis === 'gula' ? konteks : null,
        diukurPada: new Date(kapan).toISOString(),
        diukurOleh: oleh || null,
        outOfRange: luar,
        catatan: catatan.trim() || null,
      });
    } finally { setBusy(false); }
  }

  return (
    <Sheet title="Ubah pengukuran" subtitle={UKUR[awal.jenis].label} onClose={onTutup}>

      {jenis === 'gula' && (
        <Field label="Jenis pemeriksaan gula darah" htmlFor="f-konteks">
          <select id="f-konteks" className="input" value={konteks}
            onChange={(e) => setKonteks(e.target.value as KonteksGula)}>
            {KONTEKS_GULA.map((k) => (
              <option key={k.k} value={k.k}>{k.kode} — {k.label}</option>
            ))}
          </select>
          {syaratGula && <small className="field-bantu">{syaratGula.syarat}</small>}
        </Field>
      )}

      <Field label={`Nilai (${meta.satuan})`} htmlFor="f-nilai">
        <input id="f-nilai" className={`input ${luar ? 'input-warn' : ''}`}
          inputMode={meta.desimal ? 'decimal' : 'numeric'} value={nilai}
          onChange={(e) => { setNilai(e.target.value); setKonfirmasi(false); }}
          placeholder={`${meta.wajar.min}–${meta.wajar.max}`} autoFocus />
      </Field>

      {luar && (
        <div className="warn-note">
          <b>{fmtNilai(jenis, n!)} {meta.satuan} di luar rentang wajar</b>
          <p>Rentang wajar {meta.label.toLowerCase()}: {meta.wajar.min}–{meta.wajar.max} {meta.satuan}. Periksa lagi angkanya sebelum disimpan.</p>
          <label className="cek">
            <input type="checkbox" checked={konfirmasi} onChange={(e) => setKonfirmasi(e.target.checked)} />
            <span>Saya sudah cek, angka ini benar</span>
          </label>
        </div>
      )}

      <Field label="Waktu pengukuran" htmlFor="f-kapan">
        <input id="f-kapan" className="input" type="datetime-local" value={kapan}
          onChange={(e) => setKapan(e.target.value)} />
      </Field>

      <Field label="Diukur oleh" htmlFor="f-oleh">
        <select id="f-oleh" className="input" value={oleh} onChange={(e) => setOleh(e.target.value)}>
          <option value="">— belum ditentukan —</option>
          {rekan.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
        </select>
        <small className="field-bantu">
          Yang benar-benar memegang alat, bukan yang sedang login.
        </small>
      </Field>

      <Field label="Catatan (opsional)" htmlFor="f-catatan">
        <input id="f-catatan" className="input" value={catatan} maxLength={200}
          onChange={(e) => setCatatan(e.target.value)} placeholder="cth. alat kalibrasi ulang" />
      </Field>

      <Button full size="lg" icon={ICONS.check} disabled={!siap || busy} onClick={() => void simpan()}>
        Simpan perubahan
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}

/* ============================ Tab: Belanja ============================ */

const JENIS_TRX: { k: JenisTransaksi; label: string }[] = [
  { k: 'produk', label: 'Produk' },
  { k: 'terapi', label: 'Terapi' },
  { k: 'paket', label: 'Paket' },
];

export function TabBelanja({ pelangganId, participantId, onUbah }: {
  pelangganId: string; participantId: string | null; onUbah?: () => void;
}) {
  const { user, say } = useApp();
  const [rows, setRows] = useState<TransaksiRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<{ mode: 'baru' } | { mode: 'ubah'; row: TransaksiRow } | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const bolehHapus = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  const muat = useCallback(async () => {
    setGagal(null);
    try {
      const r = await api.transaksi(pelangganId);
      setRows(r.transaksi); setTotal(r.total);
    } catch { setGagal('Gagal memuat riwayat belanja. Periksa koneksi.'); setRows([]); }
  }, [pelangganId]);

  useEffect(() => { void muat(); }, [muat]);

  async function hapus(row: TransaksiRow) {
    setKonfirmHapus(null);
    try {
      await api.deleteTransaksi(row.id);
      say('Catatan belanja dihapus.');
      await muat(); onUbah?.();
    } catch { say('Gagal menghapus. Periksa koneksi.'); }
  }

  if (rows === null) return <span className="hint">Memuat riwayat belanja…</span>;

  return (
    <>
      {gagal && <div className="belum-note">{gagal}</div>}

      <Button size="lg" full icon={ICONS.plus} onClick={() => setForm({ mode: 'baru' })}>
        Catat pembelian
      </Button>

      {rows.length === 0 && !gagal ? (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.cart} size={26} /></div>
          <b>Belum ada pembelian</b>
          <p>Produk dan terapi yang diambil di cabang ini akan terkumpul di sini.</p>
        </div>
      ) : (
        <>
          <div className="card consumable-card">
            <div className="consumable-total">
              <span>Total belanja di cabang ini</span>
              <span>{rp(total)}</span>
            </div>
            <small>{rows.length} catatan.</small>
          </div>

          {rows.map((t) => (
            <div className="card trx-card" key={t.id}>
              <div className="trx-atas">
                <span className="trx-nama">{t.nama}</span>
                <Badge tone={t.jenis === 'terapi' ? 'brand' : t.jenis === 'paket' ? 'success' : 'sage'}>
                  {JENIS_TRX.find((j) => j.k === t.jenis)?.label ?? t.jenis}
                </Badge>
              </div>
              <div className="trx-nilai">
                <b>{rp(Number(t.total))}</b>
                {t.jumlah > 1 && <span>{t.jumlah} × {rp(Number(t.hargaSatuan))}</span>}
              </div>
              <small>
                {fmtTanggal(t.tanggal, { day: 'numeric', month: 'long', year: 'numeric' })}
                {t.dicatatOlehNama ? ` · dicatat ${t.dicatatOlehNama}` : ''}
                {t.eventNama ? ` · ${t.eventNama}` : ''}
              </small>
              {t.catatan && <em className="trx-catatan">{t.catatan}</em>}
              {konfirmHapus === t.id ? (
                <div className="hapus-konfirm">
                  <span>Hapus catatan {rp(Number(t.total))} ini?</span>
                  <button className="link-btn sm bahaya" onClick={() => void hapus(t)}>Ya, hapus</button>
                  <button className="link-btn sm" onClick={() => setKonfirmHapus(null)}>Batal</button>
                </div>
              ) : (
                <div className="riwayat-aksi">
                  <button className="ikon-btn" aria-label="Ubah" onClick={() => setForm({ mode: 'ubah', row: t })}>
                    <Icon d={ICONS.pencil} size={16} />
                  </button>
                  {bolehHapus && (
                    <button className="ikon-btn bahaya" aria-label="Hapus"
                      onClick={() => setKonfirmHapus(t.id)}>
                      <Icon d={ICONS.trash} size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <small className="hint">
        Riwayat ini hanya mencakup cabang tempat Anda bertugas.
      </small>

      {form && (
        <FormTransaksi
          awal={form.mode === 'ubah' ? form.row : null}
          onTutup={() => setForm(null)}
          onSimpan={async (v) => {
            try {
              if (form.mode === 'ubah') {
                await api.updateTransaksi(form.row.id, v);
                say('Catatan belanja diperbarui.');
              } else {
                await api.createTransaksi({ ...v, pelangganId, participantId } as never);
                say('Pembelian tercatat.');
              }
              setForm(null);
              await muat(); onUbah?.();
            } catch { say('Gagal menyimpan. Periksa koneksi.'); }
          }} />
      )}
    </>
  );
}

function FormTransaksi({ awal, onTutup, onSimpan }: {
  awal: TransaksiRow | null;
  onTutup: () => void;
  onSimpan: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [jenis, setJenis] = useState<JenisTransaksi>(awal?.jenis ?? 'produk');
  const [nama, setNama] = useState(awal?.nama ?? '');
  const [jumlah, setJumlah] = useState(String(awal?.jumlah ?? 1));
  const [harga, setHarga] = useState(awal ? String(Number(awal.hargaSatuan)) : '');
  const [tanggal, setTanggal] = useState(awal?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [katalogId, setKatalogId] = useState<string | null>(null);
  const [katalog, setKatalog] = useState<KatalogRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.katalog({ aktif: true }).then((r) => setKatalog(r.katalog)).catch(() => setKatalog([]));
  }, []);

  const pilihan = katalog.filter((k) => k.jenis === jenis);

  /**
   * Memilih dari katalog mengisi nama dan harga, tetapi keduanya tetap bisa
   * diubah sesudahnya: harga katalog adalah acuan, sedangkan yang benar-benar
   * dibayar hari itu bisa berbeda karena diskon atau kesepakatan.
   */
  function pilihKatalog(id: string) {
    const k = katalog.find((x) => x.id === id);
    if (!k) { setKatalogId(null); return; }
    setKatalogId(k.id);
    setNama(k.nama);
    setHarga(String(Number(k.harga)));
  }

  const j = Number(jumlah) || 0;
  const h = Number(harga) || 0;
  // Pada catatan BARU, tanpa pilihan katalog tidak ada yang bisa disimpan;
  // pada catatan lama, namanya sudah melekat dan tidak lagi dipilih.
  const siap = (awal ? nama.trim() !== '' : katalogId !== null) && j > 0 && harga !== '';

  return (
    <Sheet title={awal ? 'Ubah catatan belanja' : 'Catat pembelian'}
      subtitle="Produk atau terapi yang diambil pelanggan" onClose={onTutup}>

      <Field label="Jenis" htmlFor="t-jenis">
        <select id="t-jenis" className="input" value={jenis}
          onChange={(e) => { setJenis(e.target.value as JenisTransaksi); setKatalogId(null); }}>
          {JENIS_TRX.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
        </select>
      </Field>

{/* Dipilih dari katalog, TIDAK diketik.

          Sebelumnya kolom nama bebas diisi, dan setiap ejaan baru melahirkan
          baris katalog baru: "Paket terapi 4 sesi" dan "paket terapi 4sesi"
          menjadi dua barang berbeda yang tidak pernah diputuskan siapa pun.
          Laporan per produk lalu memecah barang yang sama, dan tidak ada cara
          menyatukannya kembali selain menebak.

          Barang yang belum ada di katalog ditambahkan di Master data lebih
          dulu — sekali, dengan sengaja, oleh orang yang memang mengurusnya. */}
      {!awal && (
        <Field label="Produk atau layanan" htmlFor="t-katalog">
          <select id="t-katalog" className="input" value={katalogId ?? ''}
            onChange={(e) => pilihKatalog(e.target.value)} autoFocus>
            <option value="">— pilih dari katalog —</option>
            {pilihan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} · {rp(Number(k.harga))}
                {k.jenis === 'paket' && k.isi.length > 0
                  ? ` (${k.isi.map((x) => `${x.jumlah}× ${x.nama}`).join(' + ')})`
                  : ''}
              </option>
            ))}
          </select>
          {pilihan.length === 0 && (
            <small className="field-bantu">
              Belum ada {JENIS_TRX.find((x) => x.k === jenis)?.label.toLowerCase()} di
              katalog cabang ini. Tambahkan lewat Master data → Produk &amp; layanan,
              atau impor daftar KK di sana.
            </small>
          )}
        </Field>
      )}

      {awal && (
        <Field label="Produk atau layanan" htmlFor="t-nama">
          {/* Transaksi lama tetap menampilkan namanya apa adanya: ia mungkin
              menunjuk barang yang sudah tidak ada di katalog, dan nota yang
              sudah terjadi tidak boleh berubah karena katalognya berubah. */}
          <input id="t-nama" className="input" value={nama} disabled />
        </Field>
      )}

      <div className="dua-kolom">
        <Field label="Jumlah" htmlFor="t-jumlah">
          <input id="t-jumlah" className="input" inputMode="numeric" value={jumlah}
            onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Harga satuan" htmlFor="t-harga">
          <InputRupiah id="t-harga" value={harga} onChange={setHarga} placeholder="350.000" />
        </Field>
      </div>

      {siap && (
        <div className="consumable-total">
          <span>Total</span><span>{rp(j * h)}</span>
        </div>
      )}

      <Field label="Tanggal" htmlFor="t-tgl">
        <input id="t-tgl" className="input" type="date" value={tanggal}
          onChange={(e) => setTanggal(e.target.value)} />
      </Field>

      <Field label="Catatan (opsional)" htmlFor="t-catatan">
        <input id="t-catatan" className="input" value={catatan} maxLength={200}
          onChange={(e) => setCatatan(e.target.value)} placeholder="cth. cicilan pertama" />
      </Field>

      <Button full size="lg" icon={ICONS.check} disabled={!siap || busy}
        onClick={() => {
          setBusy(true);
          void onSimpan({
            jenis, nama: nama.trim(), jumlah: j, hargaSatuan: h,
            tanggal, catatan: catatan.trim() || null,
            // Hanya ikut bila namanya masih sama dengan yang dipilih; begitu
            // diketik ulang jadi barang lain, tautannya berhenti benar.
            katalogId,
          }).finally(() => setBusy(false));
        }}>
        {awal ? 'Simpan perubahan' : 'Simpan pembelian'}
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}

/* ============================ Data terhapus ============================ */

/**
 * Memulihkan pengukuran dan transaksi yang dihapus.
 *
 * Hapus lunak tanpa cara melihat kembali sama saja dengan hapus biasa, hanya
 * lebih boros ruang. Layar inilah yang membuat "bisa dipulihkan" menjadi janji
 * yang bisa ditepati petugas, bukan sekadar sifat basis data.
 *
 * Sengaja tidak muncul selama tidak ada yang terhapus: daftar kosong yang
 * selalu terpampang mengajarkan mata untuk mengabaikannya, dan justru itu yang
 * membuatnya tidak terlihat saat akhirnya berisi.
 */
export function KartuTerhapus({ pelangganId, onUbah }: {
  pelangganId: string;
  onUbah?: () => void;
}) {
  const { say } = useApp();
  const [data, setData] = useState<DaftarTerhapus | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try { setData(await api.terhapus(pelangganId)); }
    catch { setData({ pengukuran: [], transaksi: [] }); }
  }, [pelangganId]);

  useEffect(() => { void muat(); }, [muat]);

  async function pulihkan(jenis: 'ukur' | 'trx', id: string, sebutan: string) {
    setSibuk(id);
    try {
      if (jenis === 'ukur') await api.pulihkanPengukuran(id);
      else await api.pulihkanTransaksi(id);
      say(`${sebutan} dipulihkan.`);
      await muat(); onUbah?.();
    } catch { say('Gagal memulihkan. Periksa koneksi.'); }
    finally { setSibuk(null); }
  }

  if (!data) return null;
  const jumlah = data.pengukuran.length + data.transaksi.length;
  if (jumlah === 0) return null;

  return (
    <div className="card consumable-card">
      <div className="kartu-judul">
        <b>Data terhapus</b>
        <Badge tone="sage">{jumlah}</Badge>
      </div>
      <small>
        Masih tersimpan dan tidak ikut terhitung di mana pun. Pulihkan bila
        ternyata bukan ini yang dimaksud.
      </small>

      <div className="terhapus-daftar">
        {data.pengukuran.map((p) => {
          const meta = UKUR[p.jenis];
          const kode = p.konteks ? KONTEKS_GULA.find((k) => k.k === p.konteks)?.kode : null;
          return (
            <div className="terhapus-baris" key={p.id}>
              <div className="terhapus-isi">
                <b>
                  {meta.label}{kode ? ` · ${kode}` : ''} —{' '}
                  {fmtNilai(p.jenis, angka(p.nilai))} {meta.satuan}
                </b>
                <span>Diukur {fmtWaktuSingkat(p.diukurPada)}</span>
                <em>
                  Dihapus {fmtWaktuSingkat(p.dihapusPada)}
                  {p.dihapusOlehNama ? ` oleh ${p.dihapusOlehNama}` : ''}
                </em>
              </div>
              <Button size="sm" variant="secondary" icon={ICONS.refresh}
                disabled={sibuk === p.id}
                onClick={() => void pulihkan('ukur', p.id, meta.label)}>
                Pulihkan
              </Button>
            </div>
          );
        })}

        {data.transaksi.map((t) => (
          <div className="terhapus-baris" key={t.id}>
            <div className="terhapus-isi">
              <b>{t.nama} — {rp(Number(t.total))}</b>
              <span>
                {JENIS_TRX.find((j) => j.k === t.jenis)?.label ?? t.jenis}
                {t.jumlah > 1 ? ` · ${t.jumlah} item` : ''}
                {' · '}{fmtTanggal(t.tanggal, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <em>
                Dihapus {fmtWaktuSingkat(t.dihapusPada)}
                {t.dihapusOlehNama ? ` oleh ${t.dihapusOlehNama}` : ''}
              </em>
            </div>
            <Button size="sm" variant="secondary" icon={ICONS.refresh}
              disabled={sibuk === t.id}
              onClick={() => void pulihkan('trx', t.id, t.nama)}>
              Pulihkan
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
