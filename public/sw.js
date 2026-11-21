/**
 * public/sw.js
 * Service Worker for Family Care Hub:
 * 1. Web Push notifications display & click handling
 * 2. PWA app shell and offline dashboard caching
 * 3. Security guardrail: Never caches sensitive document URLs or private Blob downloads
 */

const CACHE_NAME = 'fch-offline-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some static icons are not yet present in dev
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch handler: Network-first for navigation, falling back to cache if offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strict privacy rule: Never cache document URLs, API Blob responses, or sensitive endpoints
  if (
    url.pathname.startsWith('/api/documents') ||
    url.pathname.includes('/documents/') ||
    url.pathname.startsWith('/api/jobs')
  ) {
    return;
  }

  // For HTML page navigation (e.g. Status board, Tasks), try network then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          return new Response(
            '<html><body><h1>Offline</h1><p>You are offline. Showing last saved care info when available.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }),
    );
    return;
  }

  // Cache-first for static icons and assets
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      }),
    );
  }
});

// Web Push event listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'Family Care Hub',
    body: 'You have a new care notification.',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'fch-notification',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
