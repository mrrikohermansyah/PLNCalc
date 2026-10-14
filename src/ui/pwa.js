let reloadPrompted = false;

export async function registerServiceWorker({ onUpdate } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!import.meta.env.PROD) return null;

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' && navigator.serviceWorker.controller) {
          if (!reloadPrompted) {
            reloadPrompted = true;
            onUpdate?.();
          }
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloadPrompted) {
        reloadPrompted = true;
        onUpdate?.();
      }
    });

    return registration;
  } catch (err) {
    console.warn('Service worker gagal didaftarkan:', err);
    return null;
  }
}
