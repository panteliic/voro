export type SignupRequest = {
  name: string
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthUser = {
  id: number
  name: string
  email: string
  phone?: string
}

export type LoginResponse = {
  message: string
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type RefreshTokenRequest = {
  refreshToken: string
}

export type RefreshTokenResponse = LoginResponse

export type LogoutRequest = {
  refreshToken: string
}

export type LogoutResponse = {
  message: string
}

export type RequestPasswordResetRequest = {
  email: string
}

export type RequestPasswordResetResponse = {
  message: string
  email: string
  devCode?: string
}

export type ResetPasswordRequest = {
  resetToken: string
  password: string
}

export type ResetPasswordResponse = {
  message: string
  email: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type ChangePasswordResponse = {
  message: string
  email: string
}

export type VerifyPasswordResetCodeRequest = {
  email: string
  code: string
}

export type VerifyPasswordResetCodeResponse = {
  message: string
  email: string
  resetToken: string
}

export type SignupResponse = {
  message: string
  email: string
  devCode?: string
}

export type VerifyEmailRequest = {
  email: string
  code: string
}

export type VerifyEmailResponse = {
  message: string
  email: string
}

export type ResendCodeRequest = {
  email: string
}

export type ResendCodeResponse = {
  message: string
  email: string
  devCode?: string
}
