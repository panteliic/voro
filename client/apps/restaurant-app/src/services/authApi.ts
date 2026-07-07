import type { AuthUser, LoginPayload, SetupPasswordPayload } from '../types/auth'
import { publicRequest } from './apiClient'

export async function loginRestaurant(payload: LoginPayload) {
  const data = await publicRequest<{
    accessToken: string
    user: AuthUser
  }>('/auth/login', payload)

  if (data.user.role !== 'restaurant') {
    throw new Error('This console is only for restaurant operators.')
  }

  return data
}

export async function setupRestaurantPassword(payload: SetupPasswordPayload) {
  const verified = await publicRequest<{ resetToken: string }>(
    '/auth/verify-password-reset-code',
    {
      email: payload.email,
      code: payload.setupCode,
    },
  )

  await publicRequest('/auth/reset-password', {
    resetToken: verified.resetToken,
    password: payload.password,
  })
}
