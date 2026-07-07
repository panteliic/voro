import type { AdminUser } from '../types/user'
import { apiRequest } from './apiClient'

export function listUsers() {
  return apiRequest<{ users: AdminUser[] }>('/admin/users')
}

export function getUser(userId: number) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${userId}`)
}

export function updateUserStatus(userId: number, isActive: boolean) {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}
