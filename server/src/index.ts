import express from 'express'
import http from 'http'
import path from 'path'
import { fork, type ChildProcess } from 'child_process'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { authRoutes } from './api/routes/authRoutes'
import { customerRoutes } from './api/routes/customerRoutes'
import { systemRoutes } from './api/routes/systemRoutes'
import { adminRoutes } from './api/routes/adminRoutes'
import { restaurantRoutes } from './api/routes/restaurantRoutes'
import { restaurantAuthRoutes } from './api/routes/restaurantAuthRoutes'
import { driverRoutes } from './api/routes/driverRoutes'
import { connectRedis, disconnectRedis } from './services/redisService'

const app = express()
const server = http.createServer(app)
let dispatchWorker: ChildProcess | null = null

function startDispatchWorker() {
  const isTypeScriptRuntime = __filename.endsWith('.ts')
  const extension = isTypeScriptRuntime ? 'ts' : 'js'
  const workerPath = path.resolve(__dirname, 'workers', `dispatchWorker.${extension}`)

  dispatchWorker = fork(workerPath, [], {
    execArgv: isTypeScriptRuntime ? ['-r', 'ts-node/register'] : undefined,
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  })

  dispatchWorker.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`Dispatch worker stopped unexpectedly (code ${code ?? 'none'}, signal ${signal ?? 'none'}).`)
    }
  })
}

function stopDispatchWorker() {
  dispatchWorker?.kill('SIGTERM')
  dispatchWorker = null
}

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
app.use('/restaurant/auth', restaurantAuthRoutes)
app.use('/restaurant', restaurantRoutes)
app.use('/driver', driverRoutes)

async function startServer() {
  await connectRedis()

  server.listen(env.port, () => {
    console.log(`Server radi na http://localhost:${env.port}`)
    startDispatchWorker()
  })
}

void startServer().catch((error) => {
  console.error('Redis connection failed. Start Redis before starting the server.', error)
  process.exit(1)
})

server.on('close', () => {
  stopDispatchWorker()
  void disconnectRedis()
})
process.once('exit', stopDispatchWorker)

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} je vec zauzet. Promeni PORT u .env fajlu.`)
    process.exit(1)
  }

  throw error
})
