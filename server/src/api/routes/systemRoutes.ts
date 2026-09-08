import { Router } from 'express'
import { env } from '../../config/env'
import { pool } from '../../database/pool'
import { isRedisHealthy } from '../../services/redisService'
import { prometheusMetrics } from '../../services/observability'
import { isDispatchWorkerReady } from '../../services/runtimeHealth'
import crypto from 'crypto'

export const systemRoutes = Router()

systemRoutes.get('/', (_req, res) => {
  res.json({
    name: 'voro-server',
    status: 'ok',
    health: '/health',
    clients: env.clientUrls,
  })
})

async function readiness(_req: import('express').Request, res: import('express').Response) {
  try {
    await Promise.all([pool.query('SELECT 1'), isRedisHealthy()])
    if (!isDispatchWorkerReady()) {
      throw new Error('Dispatch worker is not ready.')
    }
    res.json({
      status: 'ok',
      port: env.port,
      database: 'ok',
      redis: 'ok',
      dispatchWorker: 'ok',
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      port: env.port,
      database: 'error',
      redis: 'error',
      message: env.isProduction
        ? 'A required service is unavailable.'
        : error instanceof Error
          ? error.message
          : 'A required service is unavailable.',
    })
  }
}

systemRoutes.get('/health', readiness)
systemRoutes.get('/health/ready', readiness)
systemRoutes.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', port: env.port, uptimeSeconds: Math.round(process.uptime()) })
})

function sameToken(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

function metricsToken(request: import('express').Request) {
  const header = request.get('x-observability-token') || ''
  if (header) return header
  const authorization = request.get('authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
}

systemRoutes.get('/metrics', (req, res) => {
  if (env.isProduction && (!env.observabilityToken || !sameToken(metricsToken(req), env.observabilityToken))) {
    res.status(404).end()
    return
  }
  res.type('text/plain; version=0.0.4').send(prometheusMetrics())
})
