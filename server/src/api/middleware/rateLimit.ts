import type { NextFunction, Request, Response } from 'express'
import { consumeRateLimit } from '../../services/redisService'
import { HttpError } from '../../utils/httpError'
import { sendError } from '../../utils/sendError'

type RateLimitOptions = {
  key?: (request: Request) => string
  limit: number
  namespace: string
  windowSeconds: number
}

function stableKey(value: string) {
  return encodeURIComponent(value.slice(0, 160) || 'anonymous')
}

export function rateLimit(options: RateLimitOptions) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const identifier = options.key?.(request) || request.ip || 'unknown'
      const result = await consumeRateLimit(
        `${options.namespace}:${stableKey(identifier)}`,
        options.limit,
        options.windowSeconds,
      )

      response.setHeader('RateLimit-Limit', String(options.limit))
      response.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - result.count)))
      response.setHeader('RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + result.ttlSeconds))

      if (result.count > options.limit) {
        response.setHeader('Retry-After', String(result.ttlSeconds))
        sendError(new HttpError(429, 'Too many requests. Please try again shortly.'), response)
        return
      }

      next()
    } catch (error) {
      // Redis is a required dependency in this application. Failing closed
      // prevents brute-force endpoints from becoming unlimited during outages.
      sendError(error instanceof Error ? new HttpError(503, 'Security service is temporarily unavailable.') : error, response)
    }
  }
}
