import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import * as restaurantAuthRepository from '../repositories/restaurantAuthRepository'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'
import { passwordValidationMessage } from '../utils/securityInput'
import { assertEmailDeliveryAvailable, sendPasswordResetEmail, sendPasswordResetLinkEmail } from './mailService'

type RestaurantAccessClaims = {
  restaurantUserId: number
  restaurantId: number
  email: string
  accessRole: 'manager' | 'staff'
  audience: 'restaurant'
  type: 'access'
  sessionId: string
}

type RestaurantRefreshClaims = Omit<RestaurantAccessClaims, 'type'> & {
  type: 'refresh'
}

function publicRestaurantUser(
  user: Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>,
) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'restaurant',
    restaurantId: user.restaurantId,
    restaurantName: user.restaurantName,
    accessRole: user.accessRole,
  }
}

function signAccessToken(
  user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>,
  sessionId: string,
) {
  return jwt.sign(
    {
      restaurantUserId: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      accessRole: user.accessRole,
      audience: 'restaurant',
      type: 'access',
      sessionId,
    },
    env.jwtSecret,
    { expiresIn: env.accessTokenTtl as SignOptions['expiresIn'] },
  )
}

function signRefreshToken(
  user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>,
  sessionId: string,
) {
  return jwt.sign(
    {
      restaurantUserId: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      accessRole: user.accessRole,
      audience: 'restaurant',
      type: 'refresh',
      sessionId,
    },
    env.jwtSecret,
    {
      expiresIn: Math.floor(env.refreshTokenTtlMs / 1000),
      jwtid: crypto.randomUUID(),
    },
  )
}

async function issueTokenPair(
  user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>,
  sessionId: string = crypto.randomUUID(),
) {
  const accessToken = signAccessToken(user, sessionId)
  const refreshToken = signRefreshToken(user, sessionId)
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10)
  const refreshTokenId = await restaurantAuthRepository.saveRefreshToken({
    restaurantUserId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
    sessionId,
  })

  return { accessToken, refreshToken, refreshTokenId, sessionId }
}

function verifyRefreshToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret, {
      algorithms: ['HS256'],
    }) as RestaurantRefreshClaims

    if (
      decoded.type !== 'refresh' ||
      decoded.audience !== 'restaurant' ||
      !decoded.restaurantUserId ||
      !decoded.restaurantId ||
      !decoded.email ||
      !decoded.sessionId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        decoded.sessionId,
      )
    ) {
      throw new HttpError(401, 'Invalid restaurant refresh token.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid restaurant refresh token.')
  }
}

function assertActiveRestaurantUser(
  user: Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>,
) {
  if (!user || !user.isActive || !user.restaurantIsActive || !user.emailVerified) {
    throw new HttpError(403, 'Restaurant console access is not active.')
  }

  return user
}

export async function login(payload: { email: string; password: string }) {
  if (!payload.email || !payload.password) {
    throw new HttpError(400, 'Email and password are required.')
  }

  const user = assertActiveRestaurantUser(
    await restaurantAuthRepository.findRestaurantUserByEmail(payload.email),
  )
  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash)

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  const tokenPair = await issueTokenPair(user)

  return {
    message: 'Restaurant console opened.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: publicRestaurantUser(user),
  }
}

export async function refresh(payload: { refreshToken: string }) {
  if (!payload.refreshToken) {
    throw new HttpError(400, 'Refresh token is required.')
  }

  const decoded = verifyRefreshToken(payload.refreshToken)
  const user = assertActiveRestaurantUser(
    await restaurantAuthRepository.findRestaurantUserById(decoded.restaurantUserId),
  )

  if (user.restaurantId !== decoded.restaurantId || user.email !== decoded.email) {
    throw new HttpError(401, 'Invalid restaurant refresh token.')
  }

  const activeTokens = await restaurantAuthRepository.findActiveRefreshTokens(user.id)
  const matchedToken = await (async () => {
    for (const token of activeTokens) {
      if (await bcrypt.compare(payload.refreshToken, token.tokenHash)) {
        return token
      }
    }
    return null
  })()

  if (!matchedToken) {
    throw new HttpError(401, 'Invalid restaurant refresh token.')
  }

  const tokenPair = await issueTokenPair(user, decoded.sessionId)
  await restaurantAuthRepository.revokeRefreshToken(matchedToken.id, tokenPair.refreshTokenId)

  return {
    message: 'Restaurant session refreshed.',
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    user: publicRestaurantUser(user),
  }
}

export async function logout(payload: { refreshToken: string }) {
  if (!payload.refreshToken) {
    return { message: 'Signed out.' }
  }

  const decoded = verifyRefreshToken(payload.refreshToken)
  const activeTokens = await restaurantAuthRepository.findActiveRefreshTokens(
    decoded.restaurantUserId,
  )

  for (const token of activeTokens) {
    if (await bcrypt.compare(payload.refreshToken, token.tokenHash)) {
      await restaurantAuthRepository.revokeRefreshToken(token.id)
      break
    }
  }

  return { message: 'Signed out.' }
}

export async function issuePasswordSetupCode(restaurantId: number) {
  const user = await restaurantAuthRepository.findPrimaryRestaurantUser(restaurantId)

  if (!user) {
    throw new HttpError(404, 'Restaurant console account not found.')
  }

  const setupCode = await createPasswordSetupCode(user.id, 7 * 24 * 60 * 60 * 1000)

  return { user: publicRestaurantUser(user)!, setupCode }
}

export async function createPasswordSetupLink(restaurantId: number, appUrl = env.operatorApps.restaurantUrl) {
  const user = await restaurantAuthRepository.findPrimaryRestaurantUser(restaurantId)
  if (!user) throw new HttpError(404, 'Restaurant console account not found.')
  const token = jwt.sign(
    { restaurantUserId: user.id, email: user.email, type: 'restaurant_password_setup' },
    env.jwtSecret,
    { expiresIn: 7 * 24 * 60 * 60, jwtid: crypto.randomUUID() },
  )
  await restaurantAuthRepository.saveSetupCode({
    restaurantUserId: user.id,
    codeHash: await bcrypt.hash(token, 10),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
  const url = new URL(appUrl)
  url.searchParams.set('access', '1')
  url.searchParams.set('token', token)
  url.searchParams.set('email', user.email)
  return { user: publicRestaurantUser(user)!, setupUrl: url.toString() }
}

async function createPasswordSetupCode(restaurantUserId: number, ttlMs: number) {
  const setupCode = generateOtp()
  await restaurantAuthRepository.saveSetupCode({
    restaurantUserId,
    codeHash: await bcrypt.hash(setupCode, 10),
    expiresAt: new Date(Date.now() + ttlMs),
  })
  return setupCode
}

function devCode(code: string) {
  return env.isProduction || env.smtp.enabled ? undefined : code
}

export async function requestPasswordReset(email: string) {
  if (!email) {
    throw new HttpError(400, 'Email is required.')
  }

  assertEmailDeliveryAvailable()

  const user = await restaurantAuthRepository.findRestaurantUserByEmail(email)
  const genericResponse = {
    message: 'If that email exists, a password reset link has been sent.',
    email,
  }

  // Do not disclose whether an account exists or whether it is currently
  // disabled. An active restaurant account gets a short-lived reset code;
  // invitation codes remain valid for their existing seven-day lifetime.
  if (!user || !user.isActive || !user.restaurantIsActive || !user.emailVerified) {
    return genericResponse
  }

  const token = jwt.sign(
    { restaurantUserId: user.id, email: user.email, type: 'restaurant_password_setup' },
    env.jwtSecret,
    { expiresIn: Math.floor(env.otpTtlMs / 1000), jwtid: crypto.randomUUID() },
  )
  const resetUrl = new URL(env.operatorApps.restaurantUrl)
  resetUrl.searchParams.set('reset', '1')
  resetUrl.searchParams.set('token', token)
  resetUrl.searchParams.set('email', user.email)
  await restaurantAuthRepository.saveSetupCode({
    restaurantUserId: user.id,
    codeHash: await bcrypt.hash(token, 10),
    expiresAt: new Date(Date.now() + env.otpTtlMs),
  })
  await sendPasswordResetLinkEmail(user.email, resetUrl.toString(), 'customer')

  return {
    message: 'Password reset link sent.',
    email: user.email,
    resetUrl: env.isProduction || env.smtp.enabled ? undefined : resetUrl.toString(),
  }
}

export async function setupPassword(payload: {
  email: string
  setupCode: string
  resetToken?: string
  password: string
}) {
  if ((!payload.email && !payload.resetToken) || (!payload.setupCode && !payload.resetToken) || !payload.password) {
    throw new HttpError(400, 'Setup link and new password are required.')
  }

  const passwordError = passwordValidationMessage(payload.password)
  if (passwordError) {
    throw new HttpError(400, passwordError)
  }

  if (payload.resetToken) {
    try {
      const claims = jwt.verify(payload.resetToken, env.jwtSecret, { algorithms: ['HS256'] }) as { restaurantUserId?: number; email?: string; type?: string }
      if (claims.type !== 'restaurant_password_setup' || !claims.restaurantUserId || !claims.email) throw new Error('invalid')
      const user = await restaurantAuthRepository.findRestaurantUserById(claims.restaurantUserId)
      if (!user || user.email.toLowerCase() !== claims.email.toLowerCase()) throw new Error('invalid')
      assertActiveRestaurantUser(user)
      const activeCode = await restaurantAuthRepository.findActiveSetupCode(user.email)
      if (!activeCode || new Date() > activeCode.code.expiresAt || !(await bcrypt.compare(payload.resetToken, activeCode.code.codeHash))) throw new Error('invalid')
      await restaurantAuthRepository.consumeSetupCode(activeCode.code.id)
      await restaurantAuthRepository.updateRestaurantUserPassword({ userId: user.id, passwordHash: await bcrypt.hash(payload.password, 10) })
      await restaurantAuthRepository.revokeAllRefreshTokens(user.id)
      return { message: 'Restaurant password saved. You can sign in now.' }
    } catch {
      throw new HttpError(401, 'Invalid or expired restaurant password link.')
    }
  }

  const result = await restaurantAuthRepository.findActiveSetupCode(payload.email)

  if (!result || new Date() > result.code.expiresAt) {
    if (result) {
      await restaurantAuthRepository.consumeSetupCode(result.code.id)
    }
    throw new HttpError(410, 'Restaurant setup code has expired.')
  }

  assertActiveRestaurantUser(result.user)
  const validCode = await bcrypt.compare(payload.setupCode, result.code.codeHash)

  if (!validCode) {
    const attempts = await restaurantAuthRepository.recordSetupCodeAttempt(result.code.id)
    if (attempts >= 5) await restaurantAuthRepository.consumeSetupCode(result.code.id)
    throw new HttpError(400, 'Invalid restaurant setup code.')
  }

  await restaurantAuthRepository.consumeSetupCode(result.code.id)
  await restaurantAuthRepository.updateRestaurantUserPassword({
    userId: result.user.id,
    passwordHash: await bcrypt.hash(payload.password, 10),
  })
  await restaurantAuthRepository.revokeAllRefreshTokens(result.user.id)

  return { message: 'Restaurant password saved. You can sign in now.' }
}

export type { RestaurantAccessClaims }
