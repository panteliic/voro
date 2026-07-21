import webpush from 'web-push'
import { env } from '../config/env'
import * as pushRepository from '../repositories/pushRepository'
import { HttpError } from '../utils/httpError'

type PushPayload = {
  body: string
  data?: Record<string, unknown>
  title: string
}

let configured = false

function configurePush() {
  if (configured || !env.webPush.publicKey || !env.webPush.privateKey || !env.webPush.subject) return
  webpush.setVapidDetails(env.webPush.subject, env.webPush.publicKey, env.webPush.privateKey)
  configured = true
}

function isPushEndpoint(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (!env.isProduction && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'))
  } catch {
    return false
  }
}

export async function savePushSubscription(userId: number, payload: unknown, userAgent: string) {
  const subscription = payload as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint.trim() : ''
  const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh.trim() : ''
  const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth.trim() : ''

  if (!isPushEndpoint(endpoint) || !p256dh || !auth || p256dh.length > 512 || auth.length > 512) {
    throw new HttpError(400, 'Push subscription is invalid.')
  }

  await pushRepository.upsertPushSubscription(userId, {
    endpoint,
    p256dh,
    auth,
    userAgent: userAgent.slice(0, 500),
  })
}

export async function removePushSubscription(userId: number, endpointValue: unknown) {
  const endpoint = typeof endpointValue === 'string' ? endpointValue.trim() : ''
  if (!endpoint) throw new HttpError(400, 'Push endpoint is required.')
  await pushRepository.deletePushSubscription(userId, endpoint)
}

export async function sendUserPush(userId: number, payload: PushPayload) {
  configurePush()
  if (!configured) return

  const subscriptions = await pushRepository.listPushSubscriptions(userId)
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload), { TTL: 60 })
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : 0
      if (statusCode === 404 || statusCode === 410) {
        await pushRepository.deletePushSubscriptionByEndpoint(subscription.endpoint)
        return
      }
      console.error('Could not send web push notification.', error)
    }
  }))
}
