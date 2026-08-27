import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Field, Icon, ICONS, Rujukan, Sheet } from '../components/ui';
import { api, type PengukuranRow, type TransaksiRow, type JenisTransaksi } from '../lib/api';
import { dec, fmtTanggal, fmtWaktu, num, rp } from '../lib/domain';
import {
  DISCLAIMER, KATEGORI_LABEL, KONTEKS_GULA, UKUR, diLuarWajar, hitungImt, nilaiImt, nilaiUkur,
  type Gender, type JenisUkur, type KategoriUkur, type KonteksGula, type Nada,
} from '../lib/rujukan';
import { useApp } from '../lib/store';

const NADA_TONE: Record<Nada, string> = {
  normal: 'success', perhatian: 'warning', tinggi: 'danger', rendah: 'warning', netral: 'sage',
};

const KATEGORI_URUT: KategoriUkur[] = ['antropometri', 'tensi', 'darah'];
const JENIS_URUT = Object.keys(UKUR) as JenisUkur[];

type Rekan = { id: string; nama: string; role: string };

/** Angka pengukuran datang dari Postgres numeric, yang pg kirim sebagai string. */
const angka = (v: string) => Number(v);

function fmtNilai(jenis: JenisUkur, nilai: number): string {
  return UKUR[jenis].desimal ? dec(nilai) : String(Math.round(nilai));
}

/* ========================= Tab: Hasil Pengukuran ========================= */

export function TabPengukuran({ pelangganId, participantId, gender, onUbah }: {
  pelangganId: string;
  participantId: string | null;
  gender: Gender;
  onUbah?: () => void;
}) {
  const { user, say } = useApp();
  const [rows, setRows] = useState<PengukuranRow[] | null>(null);
  const [rekan, setRekan] = useState<Rekan[]>([]);
  const [buka, setBuka] = useState<Set<JenisUkur>>(new Set());
  const [form, setForm] = useState<{ mode: 'baru' } | { mode: 'ubah'; row: PengukuranRow } | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const bolehHapus = user?.role === 'koordinator' || user?.role === 'admin_pusat';

  const muat = useCallback(async () => {
    setGagal(null);
    try { setRows((await api.pengukuran(pelangganId)).pengukuran); }
    catch { setGagal('Gagal memuat riwayat pengukuran. Periksa koneksi.'); setRows([]); }
  }, [pelangganId]);

  useEffect(() => { void muat(); }, [muat]);
  useEffect(() => {
    void api.rekan().then((r) => setRekan(r.rekan)).catch(() => setRekan([]));
  }, []);

  /**
   * Riwayat dikelompokkan per jenis, terbaru dulu. Gula darah dipisah lagi
   * per konteks: menggabungkan GDP dan GD2PP dalam satu deret akan membuat
   * grafiknya naik-turun tanpa arti, karena keduanya memang tidak sebanding.
   */
  const deret = useMemo(() => {
    const peta = new Map<string, { jenis: JenisUkur; konteks: KonteksGula | null; baris: PengukuranRow[] }>();
    for (const r of rows ?? []) {
      const kunci = r.jenis === 'gula' ? `gula:${r.konteks ?? 'sewaktu'}` : r.jenis;
      if (!peta.has(kunci)) {
        peta.set(kunci, { jenis: r.jenis, konteks: r.jenis === 'gula' ? (r.konteks ?? 'sewaktu') : null, baris: [] });
      }
      peta.get(kunci)!.baris.push(r);
    }
    for (const d of peta.values()) {
      d.baris.sort((a, b) => b.diukurPada.localeCompare(a.diukurPada));
    }
    return peta;
  }, [rows]);

  const terbaru = (jenis: JenisUkur): number | null => {
    for (const d of deret.values()) if (d.jenis === jenis && d.baris[0]) return angka(d.baris[0].nilai);
    return null;
  };

  const imt = hitungImt(terbaru('tinggi'), terbaru('berat'));

  async function hapus(row: PengukuranRow) {
    const l = UKUR[row.jenis].label;
    if (!confirm(`Hapus ${l} ${fmtNilai(row.jenis, angka(row.nilai))} ${UKUR[row.jenis].satuan} yang diukur ${fmtWaktu(row.diukurPada)}?`)) return;
    try {
      await api.deletePengukuran(row.id);
      say('Pengukuran dihapus.');
      await muat(); onUbah?.();
    } catch { say('Gagal menghapus. Periksa koneksi.'); }
  }

  if (rows === null) return <span className="hint">Memuat riwayat…</span>;

  const kunci = [...deret.entries()].sort(
    (a, b) => JENIS_URUT.indexOf(a[1].jenis) - JENIS_URUT.indexOf(b[1].jenis),
  );

  return (
    <>
      {gagal && <div className="belum-note">{gagal}</div>}

      <Button size="lg" full icon={ICONS.plus} onClick={() => setForm({ mode: 'baru' })}>
        Catat pengukuran
      </Button>

      {rows.length === 0 && (
        <div className="card empty-card">
          <div className="ic"><Icon d={ICONS.pulse} size={26} /></div>
          <b>Belum ada pengukuran</b>
          <p>Setiap hasil yang dicatat di sini tersimpan dengan waktu dan petugasnya.</p>
        </div>
      )}

      {imt != null && (
        <div className="card ukur-card">
          <div className="ukur-atas">
            <span className="ukur-label">Indeks Massa Tubuh</span>
            <Badge tone={NADA_TONE[nilaiImt(imt).nada]}>{nilaiImt(imt).label}</Badge>
          </div>
          <div className="ukur-nilai"><b>{dec(imt)}</b><span>kg/m²</span></div>
          <small>Dihitung dari tinggi dan berat terbaru.</small>
          <Rujukan sumber={nilaiImt(imt).sumber} />
        </div>
      )}

      {KATEGORI_URUT.map((kat) => {
        const isi = kunci.filter(([, d]) => UKUR[d.jenis].kategori === kat);
        if (isi.length === 0) return null;
        return (
          <div key={kat}>
            <span className="section-title">{KATEGORI_LABEL[kat]}</span>
            {isi.map(([k, d]) => (
              <KartuUkur key={k} deret={d} gender={gender}
                pasangan={d.jenis === 'sistolik' ? terbaru('diastolik')
                  : d.jenis === 'diastolik' ? terbaru('sistolik') : null}
                terbuka={buka.has(d.jenis) || d.jenis === 'gula'}
                onToggle={() => setBuka((s) => {
                  const n = new Set(s); n.has(d.jenis) ? n.delete(d.jenis) : n.add(d.jenis); return n;
                })}
                bolehHapus={bolehHapus}
                onUbah={(row) => setForm({ mode: 'ubah', row })}
                onHapus={(row) => void hapus(row)} />
            ))}
          </div>
        );
      })}

      {rows.length > 0 && (
        <Rujukan>
          <span>{DISCLAIMER}</span>
        </Rujukan>
      )}

      {form && (
        <FormPengukuran
          awal={form.mode === 'ubah' ? form.row : null}
          rekan={rekan}
          userId={user?.id ?? null}
          onTutup={() => setForm(null)}
          onSimpan={async (nilaiBaru) => {
            try {
              if (form.mode === 'ubah') {
                await api.updatePengukuran(form.row.id, nilaiBaru);
                say('Pengukuran diperbarui.');
              } else {
                await api.createPengukuran({ ...nilaiBaru, pelangganId, participantId } as never);
                say('Pengukuran tercatat.');
              }
              setForm(null);
              await muat(); onUbah?.();
            } catch { say('Gagal menyimpan. Periksa koneksi.'); }
          }} />
      )}
    </>
  );
}

function KartuUkur({ deret, gender, pasangan, terbuka, onToggle, bolehHapus, onUbah, onHapus }: {
  deret: { jenis: JenisUkur; konteks: KonteksGula | null; baris: PengukuranRow[] };
  gender: Gender;
  pasangan: number | null;
  terbuka: boolean;
  onToggle: () => void;
  bolehHapus: boolean;
  onUbah: (r: PengukuranRow) => void;
  onHapus: (r: PengukuranRow) => void;
}) {
  const { jenis, konteks, baris } = deret;
  const meta = UKUR[jenis];
  const kini = baris[0]!;
  const nilai = angka(kini.nilai);
  const sebelum = baris[1] ? angka(baris[1].nilai) : null;
  const penilaian = nilaiUkur(jenis, nilai, { gender, konteks, pasangan });

  const kodeGula = konteks ? KONTEKS_GULA.find((k) => k.k === konteks) : null;
  const judul = kodeGula ? `${meta.label} — ${kodeGula.label}` : meta.label;

  // Selisih hanya bermakna kalau ada pembanding di konteks yang sama.
  const selisih = sebelum == null ? null : Math.round((nilai - sebelum) * 10) / 10;

  return (
    <div className="card ukur-card">
      <div className="ukur-atas">
        <span className="ukur-label">
          {judul}
          {kodeGula && <span className="ukur-kode">{kodeGula.kode}</span>}
        </span>
        {penilaian && <Badge tone={NADA_TONE[penilaian.nada]}>{penilaian.label}</Badge>}
      </div>

      <div className="ukur-nilai">
        <b>{fmtNilai(jenis, nilai)}</b>
        <span>{meta.satuan}</span>
        {selisih != null && selisih !== 0 && (
          <span className={`ukur-tren ${selisih > 0 ? 'naik' : 'turun'}`}>
            <Icon d={selisih > 0 ? ICONS.naik : ICONS.turun} size={14} sw={2.2} />
            {selisih > 0 ? '+' : '−'}{fmtNilai(jenis, Math.abs(selisih))}
          </span>
        )}
        {kini.outOfRange && <Badge tone="danger">Di luar rentang wajar</Badge>}
      </div>

      <small>
        {fmtWaktu(kini.diukurPada)}
        {kini.diukurOlehNama ? ` · oleh ${kini.diukurOlehNama}` : ''}
        {kini.eventNama ? ` · ${kini.eventNama}` : ''}
      </small>

      {baris.length > 1 && (
        <button className="link-btn sm" onClick={onToggle}>
          {terbuka ? 'Sembunyikan riwayat' : `Lihat ${baris.length - 1} pengukuran sebelumnya`}
        </button>
      )}

      {(terbuka || baris.length === 1) && (
        <div className="riwayat-list">
          {baris.map((r) => (
            <div className="riwayat-baris" key={r.id}>
              <div className="riwayat-isi">
                <b>{fmtNilai(jenis, angka(r.nilai))} {meta.satuan}</b>
                <span>
                  {fmtWaktu(r.diukurPada)}
                  {r.diukurOlehNama ? ` · ${r.diukurOlehNama}` : ''}
                </span>
                {r.catatan && <em>{r.catatan}</em>}
              </div>
              <div className="riwayat-aksi">
                <button className="ikon-btn" aria-label="Ubah" onClick={() => onUbah(r)}>
                  <Icon d={ICONS.pencil} size={16} />
                </button>
                {bolehHapus && (
                  <button className="ikon-btn bahaya" aria-label="Hapus" onClick={() => onHapus(r)}>
                    <Icon d={ICONS.trash} size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {penilaian && <Rujukan sumber={penilaian.sumber} />}
    </div>
  );
}

/** Waktu lokal dalam format yang diterima <input type="datetime-local">. */
function untukInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function FormPengukuran({ awal, rekan, userId, onTutup, onSimpan }: {
  awal: PengukuranRow | null;
  rekan: Rekan[];
  userId: string | null;
  onTutup: () => void;
  onSimpan: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [jenis, setJenis] = useState<JenisUkur>(awal?.jenis ?? 'tinggi');
  const [konteks, setKonteks] = useState<KonteksGula>(awal?.konteks ?? 'sewaktu');
  const [nilai, setNilai] = useState(awal ? fmtNilai(awal.jenis, angka(awal.nilai)) : '');
  const [kapan, setKapan] = useState(untukInput(awal?.diukurPada));
  const [oleh, setOleh] = useState(awal?.diukurOleh ?? userId ?? '');
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
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
    <Sheet title={awal ? 'Ubah pengukuran' : 'Catat pengukuran'}
      subtitle={awal ? UKUR[awal.jenis].label : 'Satu parameter per catatan'}
      onClose={onTutup}>

      {!awal && (
        <Field label="Parameter" htmlFor="f-jenis">
          <select id="f-jenis" className="input" value={jenis}
            onChange={(e) => { setJenis(e.target.value as JenisUkur); setKonfirmasi(false); }}>
            {KATEGORI_URUT.map((kat) => (
              <optgroup key={kat} label={KATEGORI_LABEL[kat]}>
                {JENIS_URUT.filter((j) => UKUR[j].kategori === kat).map((j) => (
                  <option key={j} value={j}>{UKUR[j].label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}

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
        {awal ? 'Simpan perubahan' : 'Simpan pengukuran'}
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
    if (!confirm(`Hapus "${row.nama}" senilai ${rp(Number(row.total))}?`)) return;
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

      {rows.length === 0 ? (
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
              <div className="riwayat-aksi">
                <button className="ikon-btn" aria-label="Ubah" onClick={() => setForm({ mode: 'ubah', row: t })}>
                  <Icon d={ICONS.pencil} size={16} />
                </button>
                {bolehHapus && (
                  <button className="ikon-btn bahaya" aria-label="Hapus" onClick={() => void hapus(t)}>
                    <Icon d={ICONS.trash} size={16} />
                  </button>
                )}
              </div>
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
  const [busy, setBusy] = useState(false);

  const j = Number(jumlah) || 0;
  const h = Number(harga) || 0;
  const siap = nama.trim() !== '' && j > 0 && harga !== '';

  return (
    <Sheet title={awal ? 'Ubah catatan belanja' : 'Catat pembelian'}
      subtitle="Produk atau terapi yang diambil pelanggan" onClose={onTutup}>

      <Field label="Jenis" htmlFor="t-jenis">
        <select id="t-jenis" className="input" value={jenis}
          onChange={(e) => setJenis(e.target.value as JenisTransaksi)}>
          {JENIS_TRX.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
        </select>
      </Field>

      <Field label="Nama produk atau terapi" htmlFor="t-nama">
        <input id="t-nama" className="input" value={nama} maxLength={120}
          onChange={(e) => setNama(e.target.value)} placeholder="cth. Paket herbal sendi" autoFocus />
      </Field>

      <div className="dua-kolom">
        <Field label="Jumlah" htmlFor="t-jumlah">
          <input id="t-jumlah" className="input" inputMode="numeric" value={jumlah}
            onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Harga satuan" htmlFor="t-harga">
          <input id="t-harga" className="input" inputMode="numeric" value={harga}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))} placeholder="cth. 350000" />
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
          }).finally(() => setBusy(false));
        }}>
        {awal ? 'Simpan perubahan' : 'Simpan pembelian'}
      </Button>
      <button className="link-btn" onClick={onTutup}>Batal</button>
    </Sheet>
  );
}
