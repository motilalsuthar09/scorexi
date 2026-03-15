// public/sw.js — ScoreXI Service Worker (Offline Scoring)
const CACHE_NAME    = 'scorexi-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

// ── Install ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-first for static Next.js assets
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached ?? fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // Network-first for everything else (including API calls)
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/') ?? new Response('Offline', { status: 503 });
      }
      return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );
});

// ── Push Notifications ────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const { title, body, matchId } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title ?? 'ScoreXI', {
        body:  body ?? 'New ball scored',
        icon:  '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data:  { matchId },
        tag:   `match-${matchId}`,
      })
    );
  } catch {}
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const matchId = event.notification.data?.matchId;
  if (matchId) {
    event.waitUntil(clients.openWindow(`/match/${matchId}`));
  }
});
