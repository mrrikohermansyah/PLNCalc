/* Service worker PLNCalc. Ditulis sebagai script biasa (bukan modul) karena Vite
   menyalakan folder public/ apa adanya ke dist/. __APP_VERSION__ diganti oleh plugin
   swVersionStamp saat build, sehingga setiap rilis memakai nama cache baru. */
const VERSION = '__APP_VERSION__';
const SHELL_CACHE = `plncalc-shell-${VERSION}`;
const RUNTIME_CACHE = `plncalc-runtime-${VERSION}`;

const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_FILES.map((href) =>
          fetch(href)
            .then((res) => (res.ok ? cache.put(href, res) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  return response && response.ok && response.type === 'basic';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi: jaringan dulu supaya versi baru langsung dipakai, cache saat offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match('./index.html', { cacheName: SHELL_CACHE })
            .then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Aset hasil build memiliki hash pada namanya: aman disimpan selamanya.
  const immutable = url.pathname.includes('/assets/');
  const cacheName = immutable ? SHELL_CACHE : RUNTIME_CACHE;

  event.respondWith(
    caches.match(request, { cacheName }).then((cached) => {
      if (cached && immutable) return cached;

      return fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(cacheName).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});
