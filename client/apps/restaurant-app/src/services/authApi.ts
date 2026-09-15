import type { AuthUser, LoginPayload, SetupPasswordPayload } from '../types/auth'
import { publicRequest } from './apiClient'

export async function loginRestaurant(payload: LoginPayload) {
  const data = await publicRequest<{
    accessToken: string
    refreshToken: string
    user: AuthUser
  }>('/restaurant/auth/login', payload)

  return data
}

export async function setupRestaurantPassword(payload: SetupPasswordPayload) {
  await publicRequest('/restaurant/auth/setup-password', payload)
}

export function requestRestaurantPasswordReset(email: string) {
  return publicRequest<{ message: string; email: string; resetUrl?: string }>(
    '/restaurant/auth/request-password-reset',
    { email },
  )
}
