import type { AdminOverview, AdminStats } from '../types/admin'
import { apiRequest } from './apiClient'

export function getOverview() {
  return apiRequest<AdminOverview>('/admin/overview')
}

export function getDashboardStats() {
  return apiRequest<{ stats: AdminStats }>('/admin/dashboard/stats')
}
