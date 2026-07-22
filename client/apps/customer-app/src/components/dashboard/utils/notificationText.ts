import type { CustomerNotification } from '../../../types/customer'

type Translate = (key: string, values?: Record<string, string | number>) => string

function orderIdFrom(notification: CustomerNotification) {
  const value = notification.data.orderId
  const orderId = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null
}

/**
 * Standard notification types contain stable data (the order and status).
 * Use that data to render delivery and chat notifications in the current app
 * language, including older records whose stored copy is in English.
 */
export function customerNotificationText(notification: CustomerNotification, t: Translate) {
  const orderId = orderIdFrom(notification)
  if (!orderId) return { title: notification.title, body: notification.body }

  if (notification.type === 'new_message') {
    return {
      title: t('activity.newMessageTitle', { id: orderId }),
      body: notification.body,
    }
  }

  if (notification.type === 'courier_reassignment') {
    return {
      title: t('activity.newCourierTitle', { id: orderId }),
      body: t('activity.newCourierBody'),
    }
  }

  if (notification.type === 'courier_nearby') {
    return {
      title: t('activity.courierNearbyTitle', { id: orderId }),
      body: t('activity.courierNearbyBody'),
    }
  }

  if (notification.type === 'delivery_status') {
    const status = notification.data.status
    if (status === 'picked_up') {
      return {
        title: t('activity.pickedUpTitle', { id: orderId }),
        body: t('activity.pickedUpBody'),
      }
    }
    if (status === 'on_the_way') {
      return {
        title: t('activity.onTheWayTitle', { id: orderId }),
        body: t('activity.onTheWayBody'),
      }
    }
    if (status === 'delivered') {
      return {
        title: t('activity.deliveredTitle', { id: orderId }),
        body: t('activity.deliveredBody'),
      }
    }
  }

  return { title: notification.title, body: notification.body }
}
