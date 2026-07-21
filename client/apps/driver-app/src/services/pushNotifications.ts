import { registerDriverPushSubscription } from './driverApi'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function vapidKeyToBytes(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export async function enableDriverPushNotifications(token: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Push notifications are not supported by this browser.')
  }
  if (!vapidPublicKey) {
    throw new Error('Push notifications are not configured yet.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(vapidPublicKey) })
  await registerDriverPushSubscription(token, subscription.toJSON())
  return 'Push notifications are enabled on this device.'
}
