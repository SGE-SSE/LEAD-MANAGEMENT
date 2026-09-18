// ══════════════════════════════════════════════════════════════
// Cratio CRM — Service Worker for Task Push Notifications
// Must be hosted at the SAME path/folder as index.html
// ══════════════════════════════════════════════════════════════

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Show the notification when a push arrives ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '📌 Cratio Reminder', body: event.data ? event.data.text() : 'You have a pending task.' };
  }

  const title = data.title || '📌 Task Reminder';
  const options = {
    body: data.body || 'You have a pending task.',
    icon: data.icon || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4cc.png',
    badge: data.badge || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f514.png',
    tag: data.tag || 'cratio-task',
    renotify: true,
    data: { url: data.url || './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Focus or open the app when the notification is tapped ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
