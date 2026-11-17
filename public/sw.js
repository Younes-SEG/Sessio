// Command's service worker: makes the site installable and shows a short offline notice.
// Privacy (shared phones): it never stores pages, API responses or anything signed in.
// The only cached file is the static, public /offline.html. While the device is online it
// does not touch any request, so sign-in redirects and callbacks behave exactly as without it.
const CACHE = 'command-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' || request.method !== 'GET' || self.navigator.onLine) return;
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((offline) => offline || Response.error()),
    ),
  );
});
