self.addEventListener('push', (event) => {
  let payload = { title: 'Voro', body: 'You have a new update.', data: {} }
  try { payload = { ...payload, ...event.data.json() } } catch { /* Empty push payload. */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    data: payload.data,
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: payload.data?.orderId ? `order-${payload.data.orderId}` : undefined,
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const orderId = event.notification.data?.orderId
  const target = orderId ? `/orders?order=${encodeURIComponent(orderId)}` : '/notifications'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows[0]
    return existing ? existing.focus().then(() => existing.navigate(target)) : clients.openWindow(target)
  }))
})
