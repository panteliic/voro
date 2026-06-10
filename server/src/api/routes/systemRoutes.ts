import { Router } from 'express'
import { env } from '../../config/env'
import { pool } from '../../database/pool'

export const systemRoutes = Router()

systemRoutes.get('/', (_req, res) => {
  res.json({
    name: 'voro-server',
    status: 'ok',
    health: '/health',
    clients: env.clientUrls,
  })
})

systemRoutes.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'ok',
      port: env.port,
      database: 'ok',
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      port: env.port,
      database: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed.',
    })
  }
})
