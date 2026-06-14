export type User = {
  id: number
  name: string
  email: string
  passwordHash: string
  emailVerified: boolean
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SignupPayload = {
  name: string
  email: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RefreshTokenPayload = {
  refreshToken: string
}

export type RequestPasswordResetPayload = {
  email: string
}

export type ResetPasswordPayload = {
  resetToken: string
  password: string
}

export type VerifyPasswordResetCodePayload = {
  email: string
  code: string
}

export type VerifyEmailPayload = {
  email: string
  code: string
}
