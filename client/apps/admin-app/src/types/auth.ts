import type { AdminUser } from './user'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type AuthResponse = {
  message: string
  accessToken: string
  refreshToken?: string
  user: AuthUser
}

export type AdminMeResponse = {
  user: AdminUser
}
