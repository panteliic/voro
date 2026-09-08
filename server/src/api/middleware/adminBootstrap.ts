import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env'
import { HttpError } from '../../utils/httpError'
import { sendError } from '../../utils/sendError'

function requestToken(request: Request) {
  const fromHeader = request.headers['x-admin-bootstrap-token']
  if (typeof fromHeader === 'string' && fromHeader) return fromHeader

  const authorization = request.headers.authorization
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
}

function tokensMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

/**
 * First-admin creation is deliberately not a normal registration endpoint.
 * It is available only while a deployment secret is configured, and the
 * service itself permits just one active administrator.
 */
export function requireAdminBootstrapToken(request: Request, response: Response, next: NextFunction) {
  try {
    if (!env.adminBootstrapToken) {
      // Treat a disabled endpoint as absent so it cannot be used as an account
      // enumeration or deployment-configuration oracle.
      throw new HttpError(404, 'Not found.')
    }

    if (!tokensMatch(requestToken(request), env.adminBootstrapToken)) {
      throw new HttpError(404, 'Not found.')
    }

    next()
  } catch (error) {
    sendError(error, response)
  }
}
