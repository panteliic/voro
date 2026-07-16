import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { authRoutes } from './api/routes/authRoutes'
import { customerRoutes } from './api/routes/customerRoutes'
import { systemRoutes } from './api/routes/systemRoutes'
import { adminRoutes } from './api/routes/adminRoutes'
import { restaurantRoutes } from './api/routes/restaurantRoutes'
import { driverRoutes } from './api/routes/driverRoutes'

const app = express()
const server = http.createServer(app)

function isLocalViteOrigin(origin: string) {
  try {
    const url = new URL(origin)
    const isVitePort = /^517[3-9]$/.test(url.port)
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const isPrivateNetwork =
      /^10\./.test(url.hostname) ||
      /^192\.168\./.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)

    return url.protocol === 'http:' && isVitePort && (isLoopback || isPrivateNetwork)
  } catch {
    return false
  }
}

function allowOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin || env.clientUrls.includes(origin) || (!env.isProduction && isLocalViteOrigin(origin))) {
    callback(null, true)
    return
  }

  callback(new Error(`CORS origin is not allowed: ${origin}`))
}

app.use(helmet())
app.use(cors({ origin: allowOrigin }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/', systemRoutes)
app.use('/auth', authRoutes)
app.use('/admin', adminRoutes)
app.use('/customer', customerRoutes)
app.use('/restaurant', restaurantRoutes)
app.use('/driver', driverRoutes)

server.listen(env.port, () => {
  console.log(`Server radi na http://localhost:${env.port}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} je vec zauzet. Promeni PORT u .env fajlu.`)
    process.exit(1)
  }

  throw error
})
