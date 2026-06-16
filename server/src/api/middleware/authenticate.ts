import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { HttpError } from '../../utils/httpError'
import { sendError } from '../../utils/sendError'

type AccessTokenClaims = {
  userId: number
  email: string
  type: 'access'
}

export type AuthenticatedRequest = Request & {
  auth: {
    userId: number
    email: string
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
    }
    next()
  } catch (error) {
    sendError(error, res)
  }
}
