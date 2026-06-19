export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('logitrack:pwa-update'));
          }
        });
      });
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  });
}

export function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => console.warn('Service worker unregister failed', error));
}
