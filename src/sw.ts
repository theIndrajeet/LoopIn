/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Immediately claim all clients when the service worker activates
clientsClaim();

// Clean up any outdated caches from previous versions
cleanupOutdatedCaches();

// Skip waiting to activate immediately
self.skipWaiting();

// Precache and serve all the assets managed by Vite build
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for Supabase API calls
registerRoute(
  /^https:\/\/hvgzchzobsrnhfvcwpne\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'Loop Level',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data || {},
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  let urlToOpen = '/dashboard';

  if (event.notification.data) {
    const { type, action_url } = event.notification.data;

    if (action_url) {
      urlToOpen = action_url;
    } else if (type === 'friend_request' || type === 'friend_accepted') {
      urlToOpen = '/friends';
    } else if (type === 'habit_reminder' || type === 'streak_warning') {
      urlToOpen = '/dashboard';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Log when the service worker is installed
self.addEventListener('install', () => {
  console.log('[SW] Service worker installed');
});

// Log when the service worker is activated
self.addEventListener('activate', () => {
  console.log('[SW] Service worker activated');
});



