import type { DashboardResponse, Delivery, Driver, DriverRoute, UpdatePresencePayload } from '../types/driver'
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
) {
  return request<{ delivery: { id: number; status: string } }>(`/driver/deliveries/${deliveryId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getDriverDeliveryRoute(token: string, deliveryId: number) {
  return request<DriverRoute>(`/driver/deliveries/${deliveryId}/route`, token)
}
