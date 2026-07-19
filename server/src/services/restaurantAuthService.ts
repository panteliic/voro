import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import * as restaurantAuthRepository from '../repositories/restaurantAuthRepository'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'

type RestaurantAccessClaims = {
  restaurantUserId: number
  restaurantId: number
  email: string
  accessRole: 'manager' | 'staff'
  audience: 'restaurant'
  type: 'access'
}

type RestaurantRefreshClaims = Omit<RestaurantAccessClaims, 'type'> & {
  type: 'refresh'
}

function publicRestaurantUser(user: Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>) {
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

function signAccessToken(user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>) {
  return jwt.sign(
    {
      restaurantUserId: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      accessRole: user.accessRole,
      audience: 'restaurant',
      type: 'access',
    },
    env.jwtSecret,
    { expiresIn: env.accessTokenTtl as SignOptions['expiresIn'] },
  )
}

function signRefreshToken(user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>) {
  return jwt.sign(
    {
      restaurantUserId: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      accessRole: user.accessRole,
      audience: 'restaurant',
      type: 'refresh',
    },
    env.jwtSecret,
    {
      expiresIn: Math.floor(env.refreshTokenTtlMs / 1000),
      jwtid: crypto.randomUUID(),
    },
  )
}

async function issueTokenPair(user: NonNullable<Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>>) {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10)
  const refreshTokenId = await restaurantAuthRepository.saveRefreshToken({
    restaurantUserId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
  })

  return { accessToken, refreshToken, refreshTokenId }
}

function verifyRefreshToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret) as RestaurantRefreshClaims

    if (
      decoded.type !== 'refresh' ||
      decoded.audience !== 'restaurant' ||
      !decoded.restaurantUserId ||
      !decoded.restaurantId ||
      !decoded.email
    ) {
      throw new HttpError(401, 'Invalid restaurant refresh token.')
    }

    return decoded
  } catch {
    throw new HttpError(401, 'Invalid restaurant refresh token.')
  }
}

function assertActiveRestaurantUser(user: Awaited<ReturnType<typeof restaurantAuthRepository.findRestaurantUserById>>) {
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

  const tokenPair = await issueTokenPair(user)
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
  const activeTokens = await restaurantAuthRepository.findActiveRefreshTokens(decoded.restaurantUserId)

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

  const setupCode = generateOtp()
  await restaurantAuthRepository.saveSetupCode({
    restaurantUserId: user.id,
    codeHash: await bcrypt.hash(setupCode, 10),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return { user: publicRestaurantUser(user), setupCode }
}

export async function setupPassword(payload: { email: string; setupCode: string; password: string }) {
  if (!payload.email || !payload.setupCode || !payload.password) {
    throw new HttpError(400, 'Email, setup code, and password are required.')
  }

  if (payload.password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
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
