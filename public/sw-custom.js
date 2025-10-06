// Custom service worker handlers for push notifications

// Push event - display notification
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');

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

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data || {},
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event - open app to relevant page
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  let urlToOpen = '/dashboard';

  // Determine URL based on notification type
  if (event.notification.data) {
    const { type, action_url } = event.notification.data;

    if (action_url) {
      urlToOpen = action_url;
    } else if (type === 'friend_request' || type === 'friend_accepted') {
      urlToOpen = '/friends';
    } else if (type === 'habit_reminder') {
      urlToOpen = '/dashboard';
    } else if (type === 'streak_warning') {
      urlToOpen = '/dashboard';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }

      // If app is not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
