/* ШТАБ — офлайн-оболочка: сеть в приоритете, кэш как запас */
const CACHE = 'shtab-v2';
const SHELL = ['./', 'index.html', 'app.html', 'css/app.css', 'icon.svg', 'manifest.webmanifest',
  'js/core.js', 'js/seed.js', 'js/views-pulse.js', 'js/views-projects.js', 'js/views-finance.js', 'js/views-personal.js', 'js/views-journal.js', 'js/views-team.js', 'js/views-admin.js', 'js/main.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // личные данные не кэшируем
  e.respondWith(
    fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('app.html')))
  );
});
