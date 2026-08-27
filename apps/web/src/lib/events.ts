import { api } from './api';
import { db } from './db';
import { isOnline } from './sync';
import type { EventRow } from './types';

/**
 * Menarik daftar event dari server ke penyimpanan lokal. Event yang dibuat
 * Koordinator dari perangkat lain harus muncul di HP petugas, dan event yang
 * dibuat offline di sini tidak boleh tertimpa oleh hasil tarikan.
 */
export async function pullEvents(): Promise<void> {
  if (!isOnline()) return;
  const { events } = await api.events();
  const local = await db.events.toArray();
  const unsynced = new Set(local.filter((e) => e.synced === 0).map((e) => e.clientId));

  // Event yang diarsipkan tidak lagi dikembalikan server, jadi salinan lokalnya
  // harus ikut hilang — kalau tidak, event itu terus muncul seolah masih aktif.
  //
  // Syaratnya sengaja ketat: hanya event yang PERNAH kita terima dari server
  // (punya serverId) yang boleh dihapus. Event yang baru saja di-push belum
  // punya serverId, sehingga tidak ikut terhapus hanya karena balasan /events
  // ini dikirim sebelum push-nya mendarat.
  const dariServer = new Set(events.map((e) => e.clientId));
  const usang = local
    .filter((e) => e.synced === 1 && e.serverId !== null && !dariServer.has(e.clientId))
    .map((e) => e.clientId);
  if (usang.length) await db.events.bulkDelete(usang);

  // Penugasan yang belum sempat terkirim hanya ada di perangkat ini; tarikan
  // dari server tidak boleh menghapusnya sebelum sempat dikirim.
  const belumTerkirim = new Map(
    local.filter((e) => e.petugasIds?.length).map((e) => [e.clientId, e.petugasIds!]),
  );

  const rows: EventRow[] = events
    .filter((e) => !unsynced.has(e.clientId))
    .map((e) => ({
      clientId: e.clientId,
      serverId: (e as unknown as { id: string }).id,
      petugasIds: belumTerkirim.get(e.clientId) ?? [],
      nama: e.nama,
      lokasi: e.lokasi,
      tanggal: e.tanggal,
      tipe: e.tipe,
      hargaPaket: e.hargaPaket,
      petugas: e.petugas,
      status: e.status,
      peserta: e.peserta ?? 0,
      berminat: e.berminat ?? 0,
      tally: e.tally ?? 0,
      synced: 1,
      updatedAt: new Date().toISOString(),
    }));
  if (rows.length) await db.events.bulkPut(rows);
  // Baru sekarang event punya serverId, jadi penugasan bisa dikirim.
  await kirimPenugasan();
}

export async function localEvents(): Promise<EventRow[]> {
  const rows = await db.events.toArray();
  return rows.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return b.tanggal.localeCompare(a.tanggal);
  });
}

export async function activeEvent(): Promise<EventRow | null> {
  const rows = await localEvents();
  return rows.find((e) => e.status === 'active') ?? rows[0] ?? null;
}

export type EventCounts = { peserta: number; berminat: number; tally: number; belumSync: number };

/**
 * Hitungan untuk kartu event di Beranda: angka dari server (mencakup peserta
 * dari perangkat lain) ditambah yang masih mengantre di perangkat ini.
 */
export async function countsFor(ev: EventRow): Promise<EventCounts> {
  const rows = await db.participants.where('eventClientId').equals(ev.clientId).toArray();
  const tallies = await db.anonTallies.where('eventClientId').equals(ev.clientId).toArray();
  const belum = rows.filter((r) => r.synced === 0);
  const belumTally = tallies.filter((t) => t.synced === 0);

  // Angka server sudah mencakup semua perangkat; yang ditambahkan hanya
  // record yang masih mengantre di perangkat ini agar tidak terhitung dua kali.
  return {
    peserta: ev.peserta + belum.length,
    berminat: ev.berminat + belum.filter((r) => r.berminat === 1).length,
    tally: ev.tally + belumTally.length,
    belumSync: belum.length,
  };
}

/**
 * Daftar rekan satu cabang, disimpan agar dropdown petugas tetap terisi saat
 * offline. Tanpa cache, Koordinator yang membuat event di lokasi tanpa sinyal
 * hanya melihat dropdown kosong — dan kembali menulis nama sebagai teks bebas,
 * yang justru ingin kita tinggalkan.
 */
const CACHE_REKAN = 'terasol.rekan';
export type Rekan = { id: string; nama: string; role: string };

export function rekanTersimpan(): Rekan[] {
  try { return JSON.parse(localStorage.getItem(CACHE_REKAN) ?? '[]') as Rekan[]; }
  catch { return []; }
}

export async function muatRekan(): Promise<Rekan[]> {
  if (!isOnline()) return rekanTersimpan();
  try {
    const { rekan } = await api.rekan();
    localStorage.setItem(CACHE_REKAN, JSON.stringify(rekan));
    return rekan;
  } catch { return rekanTersimpan(); }
}

export function lupakanRekan() { localStorage.removeItem(CACHE_REKAN); }

/**
 * Kirim penugasan petugas untuk event yang sudah punya serverId. Dipanggil
 * setelah sync: sebelum event ada di server, tidak ada yang bisa ditugaskan.
 */
export async function kirimPenugasan(): Promise<void> {
  if (!isOnline()) return;
  const perlu = (await db.events.toArray()).filter(
    (e) => e.serverId && e.petugasIds && e.petugasIds.length > 0,
  );
  for (const e of perlu) {
    try {
      await api.setEventPetugas(e.serverId!, e.petugasIds!);
      // Dikosongkan setelah diterima server supaya tidak dikirim ulang tiap sync.
      await db.events.update(e.clientId, { petugasIds: [] });
    } catch { /* dicoba lagi pada sync berikutnya */ }
  }
}

export async function saveLocalEvent(
  e: Omit<EventRow, 'synced' | 'updatedAt' | 'serverId' | 'peserta' | 'berminat' | 'tally'>,
) {
  await db.events.put({
    ...e, serverId: null, peserta: 0, berminat: 0, tally: 0,
    synced: 0, updatedAt: new Date().toISOString(),
  });
}
