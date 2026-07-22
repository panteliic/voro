import { Router } from 'express'
import { env } from '../../config/env'
import { pool } from '../../database/pool'
import { isRedisHealthy } from '../../services/redisService'

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
    res.json({
      status: 'ok',
      port: env.port,
      database: 'ok',
      redis: 'ok',
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      port: env.port,
      database: 'error',
      redis: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed.',
    })
  }
}

systemRoutes.get('/health', readiness)
systemRoutes.get('/health/ready', readiness)
systemRoutes.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', port: env.port, uptimeSeconds: Math.round(process.uptime()) })
})
