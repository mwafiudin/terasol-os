import type { Role } from './types';

export type DemoLogin = { label: string; role: Role; email: string; password: string };

/**
 * Tombol masuk cepat untuk pengembangan lokal.
 *
 * Dua lapis pengaman, dan keduanya harus lolos:
 *  1. `import.meta.env.DEV` — konstanta yang diganti Vite saat build, jadi di
 *     build produksi cabang ini mati dan seluruh kodenya hilang dari bundle.
 *  2. `VITE_DEMO_LOGINS` hanya ada di `.env.local` yang masuk .gitignore, jadi
 *     kredensialnya tidak pernah ikut ke repositori maupun ke server build.
 *
 * Artinya: tanpa file lokal itu, tombolnya tidak muncul bahkan saat `npm run dev`.
 */
export function demoLogins(): DemoLogin[] {
  if (!import.meta.env.DEV) return [];

  const raw = import.meta.env.VITE_DEMO_LOGINS;
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is DemoLogin =>
      !!x && typeof x === 'object'
      && typeof (x as DemoLogin).label === 'string'
      && typeof (x as DemoLogin).email === 'string'
      && typeof (x as DemoLogin).password === 'string');
  } catch {
    console.warn('VITE_DEMO_LOGINS bukan JSON yang valid — tombol masuk cepat dilewati.');
    return [];
  }
}
