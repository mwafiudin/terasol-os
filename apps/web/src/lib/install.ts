import { useEffect, useState } from 'react';

/**
 * Install ke home screen (mitigasi R1).
 *
 * PRD mewajibkan aplikasi dipasang ke home screen, bukan dibuka lewat tab
 * browser: PWA terpasang jauh lebih kecil kemungkinannya kena pembersihan
 * storage, dan itu satu-satunya lapis pertahanan sebelum data lapangan hilang
 * sebelum sync. Browser tidak menyediakan cara memaksa, jadi yang bisa
 * dilakukan adalah mendorongnya jelas-jelas dan tidak menyembunyikannya.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

// Didaftarkan saat modul dimuat — event ini terbit lebih awal daripada React.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // tahan agar bisa ditawarkan di tempat yang tepat
  deferred = e as InstallPromptEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((l) => l());
});

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    // iOS Safari memakai properti non-standar.
    || (navigator as { standalone?: boolean }).standalone === true;
}

export function useInstall() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  return {
    standalone: isStandalone(),
    /** Chrome/Android bisa memunculkan dialog install sungguhan. */
    dapatDipasang: deferred !== null,
    pasang: async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      if (!deferred) return 'unavailable';
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      listeners.forEach((l) => l());
      return outcome;
    },
  };
}
