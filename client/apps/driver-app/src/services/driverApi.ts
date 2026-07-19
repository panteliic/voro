import type { DashboardResponse, Driver, UpdatePresencePayload } from '../types/driver'
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
