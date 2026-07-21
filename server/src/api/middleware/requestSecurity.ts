import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'

export function requestSecurity(_request: Request, response: Response, next: NextFunction) {
  response.setHeader('X-Request-Id', crypto.randomUUID())
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Pragma', 'no-cache')
  next()
}
