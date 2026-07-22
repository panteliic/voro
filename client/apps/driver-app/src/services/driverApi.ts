import type { DashboardResponse, Delivery, Driver, DriverNotification, DriverOrderMessage, DriverRoute, UpdatePresencePayload } from '../types/driver'
import { request } from './apiClient'

export function getDriverDashboard(token: string) {
  return request<DashboardResponse>('/driver/me', token)
}

export function updateDriverPresence(token: string, payload: UpdatePresencePayload) {
  return request<{ driver: Driver }>('/driver/presence', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function acceptDeliveryOffer(token: string, offerId: number) {
  return request<{ delivery: Delivery | null }>(`/driver/offers/${offerId}/accept`, token, {
    method: 'POST',
  })
}

export function declineDeliveryOffer(token: string, offerId: number) {
  return request<{ declined: true }>(`/driver/offers/${offerId}/decline`, token, {
    method: 'POST',
  })
}

export function updateDeliveryStatus(
  token: string,
  deliveryId: number,
  status: 'picked_up' | 'on_the_way' | 'delivered',
  proof: { proofNote?: string } = {},
) {
  return request<{ delivery: { id: number; status: string } }>(`/driver/deliveries/${deliveryId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...proof }),
  })
}

export function withdrawFromDelivery(token: string, deliveryId: number, reason: string) {
  return request<{ withdrawn: true; orderId: number }>(`/driver/deliveries/${deliveryId}/withdraw`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function getDriverDeliveryRoute(token: string, deliveryId: number) {
  return request<DriverRoute>(`/driver/deliveries/${deliveryId}/route`, token)
}

export function getDriverOrderMessages(token: string, orderId: number) {
  return request<{ messages: DriverOrderMessage[] }>(`/driver/orders/${orderId}/messages`, token)
}

export function sendDriverOrderMessage(token: string, orderId: number, body: string) {
  return request<{ message: DriverOrderMessage }>(`/driver/orders/${orderId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function getDriverNotifications(token: string) {
  return request<{ notifications: DriverNotification[]; unreadCount: number }>('/driver/notifications', token)
}

export function readDriverNotification(token: string, notificationId: number) {
  return request<{ read: true }>(`/driver/notifications/${notificationId}/read`, token, {
    method: 'PATCH',
    body: '{}',
  })
}

export function registerDriverPushSubscription(token: string, subscription: PushSubscriptionJSON) {
  return request<{ subscribed: true }>('/driver/push-subscriptions', token, {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}
