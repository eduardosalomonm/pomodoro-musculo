// A complete shell is cached before activation, so one release never mixes with another.
const CACHE = 'pomodoro-squats-v0.7.1';
const SHELL = ['./','index.html','styles.css','boot.js','session-guard.js','app.js','companion.js','release.js','core.js','pose-counter.js','calibration-model.js','camera-guide.js','camera-options.js','figure.js','routines.js','routine-model.js','routine-editor.js','manifest.webmanifest','icon.svg','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
const shellURLs = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path, {cache:'reload'}))))
));
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pomodoro-squats-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const navigate = event.request.mode === 'navigate';
  if (!navigate && !shellURLs.has(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(navigate ? 'index.html' : event.request);
    if (cached) return cached;
    try { return await fetch(event.request); } catch { return Response.error(); }
  })());
});
