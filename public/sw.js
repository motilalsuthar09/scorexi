// ============================================================
// ScoreXI Service Worker — PWA + Push Notifications
// Place this file at: public/sw.js
// ============================================================

const CACHE_NAME = 'scorexi-v1';
const STATIC_ASSETS = [
  '/',
  '/matches',
  '/leaderboard',
  '/players',
  '/manifest.json',
];

// ── Install: cache static shell ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network for API calls and auth
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for pages
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/'));  // fallback to homepage
    })
  );
});

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const title   = data.title   ?? 'ScoreXI';
  const body    = data.body    ?? 'Match update!';
  const icon    = data.icon    ?? '/icons/icon-192.png';
  const badge   = data.badge   ?? '/icons/badge-72.png';
  const url     = data.url     ?? '/';
  const tag     = data.tag     ?? 'scorexi-update';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'view',    title: 'View Score' },
        { action: 'dismiss', title: 'Dismiss'    },
      ],
    })
  );
});

// ── Notification click ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
