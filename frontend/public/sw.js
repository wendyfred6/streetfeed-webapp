// Geen caching van de HTML-shell of assets: Vite geeft elke build nieuwe
// bestandsnamen en oude bundels worden bij elke deploy overschreven. Een
// gecachete oude index.html verwijst dan naar een JS-bestand dat niet meer
// bestaat -> 404 -> de app start nooit op. nginx regelt browsercaching van
// hashed assets al correct, dus deze SW doet alleen nog push-notificaties.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  const title = data.title || 'Streetfeed';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.category || 'general',
    data: { url: data.url || '/' },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      const existing = ws.find(w => w.url.includes(self.location.origin));
      if (existing) {
        existing.postMessage({ type: 'navigate', url });
        return existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});
