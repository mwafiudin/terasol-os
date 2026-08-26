import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';

// Gaya panel "masuk cepat". Impor dinamis di balik konstanta DEV, sehingga di
// build produksi cabang ini mati dan berkasnya tidak ikut dibundel sama sekali.
if (import.meta.env.DEV) {
  void import('./styles/dev.css');
}

// Permintaan persistent storage (R1) dilakukan di store saat boot, supaya
// hasilnya tercatat dan bisa diperingatkan ke petugas bila ditolak.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
