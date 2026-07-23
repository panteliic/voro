import * as operationsRepository from '../repositories/operationsRepository'
import { publishUserNotification } from './realtimeService'
import { sendUserPush } from './pushService'

export async function notifyUser(
  userId: number,
  payload: { type: string; title: string; body: string; data?: Record<string, unknown> },
) {
  const notification = await operationsRepository.createUserNotification(userId, payload)
  if (!notification) return null

  publishUserNotification(userId, notification)
  void sendUserPush(userId, {
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, notificationId: notification.id },
  }).catch((error) => console.error('Could not queue web push notification.', error))
  return notification
}

export async function notifyUserOnceCourierIsNearby(userId: number, orderId: number, distanceMeters: number) {
  const notification = await operationsRepository.createCourierNearbyNotification(userId, orderId, distanceMeters)
  if (!notification) return null

  publishUserNotification(userId, notification)
  void sendUserPush(userId, {
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, notificationId: notification.id },
  }).catch((error) => console.error('Could not queue web push notification.', error))
  return notification
}
