import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'
import * as authRepository from '../repositories/authRepository'
import type {
  ChangePasswordPayload,
  LoginPayload,
  RefreshTokenPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  SignupPayload,
  VerifyPasswordResetCodePayload,
  VerifyEmailPayload,
} from '../types/auth'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'
import { passwordValidationMessage, sanitizePlainText } from '../utils/securityInput'
import { sendOtpEmail, sendPasswordResetEmail } from './mailService'

function devCode(code: string) {
  return env.isProduction || env.smtp.enabled ? undefined : code
}

type RefreshTokenClaims = {
  userId: number
  email: string
  role?: string
  type: 'refresh'
}

type PasswordResetTokenClaims = {
  userId: number
  email: string
  type: 'password_reset'
}

type Auth0StateClaims = {
  provider: Auth0Provider
  returnTo: string
  type: 'auth0_state'
}

type Auth0Provider = 'google' | 'facebook'

type Auth0UserInfo = {
  email?: string
  email_verified?: boolean
  name?: string
  nickname?: string
}

const auth0Connections: Record<Auth0Provider, string> = {
  google: 'google-oauth2',
  facebook: 'facebook',
}

function getAuth0Config() {
  if (!env.auth0.domain || !env.auth0.clientId || !env.auth0.clientSecret) {
    throw new HttpError(500, 'Auth0 is not configured.')
  }

  return env.auth0
}

function isAuth0Provider(provider: string): provider is Auth0Provider {
  return provider === 'google' || provider === 'facebook'
}

function publicUser(user: {
  id: number
  name: string
  email: string
  roleName: string
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roleName,
  }
}

function signAccessToken(payload: { userId: number; email: string; role: string }) {
  return jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
  })
}

function signRefreshToken(payload: { userId: number; email: string; role: string }) {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtSecret, {
    expiresIn: Math.floor(env.refreshTokenTtlMs / 1000),
    jwtid: crypto.randomUUID(),
  })
}

function signPasswordResetToken(payload: { userId: number; email: string }) {
  return jwt.sign({ ...payload, type: 'password_reset' }, env.jwtSecret, {
    expiresIn: '10m',
    jwtid: crypto.randomUUID(),
  })
}

function signAuth0State(payload: { provider: Auth0Provider; returnTo: string }) {
  return jwt.sign({ ...payload, type: 'auth0_state' }, env.jwtSecret, {
    expiresIn: '10m',
    jwtid: crypto.randomUUID(),
  })
}

async function issueTokenPair(user: { id: number; email: string; roleName: string }) {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.roleName,
  })
  const refreshToken = signRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.roleName,
  })
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10)

  const refreshTokenId = await authRepository.saveRefreshToken({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
  })

  return { accessToken, refreshToken, refreshTokenId }
}

function verifyRefreshToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret, { algorithms: ['HS256'] }) as RefreshTokenClaims

    if (decoded.type !== 'refresh' || !decoded.userId || !decoded.email) {
      throw new HttpError(401, 'Invalid refresh token.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid refresh token.')
  }
}

function verifyPasswordResetToken(resetToken: string) {
  try {
    const decoded = jwt.verify(resetToken, env.jwtSecret, { algorithms: ['HS256'] }) as PasswordResetTokenClaims

    if (decoded.type !== 'password_reset' || !decoded.userId || !decoded.email) {
      throw new HttpError(401, 'Invalid password reset token.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid password reset token.')
  }
}

function verifyAuth0State(state: string) {
  try {
    const decoded = jwt.verify(state, env.jwtSecret, { algorithms: ['HS256'] }) as Auth0StateClaims

    if (decoded.type !== 'auth0_state' || !isAuth0Provider(decoded.provider) || !decoded.returnTo) {
      throw new HttpError(401, 'Invalid Auth0 state.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid Auth0 state.')
  }
}

async function issueVerificationCode(userId: number, email: string) {
  const code = generateOtp()
  const codeHash = await bcrypt.hash(code, 10)

  await authRepository.saveVerificationCode({
    userId,
    codeHash,
    expiresAt: new Date(Date.now() + env.otpTtlMs),
  })
  await sendOtpEmail(email, code)

  return code
}

async function issuePasswordResetCode(userId: number, email: string) {
  const code = generateOtp()
  const codeHash = await bcrypt.hash(code, 10)

  await authRepository.savePasswordResetCode({
    userId,
    codeHash,
    expiresAt: new Date(Date.now() + env.otpTtlMs),
  })
  await sendPasswordResetEmail(email, code)

  return code
}

export async function signup(payload: SignupPayload) {
  const { email, password } = payload
  const name = sanitizePlainText(payload.name, 120)

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email, and password are required.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpError(400, 'Enter a valid email address.')
  }

  const passwordError = passwordValidationMessage(password)
  if (passwordError) {
    throw new HttpError(400, passwordError)
  }

  const existingUser = await authRepository.findUserByEmail(email)

  if (existingUser?.emailVerified) {
    throw new HttpError(409, 'An account with this email already exists.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = existingUser
    ? await authRepository.updateUnverifiedUser({
        userId: existingUser.id,
        name,
        passwordHash,
      })
    : await authRepository.createUser({ name, email, passwordHash })

  if (!user) {
    throw new HttpError(500, 'Could not create account.')
  }

  const code = await issueVerificationCode(user.id, user.email)

  return {
    message: 'Verification code sent.',
    email: user.email,
    devCode: devCode(code),
  }
}

export async function resendCode(email: string) {
  const user = await authRepository.findUserByEmail(email)

  if (!user || user.emailVerified) {
    throw new HttpError(404, 'No pending signup found for this email.')
  }

  const code = await issueVerificationCode(user.id, user.email)

  return {
    message: 'Verification code resent.',
    email: user.email,
    devCode: devCode(code),
  }
}

export async function verifyEmail(payload: VerifyEmailPayload) {
  const { email, code } = payload
  const user = await authRepository.findUserByEmail(email)
  const verificationCode = await authRepository.findActiveVerificationCode(email)

  if (!user || !verificationCode) {
    throw new HttpError(404, 'No pending signup found for this email.')
  }

  if (new Date() > verificationCode.expiresAt) {
    await authRepository.consumeVerificationCode(verificationCode.id)
    throw new HttpError(410, 'Verification code expired. Please request a new one.')
  }

  const isCodeValid = await bcrypt.compare(code, verificationCode.codeHash)

  if (!isCodeValid) {
    const attempts = await authRepository.recordVerificationCodeAttempt(verificationCode.id)
    if (attempts >= 5) await authRepository.consumeVerificationCode(verificationCode.id)
    throw new HttpError(400, 'Invalid verification code.')
  }

  await authRepository.consumeVerificationCode(verificationCode.id)
  const verifiedUser = await authRepository.verifyUserEmail(user.id)

  if (!verifiedUser) {
    throw new HttpError(500, 'Could not verify email.')
  }

  return { message: 'Email verified. Account created.', email: verifiedUser.email }
}

export async function login(payload: LoginPayload) {
  const { email, password } = payload

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required.')
  }

  const user = await authRepository.findUserByEmail(email)

  if (!user) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  if (!user.emailVerified) {
    throw new HttpError(403, 'Please verify your email before signing in.')
  }

  if (!user.isActive) {
    throw new HttpError(403, 'This account has been blocked.')
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  const tokenPair = await issueTokenPair(user)

  return {
    message: 'Signed in.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: publicUser(user),
  }
}

export function getAuth0LoginUrl(provider: string) {
  if (!isAuth0Provider(provider)) {
    throw new HttpError(404, 'Unsupported social login provider.')
  }

  const auth0 = getAuth0Config()
  const state = signAuth0State({ provider, returnTo: auth0.clientRedirectUrl })
  const url = new URL(`https://${auth0.domain}/authorize`)

  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', auth0.clientId)
  url.searchParams.set('redirect_uri', auth0.callbackUrl)
  url.searchParams.set('scope', 'openid profile email')
  url.searchParams.set('connection', auth0Connections[provider])
  url.searchParams.set('state', state)

  return url.toString()
}

export async function auth0Callback(payload: {
  code?: string
  state?: string
  error?: string
  errorDescription?: string
}) {
  if (payload.error) {
    throw new HttpError(401, payload.errorDescription || payload.error)
  }

  if (!payload.code || !payload.state) {
    throw new HttpError(400, 'Auth0 code and state are required.')
  }

  const auth0 = getAuth0Config()
  const state = verifyAuth0State(payload.state)
  const tokenResponse = await fetch(`https://${auth0.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: auth0.clientId,
      client_secret: auth0.clientSecret,
      code: payload.code,
      redirect_uri: auth0.callbackUrl,
    }),
  })
  const tokenData = (await tokenResponse.json()) as { access_token?: string; error_description?: string }

  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new HttpError(401, tokenData.error_description || 'Could not complete Auth0 login.')
  }

  const userInfoResponse = await fetch(`https://${auth0.domain}/userinfo`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = (await userInfoResponse.json()) as Auth0UserInfo

  if (!userInfoResponse.ok || !userInfo.email) {
    throw new HttpError(401, 'Auth0 did not return an email address.')
  }

  if (userInfo.email_verified !== true) {
    throw new HttpError(403, 'Auth0 email address is not verified.')
  }

  const email = userInfo.email.toLowerCase()
  const name = userInfo.name || userInfo.nickname || email.split('@')[0]
  let user = await authRepository.findUserByEmail(email)

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10)
    user = await authRepository.createUser({ name, email, passwordHash })
  }

  if (!user.emailVerified) {
    const verifiedUser = await authRepository.verifyUserEmail(user.id)

    if (verifiedUser) {
      user = verifiedUser
    }
  }

  if (!user.isActive) {
    throw new HttpError(403, 'This account has been blocked.')
  }

  const tokenPair = await issueTokenPair(user)

  return {
    returnTo: state.returnTo,
    message: 'Signed in with Auth0.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: publicUser(user),
  }
}

export async function refresh(payload: RefreshTokenPayload) {
  const { refreshToken } = payload

  if (!refreshToken) {
    throw new HttpError(400, 'Refresh token is required.')
  }

  const decoded = verifyRefreshToken(refreshToken)
  const user = await authRepository.findUserById(decoded.userId)

  if (!user || !user.emailVerified || !user.isActive) {
    throw new HttpError(401, 'Invalid refresh token.')
  }

  const activeTokens = await authRepository.findActiveRefreshTokens(user.id)
  let matchedTokenId: number | null = null

  for (const activeToken of activeTokens) {
    if (await bcrypt.compare(refreshToken, activeToken.tokenHash)) {
      matchedTokenId = activeToken.id
      break
    }
  }

  if (!matchedTokenId) {
    throw new HttpError(401, 'Invalid refresh token.')
  }

  const tokenPair = await issueTokenPair(user)
  await authRepository.revokeRefreshToken(matchedTokenId, tokenPair.refreshTokenId)

  return {
    message: 'Token refreshed.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: publicUser(user),
  }
}

export async function logout(payload: RefreshTokenPayload) {
  const { refreshToken } = payload

  if (!refreshToken) {
    return { message: 'Signed out.' }
  }

  const decoded = verifyRefreshToken(refreshToken)
  const activeTokens = await authRepository.findActiveRefreshTokens(decoded.userId)

  for (const activeToken of activeTokens) {
    if (await bcrypt.compare(refreshToken, activeToken.tokenHash)) {
      await authRepository.revokeRefreshToken(activeToken.id)
      break
    }
  }

  return { message: 'Signed out.' }
}

export async function requestPasswordReset(payload: RequestPasswordResetPayload) {
  const { email } = payload

  if (!email) {
    throw new HttpError(400, 'Email is required.')
  }

  const user = await authRepository.findUserByEmail(email)

  if (!user || !user.emailVerified) {
    return { message: 'If that email exists, a password reset code has been sent.', email }
  }

  const code = await issuePasswordResetCode(user.id, user.email)

  return {
    message: 'Password reset code sent.',
    email: user.email,
    devCode: devCode(code),
  }
}

export async function verifyPasswordResetCode(payload: VerifyPasswordResetCodePayload) {
  const { email, code } = payload

  if (!email || !code) {
    throw new HttpError(400, 'Email and reset code are required.')
  }

  const user = await authRepository.findUserByEmail(email)
  const resetCode = await authRepository.findActivePasswordResetCode(email)

  if (!user || !resetCode) {
    throw new HttpError(404, 'No active password reset code found for this email.')
  }

  if (new Date() > resetCode.expiresAt) {
    await authRepository.consumePasswordResetCode(resetCode.id)
    throw new HttpError(410, 'Password reset code expired. Please request a new one.')
  }

  const isCodeValid = await bcrypt.compare(code, resetCode.codeHash)

  if (!isCodeValid) {
    const attempts = await authRepository.recordPasswordResetCodeAttempt(resetCode.id)
    if (attempts >= 5) await authRepository.consumePasswordResetCode(resetCode.id)
    throw new HttpError(400, 'Invalid password reset code.')
  }

  await authRepository.consumePasswordResetCode(resetCode.id)

  return {
    message: 'Password reset code verified.',
    email: user.email,
    resetToken: signPasswordResetToken({ userId: user.id, email: user.email }),
  }
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { resetToken, password } = payload

  if (!resetToken || !password) {
    throw new HttpError(400, 'Reset token and new password are required.')
  }

  const passwordError = passwordValidationMessage(password)
  if (passwordError) {
    throw new HttpError(400, passwordError)
  }

  const decoded = verifyPasswordResetToken(resetToken)
  const user = await authRepository.findUserById(decoded.userId)

  if (!user || !user.isActive || user.email !== decoded.email) {
    throw new HttpError(401, 'Invalid password reset token.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await authRepository.updateUserPassword({ userId: user.id, passwordHash })
  await authRepository.revokeAllUserRefreshTokens(user.id)

  return { message: 'Password updated. You can sign in now.', email: user.email }
}

export async function changePassword(payload: ChangePasswordPayload) {
  const { currentPassword, newPassword, userId } = payload

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'Current password and new password are required.')
  }

  const passwordError = passwordValidationMessage(newPassword)
  if (passwordError) {
    throw new HttpError(400, passwordError)
  }

  if (currentPassword === newPassword) {
    throw new HttpError(400, 'New password must be different from current password.')
  }

  const user = await authRepository.findUserById(userId)

  if (!user || !user.emailVerified || !user.isActive) {
    throw new HttpError(404, 'User not found.')
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)

  if (!isCurrentPasswordValid) {
    throw new HttpError(401, 'Current password is incorrect.')
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await authRepository.updateUserPassword({ userId: user.id, passwordHash })
  await authRepository.revokeAllUserRefreshTokens(user.id)

  return { message: 'Password updated. Please sign in again.', email: user.email }
}
