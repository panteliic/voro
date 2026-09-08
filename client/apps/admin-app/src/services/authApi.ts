import type {
  AdminMeResponse,
  AuthResponse,
  LoginPayload,
} from '../types/auth'
import { apiRequest } from './apiClient'

export function loginAdmin(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminMe() {
  return apiRequest<AdminMeResponse>('/admin/me')
}
