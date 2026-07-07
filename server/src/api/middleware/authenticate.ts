import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { HttpError } from '../../utils/httpError'
import { sendError } from '../../utils/sendError'

type AccessTokenClaims = {
  userId: number
  email: string
  role?: string
  type: 'access'
}

export type AuthenticatedRequest = Request & {
  auth: {
    userId: number
    email: string
    role: string
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

    if (!token) {
      throw new HttpError(401, 'Authentication is required.')
    }

    const decoded = jwt.verify(token, env.jwtSecret) as AccessTokenClaims

    if (decoded.type !== 'access' || !decoded.userId || !decoded.email) {
      throw new HttpError(401, 'Invalid access token.')
    }

    ;(req as AuthenticatedRequest).auth = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'customer',
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
