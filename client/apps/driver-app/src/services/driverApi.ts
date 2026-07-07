import type { DashboardResponse } from '../types/driver'
import { request } from './apiClient'

export function getDriverDashboard(token: string) {
  return request<DashboardResponse>('/driver/me', token)
}
