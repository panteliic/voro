import type {
  AdminMeResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from '../types/auth'
import { apiRequest } from './apiClient'

export function loginAdmin(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registerFirstAdmin(payload: RegisterPayload) {
  return apiRequest<{ message: string }>('/admin/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminMe() {
  return apiRequest<AdminMeResponse>('/admin/me')
}
