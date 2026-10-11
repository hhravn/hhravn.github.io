const CACHE = 'brew-v1';
const FILES = [
  './', './index.html', './styles.css', './app.js', './brew-screen.js', './recipe.js', './brew-view.js',
  './cues.js', './storage.js', './manifest.webmanifest', './icon.svg', './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('brew-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    const network = fetch(event.request).then(response => {
      if (response.ok) cache.put(url.pathname, response.clone());
      return response;
    });
    if (!cached) return network;
    event.waitUntil(network.catch(error => console.warn('background refresh failed', error)));
    return cached;
  }));
});
