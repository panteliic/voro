import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import * as authRepository from '../../repositories/authRepository'
import * as restaurantAuthRepository from '../../repositories/restaurantAuthRepository'
import { HttpError } from '../../utils/httpError'
import { sendError } from '../../utils/sendError'
import type { RestaurantAccessClaims } from '../../services/restaurantAuthService'

type AccessTokenClaims = {
  userId: number
  email: string
  role?: string
  type: 'access'
  sessionId?: string
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export type AuthenticatedRequest = Request & {
  auth: {
    userId: number
    email: string
    role: string
    sessionId?: string
  }
}

export type RestaurantAuthenticatedRequest = Request & {
  restaurantAuth: {
    restaurantUserId: number
    restaurantId: number
    email: string
    accessRole: 'manager' | 'staff'
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

    if (!token) {
      throw new HttpError(401, 'Authentication is required.')
    }

    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as AccessTokenClaims

    if (decoded.type !== 'access' || !decoded.userId || !decoded.email) {
      throw new HttpError(401, 'Invalid access token.')
    }

    const user = await authRepository.findUserById(decoded.userId)
    if (
      !user ||
      !user.isActive ||
      !user.emailVerified ||
      user.email.toLowerCase() !== decoded.email.toLowerCase() ||
      (decoded.role && decoded.role !== user.roleName)
    ) {
      throw new HttpError(401, 'Session is no longer active. Please sign in again.')
    }

    if (decoded.sessionId && (!isUuid(decoded.sessionId) || !(await authRepository.isRefreshSessionActive(decoded.userId, decoded.sessionId)))) {
      throw new HttpError(401, 'This session has been signed out.')
    }

    ;(req as AuthenticatedRequest).auth = {
      userId: decoded.userId,
      email: decoded.email,
      role: user.roleName,
      sessionId: decoded.sessionId,
    }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(new HttpError(401, 'Session expired. Please sign in again.'), res)
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      sendError(new HttpError(401, 'Invalid access token.'), res)
      return
    }

    sendError(error, res)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = (req as AuthenticatedRequest).auth?.role

      if (!role || !roles.includes(role)) {
        throw new HttpError(403, 'You do not have access to this resource.')
      }

      next()
    } catch (error) {
      sendError(error, res)
    }
  }
}

export function requireRestaurantRole(...roles: Array<'manager' | 'staff'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = (req as RestaurantAuthenticatedRequest).restaurantAuth?.accessRole

      if (!role || !roles.includes(role)) {
        throw new HttpError(403, 'You do not have access to this action.')
      }

      next()
    } catch (error) {
      sendError(error, res)
    }
  }
}

export async function authenticateRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

    if (!token) {
      throw new HttpError(401, 'Restaurant authentication is required.')
    }

    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as RestaurantAccessClaims

    if (
      decoded.type !== 'access' ||
      decoded.audience !== 'restaurant' ||
      !decoded.restaurantUserId ||
      !decoded.restaurantId ||
      !decoded.email ||
      (decoded.accessRole !== 'manager' && decoded.accessRole !== 'staff')
    ) {
      throw new HttpError(401, 'Invalid restaurant access token.')
    }

    const user = await restaurantAuthRepository.findRestaurantUserById(decoded.restaurantUserId)
    if (
      !user ||
      !user.isActive ||
      !user.restaurantIsActive ||
      !user.emailVerified ||
      user.restaurantId !== decoded.restaurantId ||
      user.email.toLowerCase() !== decoded.email.toLowerCase() ||
      user.accessRole !== decoded.accessRole
    ) {
      throw new HttpError(401, 'Restaurant session is no longer active. Please sign in again.')
    }

    if (decoded.sessionId && (!isUuid(decoded.sessionId) || !(await restaurantAuthRepository.isRefreshSessionActive(user.id, decoded.sessionId)))) {
      throw new HttpError(401, 'Restaurant session has been signed out.')
    }

    ;(req as RestaurantAuthenticatedRequest).restaurantAuth = {
      restaurantUserId: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      accessRole: user.accessRole,
    }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(new HttpError(401, 'Restaurant session expired. Please sign in again.'), res)
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      sendError(new HttpError(401, 'Invalid restaurant access token.'), res)
      return
    }

    sendError(error, res)
  }
}
