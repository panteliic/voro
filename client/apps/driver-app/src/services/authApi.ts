import type { AuthUser, LoginPayload, SetupPasswordPayload } from '../types/auth'
import { publicRequest } from './apiClient'

export async function loginDriver(payload: LoginPayload) {
  const data = await publicRequest<{
    accessToken: string
    refreshToken: string
    user: AuthUser
  }>('/auth/login', payload)

  if (data.user.role !== 'courier') {
    throw new Error('This app is only for driver accounts.')
  }

  return data
}

export async function setupDriverPassword(payload: SetupPasswordPayload) {
  if (payload.resetToken) {
    await publicRequest('/auth/reset-password', {
      resetToken: payload.resetToken,
      password: payload.password,
    })
    return
  }
  const verified = await publicRequest<{ resetToken: string }>('/auth/verify-password-reset-code', {
    email: payload.email,
    code: payload.setupCode,
  })

  await publicRequest('/auth/reset-password', {
    resetToken: verified.resetToken,
    password: payload.password,
  })
}

export function requestDriverPasswordReset(email: string) {
  return publicRequest<{ message: string; email: string; resetUrl?: string }>(
    '/auth/request-password-reset',
    { email },
  )
}
