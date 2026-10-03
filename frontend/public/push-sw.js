/* Push-only service worker: never intercepts or caches application/API requests. */
const STATE_CACHE = 'scgf-push-device-v1';
const STATE_URL = '/push-device-state';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'PUSH_OWNER') return;
  event.waitUntil((async () => {
    const cache = await caches.open(STATE_CACHE);
    await cache.put(STATE_URL, new Response(JSON.stringify({userId: event.data.userId})));
    // Remove notifications from the previous account on shared devices.
    for (const notification of await self.registration.getNotifications()) notification.close();
    event.ports[0]?.postMessage({ok: true});
  })());
});
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data.json(); } catch (_) { return; }
    const state = await (await caches.open(STATE_CACHE)).match(STATE_URL);
    const owner = state && (await state.json()).userId;
    if (!owner || owner !== payload.userId) return;
    await self.registration.showNotification(payload.title || 'SC Group Finder', {
      body: payload.body, tag: payload.tag, icon: '/icon-192.png',
      data: {url: payload.url, id: payload.id},
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const path = ['/orgs', '/admin'].includes(event.notification.data?.url) ? event.notification.data.url : '/orgs';
    const url = new URL(path, self.location.origin).href;
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.navigate(url);
      await client.focus();
      return;
    }
    await self.clients.openWindow(url);
  })());
});