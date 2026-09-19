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

// ── Config for direct REST calls (safe to expose — same public key used by the app) ──
const SUPA_URL = 'https://btzkefnkuouwbyzcebsd.supabase.co';
const SUPA_KEY = 'sb_publishable_X5uX19zEqxl5yQfGKXknmg_6bPQ9ZbS';

// ── Show the notification when a push arrives ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '📌 Cratio Reminder', body: event.data ? event.data.text() : 'You have a pending task.' };
  }

  const title = data.title || '📌 Task Reminder';
  const hasTask = !!data.taskId;
  const options = {
    body: data.body || 'You have a pending task.',
    icon: data.icon || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4cc.png',
    badge: data.badge || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f514.png',
    tag: data.tag || 'cratio-task',
    renotify: true,
    data: { url: data.url || './', taskId: data.taskId || null },
    actions: hasTask ? [
      { action: 'done',   title: '✅ Mark Done' },
      { action: 'snooze', title: '⏰ Snooze 1 Day' }
    ] : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

async function markTaskDoneFromSW(taskId) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ completed: true, updated_at: new Date().toISOString() })
    });
  } catch (e) { console.error('SW markTaskDone failed', e); }
}

async function snoozeTaskFromSW(taskId) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ due_date: dueDate, last_notified_date: null, updated_at: new Date().toISOString() })
    });
  } catch (e) { console.error('SW snoozeTask failed', e); }
}

// ── Handle taps: action buttons act directly, a plain tap opens/focuses the app ──
self.addEventListener('notificationclick', (event) => {
  const taskId = event.notification.data && event.notification.data.taskId;
  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  if (event.action === 'done' && taskId) {
    event.notification.close();
    event.waitUntil(markTaskDoneFromSW(taskId));
    return;
  }
  if (event.action === 'snooze' && taskId) {
    event.notification.close();
    event.waitUntil(snoozeTaskFromSW(taskId));
    return;
  }

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
