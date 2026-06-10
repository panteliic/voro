import type {
  ResendCodeRequest,
  ResendCodeResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request<TResponse>(path: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export const authApi = {
  login(payload: LoginRequest) {
    return request<LoginResponse>('/auth/login', payload)
  },

  refresh(payload: RefreshTokenRequest) {
    return request<RefreshTokenResponse>('/auth/refresh', payload)
  },

  logout(payload: LogoutRequest) {
    return request<LogoutResponse>('/auth/logout', payload)
  },

  signup(payload: SignupRequest) {
    return request<SignupResponse>('/auth/signup', payload)
  },

  verifyEmail(payload: VerifyEmailRequest) {
    return request<VerifyEmailResponse>('/auth/verify-email', payload)
  },

  resendCode(payload: ResendCodeRequest) {
    return request<ResendCodeResponse>('/auth/resend-code', payload)
  },
}
