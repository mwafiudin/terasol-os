import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['terasol-mark.svg'],
      manifest: {
        name: 'Terasol OS',
        short_name: 'Terasol OS',
        description: 'Manajemen mitra Rumah Sehat Terasol — kanal event screening.',
        lang: 'id',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F8F5EE',
        theme_color: '#12545A',
        icons: [
          { src: 'terasol-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'terasol-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Shell di-precache agar aplikasi hidup penuh tanpa jaringan.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        // Permintaan API tidak pernah di-cache: data lapangan berasal dari
        // IndexedDB lokal, bukan dari cache HTTP yang bisa basi diam-diam.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com'
              || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'terasol-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // Sourcemap sengaja dibiarkan mati (default Vite). Menerbitkannya berarti
    // menerbitkan seluruh kode sumber aplikasi yang menangani data kesehatan —
    // permukaan informasi yang tidak perlu ada di produksi. Untuk menelusuri
    // bug build, nyalakan sementara dengan `vite build --sourcemap`.
  },
});
