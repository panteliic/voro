import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'
import * as authRepository from '../repositories/authRepository'
import type { LoginPayload, RefreshTokenPayload, SignupPayload, VerifyEmailPayload } from '../types/auth'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'
import { sendOtpEmail } from './mailService'

function devCode(code: string) {
  return env.isProduction || env.smtp.enabled ? undefined : code
}

type RefreshTokenClaims = {
  userId: number
  email: string
  type: 'refresh'
}

function signAccessToken(payload: { userId: number; email: string }) {
  return jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
  })
}

function signRefreshToken(payload: { userId: number; email: string }) {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtSecret, {
    expiresIn: Math.floor(env.refreshTokenTtlMs / 1000),
    jwtid: crypto.randomUUID(),
  })
}

async function issueTokenPair(user: { id: number; email: string }) {
  const accessToken = signAccessToken({ userId: user.id, email: user.email })
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email })
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
    const decoded = jwt.verify(refreshToken, env.jwtSecret) as RefreshTokenClaims

    if (decoded.type !== 'refresh' || !decoded.userId || !decoded.email) {
      throw new HttpError(401, 'Invalid refresh token.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid refresh token.')
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

export async function signup(payload: SignupPayload) {
  const { name, email, password } = payload

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email, and password are required.')
  }

  if (!email.includes('@')) {
    throw new HttpError(400, 'Enter a valid email address.')
  }

  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
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

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  const tokenPair = await issueTokenPair(user)

  return {
    message: 'Signed in.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  }
}

export async function refresh(payload: RefreshTokenPayload) {
  const { refreshToken } = payload

  if (!refreshToken) {
    throw new HttpError(400, 'Refresh token is required.')
  }

  const decoded = verifyRefreshToken(refreshToken)
  const user = await authRepository.findUserById(decoded.userId)

  if (!user || !user.emailVerified) {
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
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
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
