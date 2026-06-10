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
