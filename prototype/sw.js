/* Terasol OS — service worker. App shell dicache agar aplikasi berjalan penuh
   saat offline (UI tidak pernah menunggu jaringan). */
const CACHE = 'terasol-os-v1';
const SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'manifest.webmanifest',
  'assets/terasol-mark.svg',
  'styles/tokens.css',
  'styles/tokens/base.css',
  'styles/tokens/colors.css',
  'styles/tokens/elevation.css',
  'styles/tokens/fonts.css',
  'styles/tokens/motion.css',
  'styles/tokens/radius.css',
  'styles/tokens/spacing.css',
  'styles/tokens/typography.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first untuk shell; jaringan hanya pelengkap (font Google dicache
   oportunistik saat pernah online). */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const url = new URL(e.request.url);
        const cacheable = res.ok && (url.origin === location.origin ||
          url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com');
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : undefined));
    })
  );
});
