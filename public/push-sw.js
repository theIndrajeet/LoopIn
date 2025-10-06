// Push notification service worker handlers
// This file contains custom push notification logic

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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
