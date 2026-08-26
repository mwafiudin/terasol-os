/* Terasol OS — MVP kanal event screening.
   Offline-first: setiap tulisan mengenai local store lebih dulu; sync engine
   berjalan di belakang layar (server belum ada — sinkronisasi disimulasikan). */
'use strict';

/* ================================ Store ================================ */

const DB_KEY = 'terasolOS.v1';
const CONSENT_VERSION = 'v1';
const TENANT = { id: 'tn-menteng', nama: 'Cabang Menteng' };
const STRIP_PRICE = { gula: 6000, kol: 12000, asam: 8000 };

const PARAMS = [
  { k: 'tinggi', label: 'Tinggi badan', unit: 'cm', min: 120, max: 210 },
  { k: 'berat', label: 'Berat badan', unit: 'kg', min: 30, max: 180 },
  { k: 'sis', label: 'Tensi — sistolik', unit: 'mmHg', min: 70, max: 250 },
  { k: 'dia', label: 'Tensi — diastolik', unit: 'mmHg', min: 40, max: 150 },
  { k: 'gula', label: 'Gula darah', unit: 'mg/dL', min: 50, max: 500 },
  { k: 'kol', label: 'Kolesterol', unit: 'mg/dL', min: 100, max: 400 },
  { k: 'asam', label: 'Asam urat', unit: 'mg/dL', min: 2, max: 15, dec: true },
];

let db = loadDb() || seedDb();

function loadDb() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)); } catch { return null; }
}
function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/* Seed deterministik supaya first-run tampak seperti kanvas desain. */
function seedDb() {
  let rng = 42;
  const rand = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const NAMES_P = ['Ibu Sari', 'Ibu Wati', 'Ibu Endang', 'Ibu Yuni', 'Ibu Lastri', 'Ibu Rohaya', 'Ibu Nurul', 'Ibu Tuti', 'Ibu Maryam', 'Ibu Siti', 'Ibu Aminah', 'Ibu Dewi', 'Ibu Halimah', 'Ibu Kartini', 'Ibu Painem', 'Ibu Sumarni', 'Ibu Warsih', 'Ibu Jumiati', 'Ibu Ningsih', 'Ibu Rahayu'];
  const NAMES_L = ['Bapak Slamet', 'Bapak Agus', 'Bapak Joko', 'Bapak Bambang', 'Bapak Tono', 'Bapak Udin', 'Bapak Karno', 'Bapak Yanto', 'Bapak Sugeng', 'Bapak Rahmat', 'Bapak Dedi', 'Bapak Wahyu', 'Bapak Herman', 'Bapak Salim', 'Bapak Anwar'];
  const PRODUCTS = ['Paket herbal sendi', 'Madu Terasol', 'Paket terapi 4 sesi', 'Minyak urut Terasol', 'Paket herbal gula'];

  const evPosyandu = {
    id: 'ev-posyandu', tenantId: TENANT.id,
    nama: 'Screening Posyandu Lansia', lokasi: 'Menteng',
    tanggal: '2026-08-26', tipe: 'gratis', harga: 0,
    petugas: '2 petugas cabang', status: 'active', synced: true, ts: Date.now(),
  };
  const evBazar = {
    id: 'ev-bazar', tenantId: TENANT.id,
    nama: 'Bazar Sehat Kelapa Gading', lokasi: 'Kelapa Gading',
    tanggal: '2026-08-22', tipe: 'berbayar', harga: 35000,
    petugas: '2 petugas cabang', status: 'done', synced: true, ts: Date.now() - 4 * 864e5,
  };

  const participants = [];
  const mkPerson = (eventId, over = {}) => {
    const gender = over.gender || (rand() < 0.6 ? 'P' : 'L');
    const nama = over.nama || pick(gender === 'P' ? NAMES_P : NAMES_L);
    const usia = over.usia || String(50 + Math.floor(rand() * 25));
    const tinggi = String(148 + Math.floor(rand() * 22));
    const berat = String(48 + Math.floor(rand() * 30));
    const vals = {
      tinggi, berat,
      sis: String(110 + Math.floor(rand() * 50)),
      dia: String(70 + Math.floor(rand() * 25)),
      gula: '', kol: '', asam: '',
    };
    return {
      id: uid('ps'), tenantId: TENANT.id, eventId,
      nama, gender, usia,
      hp: over.hp || '08' + String(1200000000 + Math.floor(rand() * 800000000)),
      consent: { granted: true, versi: CONSENT_VERSION, ts: Date.now() - Math.floor(rand() * 864e5) },
      vals, berminat: false, conv: null,
      synced: true, ts: Date.now() - Math.floor(rand() * 864e5),
      ...over.patch,
    };
  };

  // Bazar: 48 peserta — 41 gula, 22 kolesterol, 19 asam urat, 17 berminat, 6 membeli (total Rp 8.400.000).
  const SALE_VALUES = [2100000, 1750000, 1400000, 1400000, 1050000, 700000];
  for (let i = 0; i < 48; i++) {
    const over = i === 0
      ? { nama: 'Bapak Hasan', gender: 'L', usia: '68' }
      : {};
    const p = mkPerson(evBazar.id, over);
    if (i < 41) p.vals.gula = String(85 + Math.floor(rand() * 90));
    if (i < 22) p.vals.kol = String(150 + Math.floor(rand() * 110));
    if (i < 19) p.vals.asam = (4 + rand() * 4).toFixed(1).replace('.', ',');
    if (i < 17) {
      p.berminat = true;
      p.conv = { status: 'baru', nilai: 0, produk: '', updatedAt: p.ts };
      if (i >= 1 && i <= 6) p.conv = { status: 'membeli', nilai: SALE_VALUES[i - 1], produk: pick(PRODUCTS), updatedAt: p.ts };
      // Bapak Hasan (i=0) tampil di tindak lanjut Beranda sebagai "Sudah dihubungi".
      else if (i === 0 || i <= 9) p.conv.status = 'dihubungi';
    }
    participants.push(p);
  }

  // Posyandu (berlangsung): 12 peserta, 5 berminat, 1 tally anonim, 1 konflik dedup.
  const posyandu = [];
  for (let i = 0; i < 12; i++) {
    const over = i === 0
      ? { nama: 'Ibu Ratna', gender: 'P', usia: '62', hp: '081234567890' }
      : {};
    const p = mkPerson(evPosyandu.id, over);
    p.ts = Date.now() - Math.floor(rand() * 4 * 36e5);
    if (i < 8) p.vals.gula = String(85 + Math.floor(rand() * 90));
    if (i < 5) {
      p.berminat = true;
      p.conv = { status: 'baru', nilai: 0, produk: '', updatedAt: p.ts };
    }
    posyandu.push(p);
  }
  participants.push(...posyandu);

  // Konflik sync: dua record Bapak Slamet dengan nomor HP sama (kunci dedup event+hp).
  const dupA = posyandu.find((p) => p.nama === 'Bapak Slamet') || posyandu[3];
  const dupB = { ...dupA, id: uid('ps'), vals: { ...dupA.vals, sis: '142', dia: '88' }, ts: dupA.ts + 6e5, needsReview: true };
  participants.push(dupB);
  const conflicts = [{ id: uid('cf'), eventId: evPosyandu.id, hp: dupA.hp, ids: [dupA.id, dupB.id] }];

  const seeded = {
    v: 1, tenant: TENANT,
    events: [evPosyandu, evBazar],
    participants,
    anon: { [evPosyandu.id]: 1, [evBazar.id]: 2 },
    conflicts,
    draft: null,
  };
  localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  return seeded;
}

/* ============================ Sync engine ============================ */
/* Server belum ada (PRD D1) — engine menandai record synced setelah "kirim"
   berhasil. Antrean dan status persis seperti desain; transportnya stub. */

const sync = {
  simOffline: false,
  syncing: false,
  timer: null,
  get online() { return navigator.onLine && !this.simOffline; },
  get queue() {
    return db.events.filter((e) => !e.synced).length +
      db.participants.filter((p) => !p.synced).length;
  },
  schedule(delay = 1800) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (this.online && this.queue > 0) this.run(); }, delay);
  },
  run() {
    if (!this.online) { toast('Tidak ada koneksi. Data menunggu di antrean sync.'); return; }
    if (this.queue === 0) { toast('Semua data sudah tersinkron.'); return; }
    if (this.syncing) return;
    this.syncing = true;
    render();
    setTimeout(() => {
      db.events.forEach((e) => { e.synced = true; });
      db.participants.forEach((p) => { p.synced = true; });
      saveDb();
      this.syncing = false;
      toast('Sync berhasil. Data sensitif lokal dibersihkan.');
      render();
    }, 1300);
  },
};
window.addEventListener('online', () => { sync.schedule(700); render(); });
window.addEventListener('offline', () => render());

/* ============================== UI state ============================== */

const S = {
  screen: 'home',
  tab: 'home',
  recapEv: null,     // event id yang dibuka di rekap
  dedupWarn: false,
  dedupOk: false,
  active: 'tinggi',  // parameter aktif di layar input hasil
  warn: null,        // parameter yang menunggu konfirmasi ulang (nilai di luar rentang)
  ev: { nama: '', lokasi: '', tanggal: '', tipe: 'gratis', harga: '', petugas: '' },
  sheet: null,       // id peserta di sheet tindak lanjut
  sheetBuy: false,   // form nilai transaksi terbuka
};

function go(screen, patch = {}) {
  Object.assign(S, patch, { screen });
  render();
  document.getElementById('screen').scrollTop = 0;
}

/* Draft peserta — tersimpan ke perangkat setiap perubahan field (US-03). */
function draft() {
  if (!db.draft) {
    db.draft = {
      eventId: activeEvent()?.id || null,
      nama: '', gender: '', usia: '', hp: '',
      vals: { tinggi: '', berat: '', sis: '', dia: '', gula: '', kol: '', asam: '' },
      berminat: false,
    };
    saveDb();
  }
  return db.draft;
}
function setDraft(patch) {
  Object.assign(draft(), patch);
  saveDb();
}

/* ============================== Helpers ============================== */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pct = (n) => (Math.round(n * 1000) / 10).toLocaleString('id-ID') + '%';

function fmtDate(iso, opts) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', opts || { weekday: 'long', day: 'numeric', month: 'long' });
}
function activeEvent() {
  return db.events.find((e) => e.status === 'active') || db.events[0];
}
function eventStats(ev) {
  // Record berstatus needs_review (duplikat sync, §4.3) tidak ikut dihitung
  // sampai Koordinator memilih record yang dipertahankan.
  const recs = db.participants.filter((p) => p.eventId === ev.id && !p.needsReview);
  const anon = db.anon[ev.id] || 0;
  const taken = (k) => recs.filter((p) => p.vals[k] !== '').length;
  const tensi = recs.filter((p) => p.vals.sis !== '' || p.vals.dia !== '').length;
  const buyers = recs.filter((p) => p.conv?.status === 'membeli');
  const sales = buyers.reduce((a, p) => a + (p.conv.nilai || 0), 0);
  return {
    recs, anon,
    n: recs.length,
    minat: recs.filter((p) => p.berminat).length,
    beli: buyers.length,
    sales,
    tensi, gula: taken('gula'), kol: taken('kol'), asam: taken('asam'),
  };
}
function imtOf(vals) {
  const t = num(vals.tinggi), b = num(vals.berat);
  if (!t || !b || t < 50) return null;
  const v = b / Math.pow(t / 100, 2);
  const cat = v < 18.5 ? 'Kurang' : v < 25 ? 'Normal' : v < 30 ? 'Berlebih' : 'Obesitas';
  return v.toFixed(1).replace('.', ',') + ' — ' + cat;
}
const CONV_BADGE = {
  baru: ['warning', 'Belum dihubungi'],
  dihubungi: ['brand', 'Sudah dihubungi'],
  membeli: ['success', 'Membeli'],
  batal: ['sage', 'Tidak jadi'],
};

/* ================================ Icons ================================ */

function icon(paths, size = 20, sw = 1.75) {
  const body = paths.map((d) =>
    Array.isArray(d)
      ? `<circle cx="${d[0]}" cy="${d[1]}" r="${d[2]}"></circle>`
      : `<path d="${d}"></path>`
  ).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
const ICO = {
  chevR: icon(['m9 6 6 6-6 6']),
  back: icon(['m15 18-6-6 6-6'], 24),
  check: icon(['M20 6 9 17l-5-5']),
  checkSm: icon(['M20 6 9 17l-5-5'], 14, 2.2),
  x: icon(['M18 6 6 18', 'M6 6l12 12'], 18),
  arrowR: icon(['M5 12h14', 'm13 6 6 6-6 6']),
  plus: icon(['M12 5v14', 'M5 12h14'], 18),
  download: icon(['M12 3v12', 'm6 11 6 6 6-6', 'M5 21h14'], 18),
  home: icon(['M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3Z'], 18),
  userPlus: icon(['M2 21a8 8 0 0 1 13.3-6.2', [10, 8, 5], 'M19 16v6', 'M22 19h-6']),
  refresh: icon(['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v5h-5'], 15, 2),
  calPlus: icon(['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M12 13.5v5', 'M9.5 16h5'], 19),
  chart: icon(['M3 21h18', 'M7 17V9', 'M12 17V5', 'M17 17v-7'], 19),
  alert: icon(['M12 9v4', 'M12 17h.01', [12, 12, 9]], 19),
  backspace: icon(['M21 5H9l-6 7 6 7h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z', 'm12 9 6 6', 'm18 9-6 6'], 24),
  outlet: icon(['m4 7 2-4h12l2 4', 'M4 7h16v3a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10V7Z', 'M6 13v8h12v-8'], 30),
  van: icon(['M3 17V7h11l4 4h3v6h-2', [7.5, 17.5, 2], [17.5, 17.5, 2], 'M9.5 17.5h6', 'M3 17h2.5'], 30),
};
const TABS = [
  { id: 'home', label: 'Beranda', ico: icon(['M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3Z'], 24) },
  { id: 'events', label: 'Event', ico: icon(['M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'], 24) },
  { id: 'outlet', label: 'Outlet', ico: icon(['m4 7 2-4h12l2 4M4 7h16v3a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10V7ZM6 13v8h12v-8'], 24) },
  { id: 'hs', label: 'Home Service', ico: icon(['M3 17V7h11l4 4h3v6h-2M7.5 15.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9.5 17.5h6M3 17h2.5'], 24) },
];

/* =============================== Screens =============================== */

function vHome() {
  const ev = activeEvent();
  const st = ev ? eventStats(ev) : null;
  const q = sync.queue;
  const dotCls = sync.syncing ? 'sync-dot busy' : q === 0 ? 'sync-dot ok' : 'sync-dot';
  const syncTitle = sync.syncing ? 'Menyinkronkan…' : q === 0 ? 'Semua data tersinkron' : q + ' record belum tersinkron';

  const followUps = db.participants
    .filter((p) => !p.needsReview && p.berminat && p.conv && p.conv.status !== 'membeli' && p.conv.status !== 'batal')
    .sort((a, b) => b.ts - a.ts).slice(0, 3);

  const followHtml = followUps.map((p) => {
    const evp = db.events.find((e) => e.id === p.eventId);
    const [tone, label] = CONV_BADGE[p.conv.status];
    const when = evp?.status === 'active' ? 'hari ini' : fmtDate(evp?.tanggal, { day: 'numeric', month: 'long' });
    return `<button class="list-item" data-act="follow" data-id="${p.id}">
      <div class="tx"><b>${esc(p.nama)}, ${esc(p.usia)} th</b><span>${esc(evp?.nama.replace('Screening ', '') || '')} · ${when}</span></div>
      <span class="badge badge-${tone}">${label}</span>
    </button>`;
  }).join('<div class="menu-sep"></div>');

  const nConflict = db.conflicts.length;

  return `<div class="page page-home">
    <div class="home-head">
      <div class="home-head-brand">
        <img src="assets/terasol-mark.svg" alt="Terasol">
        <div><div class="sub">Rumah Sehat Terasol</div><div class="branch">${esc(db.tenant.nama)}</div></div>
      </div>
      <span class="badge badge-sage">Petugas</span>
    </div>

    <div class="sync-row">
      <span class="${dotCls}"></span>
      <span class="sync-title">${syncTitle}</span>
      <button class="sim-btn" data-act="sim-toggle">${sync.simOffline ? 'Kembali online' : 'Uji offline'}</button>
      <button class="sync-btn" data-act="sync">${ICO.refresh}Sync</button>
    </div>
    ${!sync.online ? `<div class="offline-note"><span class="dot"></span><span>Offline — input tetap berjalan, data aman di perangkat.</span></div>` : ''}

    ${ev ? `<div class="hero-card">
      <svg class="deco" viewBox="0 0 200 200" fill="none" aria-hidden="true"><circle cx="100" cy="100" r="82" stroke="rgba(248,245,238,.09)" stroke-width="9" stroke-linecap="round" stroke-dasharray="440 75" transform="rotate(-40 100 100)"></circle><circle cx="46" cy="152" r="6" fill="rgba(204,156,72,.5)"></circle></svg>
      <div class="hero-top">
        <span class="badge badge-onbrand"><span class="dot"></span>Event berlangsung</span>
        <span class="tipe">${ev.tipe === 'berbayar' ? esc(rp(ev.harga)) : 'Gratis'}</span>
      </div>
      <div>
        <div class="hero-title">${esc(ev.nama)}</div>
        <div class="hero-meta">${fmtDate(ev.tanggal)} · 08.00–12.00 · ${esc(ev.lokasi)}</div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${st.n}</b><span>Peserta</span></div>
        <div class="hero-stat"><b>${st.minat}</b><span>Berminat</span></div>
        <div class="hero-stat"><b>${st.anon}</b><span>Tally anonim</span></div>
      </div>
      <button class="btn btn-lg btn-full btn-onbrand" data-act="register">${ICO.userPlus}Registrasi peserta baru</button>
    </div>` : ''}

    <div class="card menu-card">
      <button class="menu-item" data-act="event-form">
        <span class="ic">${ICO.calPlus}</span>
        <span class="tx"><b>Buat event</b><span>Akses Koordinator</span></span>
        ${ICO.chevR}
      </button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-act="recap-last">
        <span class="ic">${ICO.chart}</span>
        <span class="tx"><b>Rekap event</b><span>Akses Koordinator</span></span>
        ${ICO.chevR}
      </button>
    </div>

    ${followUps.length ? `<div style="display:flex;flex-direction:column;gap:10px">
      <span class="section-title">Tindak lanjut peserta</span>
      <div class="card menu-card">${followHtml}</div>
    </div>` : ''}

    ${nConflict ? `<button class="review-card" data-act="conflicts">
      <span class="ic">${ICO.alert}</span>
      <span class="tx"><b>${nConflict} record perlu ditinjau</b><span>Duplikat saat sync — pilih record yang dipertahankan</span></span>
      ${ICO.chevR}
    </button>` : ''}
  </div>`;
}

function vEventForm() {
  const e = S.ev;
  return `<div class="page">
    <div class="page-head">
      <button class="back-btn" data-act="home" aria-label="Kembali">${ICO.back}</button>
      <span class="page-title">Buat event</span>
      <span class="badge badge-accent">Koordinator</span>
    </div>
    <div class="field"><label for="ev-nama">Nama event</label>
      <input class="input" id="ev-nama" data-field="nama" placeholder="cth. Screening Bazar RW 04" value="${esc(e.nama)}"></div>
    <div class="field"><label for="ev-lokasi">Lokasi</label>
      <input class="input" id="ev-lokasi" data-field="lokasi" placeholder="cth. Balai RW 04, Menteng" value="${esc(e.lokasi)}"></div>
    <div class="field"><label for="ev-tanggal">Tanggal</label>
      <input class="input" id="ev-tanggal" data-field="tanggal" type="date" value="${esc(e.tanggal)}"></div>
    <div class="field"><label>Jenis</label>
      <div class="pill-row">
        <button class="pill-choice ${e.tipe === 'gratis' ? 'on' : ''}" data-act="ev-tipe" data-v="gratis">Gratis</button>
        <button class="pill-choice ${e.tipe === 'berbayar' ? 'on' : ''}" data-act="ev-tipe" data-v="berbayar">Berbayar</button>
      </div></div>
    ${e.tipe === 'berbayar' ? `<div class="field"><label for="ev-harga">Harga paket</label>
      <input class="input" id="ev-harga" data-field="harga" inputmode="numeric" placeholder="cth. 35000" value="${esc(e.harga)}"></div>` : ''}
    <div class="field"><label for="ev-petugas">Petugas yang ditugaskan</label>
      <input class="input" id="ev-petugas" data-field="petugas" placeholder="cth. 2 petugas cabang" value="${esc(e.petugas)}"></div>
    <button class="btn btn-lg btn-full" data-act="ev-save">${ICO.check}Simpan event</button>
    <span class="hint">Event dibuat saat offline ikut antrean sync. Event yang sudah punya peserta hanya bisa diarsipkan.</span>
  </div>`;
}

function vRegister() {
  const d = draft();
  return `<div class="page">
    <div class="page-head">
      <button class="back-btn" data-act="home" aria-label="Kembali">${ICO.back}</button>
      <div style="display:flex;flex-direction:column;flex:1">
        <span class="page-title">Peserta baru</span>
        <span class="step-label">LANGKAH 1 DARI 3 · REGISTRASI</span>
      </div>
    </div>
    <div class="field"><label for="rg-nama">Nama lengkap</label>
      <input class="input" id="rg-nama" data-dfield="nama" placeholder="cth. Ibu Ratna" value="${esc(d.nama)}"></div>
    <div class="field"><label>Jenis kelamin</label>
      <div class="pill-row">
        <button class="pill-choice ${d.gender === 'P' ? 'on' : ''}" data-act="rg-gender" data-v="P">Perempuan</button>
        <button class="pill-choice ${d.gender === 'L' ? 'on' : ''}" data-act="rg-gender" data-v="L">Laki-laki</button>
      </div></div>
    <div style="display:grid;grid-template-columns:110px 1fr;gap:12px">
      <div class="field"><label for="rg-usia">Usia</label>
        <input class="input" id="rg-usia" data-dfield="usia" inputmode="numeric" placeholder="62" value="${esc(d.usia)}"></div>
      <div class="field"><label for="rg-hp">Nomor HP</label>
        <input class="input" id="rg-hp" data-dfield="hp" inputmode="numeric" placeholder="0812…" value="${esc(d.hp)}"></div>
    </div>
    ${S.dedupWarn ? `<div class="dedup-card">
      <b>Nomor HP ini sudah terdaftar di event ini</b>
      <p>Periksa apakah peserta yang sama, atau tetap buat record baru.</p>
      <div class="row">
        <button class="btn btn-sm btn-secondary" data-act="dedup-cancel">Periksa data</button>
        <button class="btn btn-sm" data-act="dedup-proceed">Tetap buat baru</button>
      </div>
    </div>` : ''}
    <button class="btn btn-lg btn-full" data-act="to-consent">Lanjut ke persetujuan${ICO.arrowR}</button>
    <span class="hint">Setiap field tersimpan otomatis ke perangkat.</span>
    <span class="hint-subtle">Coba nomor 081234567890 untuk melihat peringatan duplikat.</span>
  </div>`;
}

function vConsent() {
  return `<div class="page">
    <div class="page-head">
      <button class="back-btn" data-act="register" aria-label="Kembali">${ICO.back}</button>
      <div style="display:flex;flex-direction:column;flex:1">
        <span class="page-title">Persetujuan data</span>
        <span class="step-label">LANGKAH 2 DARI 3 · PERSETUJUAN</span>
      </div>
    </div>
    <div class="card consent-card">
      <svg class="wave" viewBox="0 0 360 32" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16 C 50 5 110 27 180 16 S 310 5 360 16" stroke="rgba(18,84,90,.10)" stroke-width="2"></path><path d="M0 24 C 50 13 110 35 180 24 S 310 13 360 24" stroke="rgba(108,132,120,.14)" stroke-width="2"></path></svg>
      <b>Bacakan kepada peserta:</b>
      <div class="consent-points">
        <div class="pt"><span>Kami mencatat nama, jenis kelamin, usia, nomor HP, dan hasil pengukuran Anda.</span></div>
        <div class="pt"><span>Data dipakai untuk rekap layanan dan tindak lanjut penawaran produk Terasol.</span></div>
        <div class="pt"><span>Data disimpan maksimal 12 bulan, lalu dihapus.</span></div>
        <div class="pt"><span>Persetujuan dapat ditarik kapan saja melalui cabang; data Anda akan kami hapus.</span></div>
      </div>
      <small>Teks consent v1 (draf — menunggu review hukum). Persetujuan direkam dengan waktu dan versi teks.</small>
    </div>
    <button class="btn btn-lg btn-full" data-act="consent-agree">${ICO.check}Peserta setuju</button>
    <button class="btn btn-full btn-secondary" data-act="consent-refuse">${ICO.x}Peserta menolak</button>
    <span class="hint">Bila menolak, peserta tetap dilayani. Hasil tidak disimpan — hanya tally anonim untuk hitungan consumable.</span>
  </div>`;
}

function vScreening() {
  const d = draft();
  const pIdx = PARAMS.findIndex((p) => p.k === S.active);
  const activeP = PARAMS[pIdx];
  const imt = imtOf(d.vals);

  const rows = PARAMS.map((p) => {
    const filled = d.vals[p.k] !== '';
    const act = p.k === S.active;
    const cls = 'param-row' + (act ? ' active' : filled ? ' filled' : '');
    const val = filled ? esc(d.vals[p.k]) : act ? '' : '–';
    return `<button class="${cls}" data-act="param" data-k="${p.k}">
      <span class="tx"><b>${p.label}</b><span>${p.unit} · rentang ${String(p.min).replace('.', ',')}–${String(p.max).replace('.', ',')}</span></span>
      <span class="val">${val}</span>
    </button>`;
  }).join('');

  const warnMsg = S.warn && activeP && S.warn === activeP.k
    ? `<div class="range-warn">Nilai di luar rentang wajar (${activeP.min}–${activeP.max} ${activeP.unit}). Ketuk Lanjut sekali lagi untuk konfirmasi.</div>`
    : '';

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    .map((k) => `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join('');

  return `<div class="scr-wrap">
    <div class="scr-head">
      <button class="back-btn" data-act="consent" aria-label="Kembali">${ICO.back}</button>
      <div class="tx">
        <span class="name">${esc(d.nama || 'Peserta')}${d.usia ? ' · ' + esc(d.usia) + ' th' : ''}</span>
        <span class="step-label">LANGKAH 3 DARI 3 · PARAMETER ${pIdx + 1} DARI 7</span>
      </div>
      <span class="saved-chip">${ICO.checkSm}Tersimpan</span>
    </div>
    <div class="scr-rows">
      ${rows}
      ${warnMsg}
      ${imt ? `<div class="imt-chip"><b>IMT otomatis:</b><span>${imt}</span></div>` : ''}
    </div>
    <div class="keypad-dock">
      <div class="keypad-actions">
        <button class="btn btn-ghost" data-act="skip">Lewati</button>
        <button class="btn" style="flex:1" data-act="next">${pIdx >= PARAMS.length - 1 ? 'Selesai' : 'Lanjut'}</button>
      </div>
      <div class="keypad">
        ${keys}
        <button class="key" data-act="key" data-k=",">,</button>
        <button class="key" data-act="key" data-k="0">0</button>
        <button class="key" data-act="key-back" aria-label="Hapus">${ICO.backspace}</button>
      </div>
    </div>
  </div>`;
}

function vDone() {
  const d = draft();
  const taken = PARAMS.filter((p) => d.vals[p.k] !== '').length;
  const imt = imtOf(d.vals);
  return `<div class="page page-home">
    <div class="done-head">
      <svg class="deco" viewBox="0 0 170 170" fill="none" aria-hidden="true"><circle cx="85" cy="85" r="50" stroke="rgba(18,84,90,.09)" stroke-width="1.5" stroke-dasharray="290 40" stroke-linecap="round" transform="rotate(30 85 85)"></circle><circle cx="85" cy="85" r="68" stroke="rgba(108,132,120,.11)" stroke-width="1.5" stroke-dasharray="370 60" stroke-linecap="round" transform="rotate(-60 85 85)"></circle><circle cx="138" cy="50" r="4" fill="rgba(204,156,72,.5)"></circle></svg>
      <div class="ok">${icon(['M20 6 9 17l-5-5'], 28, 2)}</div>
      <b>Hasil tercatat</b>
    </div>
    <div class="card summary-card">
      <div class="summary-row"><span>Peserta</span><span>${esc(d.nama || 'Peserta')}${d.usia ? ', ' + esc(d.usia) + ' th' : ''}</span></div>
      <div class="summary-row"><span>Parameter diambil</span><span>${taken} dari 7</span></div>
      ${imt ? `<div class="summary-row"><span>IMT</span><span>${imt}</span></div>` : ''}
      <div class="summary-row"><span>Persetujuan</span><span class="good">Setuju · ${CONSENT_VERSION}</span></div>
    </div>
    <button class="minat-toggle ${d.berminat ? 'on' : ''}" data-act="minat">
      <span class="tx"><b>Peserta berminat produk</b><span>Masuk daftar tindak lanjut Koordinator</span></span>
      <span class="ring">${d.berminat ? icon(['M20 6 9 17l-5-5'], 18, 2.4) : ''}</span>
    </button>
    <button class="btn btn-lg btn-full" data-act="save-next">${ICO.userPlus}Simpan &amp; peserta berikutnya</button>
    <button class="btn btn-full btn-ghost" data-act="save-home">${ICO.home}Simpan &amp; kembali ke beranda</button>
  </div>`;
}

function vEvents() {
  const cards = db.events
    .slice()
    .sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1) || b.ts - a.ts)
    .map((ev) => {
      const st = eventStats(ev);
      const isActive = ev.status === 'active';
      const isFuture = ev.status === 'planned';
      const badge = isActive
        ? '<span class="badge badge-success"><span class="dot"></span>Berlangsung</span>'
        : isFuture
          ? '<span class="badge badge-brand">Terjadwal</span>'
          : '<span class="badge badge-sage">Selesai</span>';
      const tipe = ev.tipe === 'berbayar' ? 'Berbayar · ' + rp(ev.harga) : 'Gratis';
      const meta = isActive
        ? `${fmtDate(ev.tanggal)} · ${esc(ev.lokasi)} · ${st.n} peserta`
        : isFuture
          ? `${fmtDate(ev.tanggal)} · ${esc(ev.lokasi)}`
          : `${fmtDate(ev.tanggal)} · ${st.n} peserta · Lihat rekap`;
      return `<button class="card event-card" data-act="${isActive ? 'home' : 'recap'}" data-id="${ev.id}">
        <div class="top">${badge}<span>${tipe}</span></div>
        <span class="name">${esc(ev.nama)}</span>
        <span class="meta">${meta}</span>
      </button>`;
    }).join('');
  return `<div class="page page-home">
    <div class="events-head">
      <b>Event</b>
      <button class="btn btn-sm btn-secondary" data-act="event-form">${ICO.plus}Buat event</button>
    </div>
    ${cards}
  </div>`;
}

function vRecap() {
  const ev = db.events.find((e) => e.id === S.recapEv) || db.events.find((e) => e.status === 'done') || db.events[0];
  const st = eventStats(ev);
  const ratio = st.n ? st.beli / st.n : 0;
  const avg = st.beli ? st.sales / st.beli : 0;
  const consum =
    st.gula * STRIP_PRICE.gula + st.kol * STRIP_PRICE.kol + st.asam * STRIP_PRICE.asam;
  const tipe = ev.tipe === 'berbayar' ? 'Berbayar ' + rp(ev.harga) : 'Gratis';
  return `<div class="page">
    <div class="page-head">
      <button class="back-btn" data-act="events" aria-label="Kembali">${ICO.back}</button>
      <span class="page-title">Rekap event</span>
      <span class="badge badge-accent">Koordinator</span>
    </div>
    <div class="recap-sub">
      <b>${esc(ev.nama)}</b>
      <span>${fmtDate(ev.tanggal)} · ${tipe} · ${esc(ev.petugas || '—')}</span>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><b>${st.n}</b><span>Peserta</span></div>
      <div class="stat-card"><b>${st.minat}</b><span>Berminat</span></div>
      <div class="stat-card"><b>${st.beli}</b><span>Membeli</span></div>
      <div class="stat-card"><b>${pct(ratio)}</b><span>Rasio konversi</span></div>
    </div>
    <div class="card sales-card">
      <svg class="deco" viewBox="0 0 150 150" fill="none" aria-hidden="true"><circle cx="75" cy="75" r="55" stroke="rgba(18,84,90,.08)" stroke-width="7" stroke-linecap="round" stroke-dasharray="300 45" transform="rotate(-50 75 75)"></circle><circle cx="38" cy="104" r="5" fill="rgba(204,156,72,.45)"></circle></svg>
      <div class="rule"></div>
      <span class="lbl">Nilai penjualan</span>
      <span class="amount">${rp(st.sales)}</span>
      <span class="lbl">${st.beli} transaksi${st.beli ? ' · rata-rata ' + rp(avg) : ''}</span>
    </div>
    <div class="card consumable-card">
      <b>Parameter &amp; consumable terpakai</b>
      <div class="consumable-row"><span>Tensi — ${st.tensi} peserta</span><span class="muted">—</span></div>
      <div class="consumable-row"><span>Gula darah — ${st.gula} strip</span><span>${rp(st.gula * STRIP_PRICE.gula)}</span></div>
      <div class="consumable-row"><span>Kolesterol — ${st.kol} strip</span><span>${rp(st.kol * STRIP_PRICE.kol)}</span></div>
      <div class="consumable-row"><span>Asam urat — ${st.asam} strip</span><span>${rp(st.asam * STRIP_PRICE.asam)}</span></div>
      <div class="consumable-sep"></div>
      <div class="consumable-total"><span>Estimasi total</span><span>${rp(consum)}</span></div>
      <small>Persetujuan: ${st.n} setuju · ${st.anon} tally anonim</small>
    </div>
    <button class="btn btn-full btn-secondary" data-act="export-csv" data-id="${ev.id}">${ICO.download}Unduh CSV</button>
  </div>`;
}

function vPlaceholder(kind) {
  const isOutlet = kind === 'outlet';
  return `<div class="page page-fill" style="padding:0">
    <div class="placeholder">
      <svg class="deco" style="top:-90px;${isOutlet ? 'right' : 'left'}:-110px;width:300px;height:300px" viewBox="0 0 200 200" fill="none" aria-hidden="true"><circle cx="100" cy="100" r="80" stroke="rgba(18,84,90,.07)" stroke-width="10" stroke-linecap="round" stroke-dasharray="430 75" transform="rotate(${isOutlet ? -30 : 140} 100 100)"></circle></svg>
      <svg class="deco" style="bottom:24px;${isOutlet ? 'left' : 'right'}:26px;width:44px;height:24px" viewBox="0 0 44 24" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="rgba(204,156,72,.4)"></circle><circle cx="24" cy="16" r="2.5" fill="rgba(204,156,72,.3)"></circle><circle cx="38" cy="6" r="2" fill="rgba(108,132,120,.3)"></circle></svg>
      <div class="ic">${isOutlet ? ICO.outlet : ICO.van}</div>
      <span class="badge badge-sage">Segera hadir · ${isOutlet ? 'v1.1' : 'v1.2'}</span>
      <b>Kanal ${isOutlet ? 'Outlet' : 'Home Service'}</b>
      <p>${isOutlet
        ? 'Pencatatan sesi harian di outlet, jadwal, dan pelanggan berulang — terhubung dengan data konversi dari event.'
        : 'Penjadwalan kunjungan ke rumah pelanggan, penugasan petugas, dan pencatatan sesi di lokasi.'}</p>
    </div>
  </div>`;
}

function vConflicts() {
  const cards = db.conflicts.map((cf) => {
    const ev = db.events.find((e) => e.id === cf.eventId);
    const recs = cf.ids.map((id) => db.participants.find((p) => p.id === id)).filter(Boolean);
    const recHtml = recs.map((p, i) => {
      const filled = PARAMS.filter((q) => p.vals[q.k] !== '')
        .map((q) => `${q.label.replace('Tensi — ', 'Tensi ')} ${p.vals[q.k]}`).join(' · ') || 'Belum ada hasil';
      const t = new Date(p.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `<div class="card conflict-card">
        <div class="who"><b>Record ${i + 1} — ${esc(p.nama)}, ${esc(p.usia)} th</b><span>${t}</span></div>
        <div class="conflict-vals">${esc(p.hp)} · ${esc(filled)}</div>
        <button class="btn btn-sm btn-secondary" data-act="conflict-keep" data-cf="${cf.id}" data-id="${p.id}">Pertahankan record ini</button>
      </div>`;
    }).join('');
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <span class="section-title">${esc(ev?.nama || '')} · nomor ${esc(cf.hp)}</span>
      ${recHtml}
    </div>`;
  }).join('');
  return `<div class="page">
    <div class="page-head">
      <button class="back-btn" data-act="home" aria-label="Kembali">${ICO.back}</button>
      <span class="page-title">Resolusi konflik</span>
      <span class="badge badge-accent">Koordinator</span>
    </div>
    <span class="hint" style="text-align:left">Dua petugas mencatat nomor HP yang sama di event yang sama. Server tidak menimpa otomatis — pilih record yang dipertahankan; record satunya diarsipkan.</span>
    ${cards || '<span class="hint">Tidak ada konflik. Semua record bersih.</span>'}
  </div>`;
}

/* ---- Bottom sheet: tindak lanjut (Koordinator) ---- */
function vSheet() {
  if (!S.sheet) return '';
  const p = db.participants.find((x) => x.id === S.sheet);
  if (!p) return '';
  const ev = db.events.find((e) => e.id === p.eventId);
  const [tone, label] = CONV_BADGE[p.conv?.status || 'baru'];
  const buyForm = S.sheetBuy ? `
    <div class="field"><label for="buy-nilai">Nilai transaksi</label>
      <input class="input" id="buy-nilai" inputmode="numeric" placeholder="cth. 1400000"></div>
    <div class="field"><label for="buy-produk">Produk yang dibeli</label>
      <input class="input" id="buy-produk" placeholder="cth. Paket herbal sendi"></div>
    <button class="btn btn-full" data-act="conv-buy-save">${ICO.check}Simpan pembelian</button>`
    : `
    <button class="btn btn-full btn-secondary" data-act="conv-set" data-v="dihubungi">Tandai sudah dihubungi</button>
    <button class="btn btn-full" data-act="conv-buy">Membeli — isi transaksi</button>
    <button class="btn btn-full btn-ghost" data-act="conv-set" data-v="batal">Tidak jadi</button>`;
  return `<div class="sheet-veil" data-act="sheet-close">
    <div class="sheet" data-stop="1">
      <div class="grab"></div>
      <div class="sheet-title">
        <b>${esc(p.nama)}, ${esc(p.usia)} th</b>
        <span>${esc(ev?.nama || '')} · ${esc(p.hp)}</span>
      </div>
      <div><span class="badge badge-${tone}">${label}</span></div>
      ${buyForm}
      <span class="hint-subtle">Perubahan status masuk antrean sync. Akses Koordinator.</span>
    </div>
  </div>`;
}

/* =============================== Actions =============================== */

function saveParticipant(nextScreen) {
  const d = draft();
  const ev = activeEvent();
  db.participants.push({
    id: uid('ps'), tenantId: TENANT.id, eventId: ev.id,
    nama: d.nama, gender: d.gender, usia: d.usia, hp: d.hp,
    consent: { granted: true, versi: CONSENT_VERSION, ts: Date.now() },
    vals: { ...d.vals },
    berminat: d.berminat,
    conv: d.berminat ? { status: 'baru', nilai: 0, produk: '', updatedAt: Date.now() } : null,
    synced: false, ts: Date.now(),
  });
  db.draft = null;
  saveDb();
  toast('Peserta tersimpan di perangkat.');
  if (sync.online) sync.schedule();
  Object.assign(S, { dedupWarn: false, dedupOk: false, active: 'tinggi', warn: null });
  go(nextScreen, nextScreen === 'home' ? { tab: 'home' } : {});
}

function exportCsv(evId) {
  const ev = db.events.find((e) => e.id === evId);
  const recs = db.participants.filter((p) => p.eventId === evId);
  const head = ['nama', 'jenis_kelamin', 'usia', 'no_hp', 'consent', 'consent_versi',
    'tinggi_cm', 'berat_kg', 'imt', 'sistolik', 'diastolik', 'gula_mgdl', 'kolesterol_mgdl', 'asam_urat_mgdl',
    'berminat', 'status_konversi', 'nilai_transaksi', 'produk'];
  const cell = (v) => { v = String(v ?? ''); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = recs.map((p) => [
    p.nama, p.gender, p.usia, p.hp, p.consent.granted ? 'setuju' : 'tolak', p.consent.versi,
    p.vals.tinggi, p.vals.berat, (imtOf(p.vals) || '').split(' — ')[0], p.vals.sis, p.vals.dia,
    p.vals.gula, p.vals.kol, p.vals.asam,
    p.berminat ? 'ya' : 'tidak', p.conv?.status || '', p.conv?.nilai || '', p.conv?.produk || '',
  ].map(cell).join(';'));
  const csv = '﻿' + [head.join(';'), ...rows].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = (ev?.nama || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-rekap.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`CSV terunduh — ${recs.length} baris.`);
}

const actions = {
  'home': () => go('home', { tab: 'home' }),
  'events': () => go('events', { tab: 'events' }),
  'register': () => { draft(); go('register'); },
  'consent': () => go('consent'),
  'event-form': () => go('eventForm'),
  'recap-last': () => {
    const ev = db.events.find((e) => e.status === 'done') || db.events[0];
    go('recap', { recapEv: ev?.id, tab: 'events' });
  },
  'recap': (el) => go('recap', { recapEv: el.dataset.id, tab: 'events' }),
  'conflicts': () => go('conflicts'),

  'sync': () => sync.run(),
  'sim-toggle': () => {
    sync.simOffline = !sync.simOffline;
    if (sync.simOffline) toast('Mode offline. Semua input tetap tersimpan di perangkat.');
    else if (sync.queue > 0) sync.schedule(700);
    render();
  },

  'ev-tipe': (el) => { S.ev.tipe = el.dataset.v; render(); },
  'ev-save': () => {
    const e = S.ev;
    if (!e.nama || !e.lokasi) { toast('Lengkapi nama event dan lokasi.'); return; }
    const today = new Date().toISOString().slice(0, 10);
    db.events.push({
      id: uid('ev'), tenantId: TENANT.id,
      nama: e.nama, lokasi: e.lokasi, tanggal: e.tanggal || today,
      tipe: e.tipe, harga: num(e.harga) || 0, petugas: e.petugas,
      status: e.tanggal && e.tanggal > today ? 'planned' : 'active',
      synced: false, ts: Date.now(),
    });
    saveDb();
    S.ev = { nama: '', lokasi: '', tanggal: '', tipe: 'gratis', harga: '', petugas: '' };
    toast('Event tersimpan dan masuk antrean sync.');
    if (sync.online) sync.schedule();
    go('events', { tab: 'events' });
  },

  'rg-gender': (el) => { setDraft({ gender: el.dataset.v }); render(); },
  'dedup-cancel': () => { S.dedupWarn = false; render(); },
  'dedup-proceed': () => { S.dedupWarn = false; S.dedupOk = true; go('consent'); },
  'to-consent': () => {
    const d = draft();
    if (!d.nama || !d.gender || !d.usia || !d.hp) {
      toast('Lengkapi nama, jenis kelamin, usia, dan nomor HP.');
      return;
    }
    const dup = db.participants.some((p) => p.eventId === d.eventId && p.hp === d.hp);
    if (dup && !S.dedupOk) { S.dedupWarn = true; render(); return; }
    go('consent');
  },

  'consent-agree': () => go('screening', { active: 'tinggi', warn: null }),
  'consent-refuse': () => {
    const evId = draft().eventId;
    db.anon[evId] = (db.anon[evId] || 0) + 1;
    db.draft = null;
    saveDb();
    S.dedupOk = false;
    toast('Dicatat sebagai tally anonim. Hasil tidak disimpan.');
    go('home', { tab: 'home' });
  },

  'param': (el) => { S.active = el.dataset.k; S.warn = null; render(); },
  'key': (el) => {
    const d = draft();
    const v = d.vals[S.active] || '';
    const p = PARAMS.find((q) => q.k === S.active);
    const k = el.dataset.k;
    if (k === ',' && (!p?.dec || !v || v.includes(','))) return;
    if (v.length >= 5) return;
    d.vals[S.active] = v + k;
    S.warn = null;
    saveDb();
    render();
  },
  'key-back': () => {
    const d = draft();
    d.vals[S.active] = (d.vals[S.active] || '').slice(0, -1);
    S.warn = null;
    saveDb();
    render();
  },
  'skip': () => {
    const d = draft();
    d.vals[S.active] = '';
    saveDb();
    advanceParam();
  },
  'next': () => {
    const d = draft();
    const p = PARAMS.find((q) => q.k === S.active);
    const v = d.vals[S.active];
    if (v !== '' && p) {
      const n = num(v);
      if ((n == null || n < p.min || n > p.max) && S.warn !== p.k) {
        S.warn = p.k;
        render();
        return;
      }
    }
    advanceParam();
  },

  'minat': () => { setDraft({ berminat: !draft().berminat }); render(); },
  'save-next': () => saveParticipant('register'),
  'save-home': () => saveParticipant('home'),

  'export-csv': (el) => exportCsv(el.dataset.id),

  'follow': (el) => { S.sheet = el.dataset.id; S.sheetBuy = false; render(); },
  'sheet-close': () => { S.sheet = null; S.sheetBuy = false; render(); },
  'conv-set': (el) => {
    const p = db.participants.find((x) => x.id === S.sheet);
    if (p) {
      p.conv = { ...(p.conv || {}), status: el.dataset.v, updatedAt: Date.now() };
      p.synced = false;
      saveDb();
      toast(el.dataset.v === 'batal' ? 'Ditandai tidak jadi.' : 'Ditandai sudah dihubungi.');
      if (sync.online) sync.schedule();
    }
    S.sheet = null;
    render();
  },
  'conv-buy': () => { S.sheetBuy = true; render(); },
  'conv-buy-save': () => {
    const nilai = num(document.getElementById('buy-nilai')?.value);
    const produk = (document.getElementById('buy-produk')?.value || '').trim();
    if (!nilai || !produk) { toast('Isi nilai transaksi dan produk yang dibeli.'); return; }
    const p = db.participants.find((x) => x.id === S.sheet);
    if (p) {
      p.conv = { status: 'membeli', nilai, produk, updatedAt: Date.now() };
      p.synced = false;
      saveDb();
      toast('Konversi tercatat — ' + rp(nilai) + '.');
      if (sync.online) sync.schedule();
    }
    S.sheet = null;
    S.sheetBuy = false;
    render();
  },

  'conflict-keep': (el) => {
    const cf = db.conflicts.find((c) => c.id === el.dataset.cf);
    if (!cf) return;
    const dropIds = cf.ids.filter((id) => id !== el.dataset.id);
    db.participants = db.participants.filter((p) => !dropIds.includes(p.id));
    const kept = db.participants.find((p) => p.id === el.dataset.id);
    if (kept) delete kept.needsReview;
    db.conflicts = db.conflicts.filter((c) => c.id !== cf.id);
    saveDb();
    toast('Record dipertahankan. Duplikatnya diarsipkan.');
    go(db.conflicts.length ? 'conflicts' : 'home', { tab: 'home' });
  },
};

function advanceParam() {
  const pIdx = PARAMS.findIndex((p) => p.k === S.active);
  S.warn = null;
  if (pIdx >= PARAMS.length - 1) go('done');
  else { S.active = PARAMS[pIdx + 1].k; render(); }
}

/* =============================== Render =============================== */

const SCREENS = {
  home: vHome, eventForm: vEventForm, register: vRegister, consent: vConsent,
  screening: vScreening, done: vDone, events: vEvents, recap: vRecap,
  outlet: () => vPlaceholder('outlet'), hs: () => vPlaceholder('hs'),
  conflicts: vConflicts,
};
const TOP_SCREENS = ['home', 'events', 'outlet', 'hs'];

function render() {
  document.getElementById('screen').innerHTML = (SCREENS[S.screen] || vHome)();

  // Tab bar hanya di layar utama
  const tabbar = document.getElementById('tabbar');
  const showTabs = TOP_SCREENS.includes(S.screen);
  tabbar.hidden = !showTabs;
  tabbar.innerHTML = showTabs
    ? TABS.map((t) => `<button class="tab ${S.tab === t.id ? 'on' : ''}" data-tab="${t.id}">${t.ico}<span>${t.label}</span></button>`).join('')
    : '';

  // Indikator jaringan di status bar
  document.getElementById('net-chip').hidden = sync.online;
  document.getElementById('net-wifi').style.display = sync.online ? '' : 'none';

  document.getElementById('sheet-slot').innerHTML = vSheet();
}

/* ---- Toast ---- */
let toastTimer = null;
function toast(msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-slot').innerHTML =
    `<div class="toast-wrap"><div class="toast">${icon(['M20 6 9 17l-5-5'], 18, 2)}<span>${esc(msg)}</span></div></div>`;
  toastTimer = setTimeout(() => { document.getElementById('toast-slot').innerHTML = ''; }, 4200);
}

/* ---- Event delegation ---- */
document.getElementById('app').addEventListener('click', (e) => {
  const stop = e.target.closest('[data-stop]');
  const actEl = e.target.closest('[data-act]');
  if (actEl && (!stop || stop.contains(actEl))) {
    if (actEl.dataset.act === 'sheet-close' && stop) return; // klik di dalam sheet
    actions[actEl.dataset.act]?.(actEl);
    return;
  }
  const tabEl = e.target.closest('[data-tab]');
  if (tabEl) go(tabEl.dataset.tab, { tab: tabEl.dataset.tab });
});
document.getElementById('app').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.field) { S.ev[t.dataset.field] = t.value; return; }
  if (t.dataset.dfield) {
    setDraft({ [t.dataset.dfield]: t.value });
    if (t.dataset.dfield === 'hp') { S.dedupWarn = false; S.dedupOk = false; }
  }
});

/* ---- Jam status bar ---- */
function tick() {
  const d = new Date();
  document.getElementById('clock').textContent =
    String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
}
tick();
setInterval(tick, 15000);

/* ---- PWA ---- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.storage?.persist?.();
}

render();
