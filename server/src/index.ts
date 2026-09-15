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
import { requestSecurity } from './api/middleware/requestSecurity'
import { connectRedis, disconnectRedis } from './services/redisService'
import { initializeRealtime } from './services/realtimeService'
import { logEvent, observeHttpRequest, trackError } from './services/observability'
import { setDispatchWorkerReady } from './services/runtimeHealth'
import { startLocalDeliveryDemoWorker, stopLocalDeliveryDemoWorker } from './workers/localDeliveryDemoWorker'

const app = express()
const server = http.createServer(app)
initializeRealtime(server)
let dispatchWorker: ChildProcess | null = null
let dispatchWorkerRestartTimer: NodeJS.Timeout | null = null
let dispatchWorkerRestartAttempts = 0
let shouldRunDispatchWorker = true

function scheduleDispatchWorkerRestart() {
  if (!shouldRunDispatchWorker || dispatchWorkerRestartTimer) return

  const delayMs = Math.min(30_000, 1_000 * 2 ** dispatchWorkerRestartAttempts)
  dispatchWorkerRestartAttempts += 1
  logEvent('warn', 'dispatch_worker_restart_scheduled', { delayMs })
  dispatchWorkerRestartTimer = setTimeout(() => {
    dispatchWorkerRestartTimer = null
    startDispatchWorker()
  }, delayMs)
  dispatchWorkerRestartTimer.unref()
}

function startDispatchWorker() {
  if (!shouldRunDispatchWorker || dispatchWorker) return
  const isTypeScriptRuntime = __filename.endsWith('.ts')
  const extension = isTypeScriptRuntime ? 'ts' : 'js'
  const workerPath = path.resolve(__dirname, 'workers', `dispatchWorker.${extension}`)
  setDispatchWorkerReady(false)

  try {
    const worker = fork(workerPath, [], {
      execArgv: isTypeScriptRuntime ? ['-r', 'ts-node/register'] : undefined,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    })
    dispatchWorker = worker

    worker.on('message', (message: unknown) => {
      if (message && typeof message === 'object' && (message as { type?: string }).type === 'ready') {
        dispatchWorkerRestartAttempts = 0
        setDispatchWorkerReady(true)
        logEvent('info', 'dispatch_worker_ready')
      }
    })
    worker.on('error', (error) => {
      trackError('dispatch_worker_error', error)
    })
    worker.on('exit', (code, signal) => {
      if (dispatchWorker !== worker) return
      dispatchWorker = null
      setDispatchWorkerReady(false)
      if (!shouldRunDispatchWorker) return
      logEvent('error', 'dispatch_worker_stopped', { code: code ?? 'none', signal: signal ?? 'none' })
      scheduleDispatchWorkerRestart()
    })
  } catch (error) {
    trackError('dispatch_worker_start_failed', error)
    scheduleDispatchWorkerRestart()
  }
}

function stopDispatchWorker() {
  shouldRunDispatchWorker = false
  if (dispatchWorkerRestartTimer) clearTimeout(dispatchWorkerRestartTimer)
  dispatchWorkerRestartTimer = null
  setDispatchWorkerReady(false)
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

function colorizeHttpLog(method: string, status: string, message: string) {
  if (env.isProduction || process.env.NO_COLOR || !process.stdout.isTTY) return message
  const methodColor = method === 'GET' ? '\u001b[36m' : method === 'POST' ? '\u001b[33m' : '\u001b[35m'
  const statusCode = Number(status)
  const statusColor = statusCode >= 500 ? '\u001b[31m' : statusCode >= 400 ? '\u001b[33m' : '\u001b[32m'
  return `${methodColor}${method}\u001b[0m${message.slice(method.length, message.lastIndexOf(status))}${statusColor}${status}\u001b[0m${message.slice(message.lastIndexOf(status) + status.length)}`
}

app.disable('x-powered-by')
if (env.isProduction) app.set('trust proxy', 1)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
}))
app.use(cors({ origin: allowOrigin }))
app.use(express.json({ limit: '100kb', strict: true }))
app.use(requestSecurity)
app.use(observeHttpRequest)
app.use(morgan((tokens, request, response) => {
  // Do not log query strings: Auth0 callbacks contain one-time credentials and
  // address search queries can contain personal data.
  const method = tokens.method(request, response) || 'REQUEST'
  const status = tokens.status(request, response) || '000'
  const message = `${method} ${request.path} ${status} ${tokens['response-time'](request, response)} ms`
  return colorizeHttpLog(method, status, message)
}))

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
    logEvent('info', 'server_started', { port: env.port })
    startDispatchWorker()
    startLocalDeliveryDemoWorker()
  })
}

void startServer().catch((error) => {
  trackError('server_start_failed', error)
  process.exit(1)
})

server.on('close', () => {
  stopDispatchWorker()
  stopLocalDeliveryDemoWorker()
  void disconnectRedis()
})
process.once('exit', () => {
  stopDispatchWorker()
  stopLocalDeliveryDemoWorker()
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logEvent('error', 'server_port_in_use', { port: env.port })
    process.exit(1)
  }

  trackError('server_runtime_error', error)
  throw error
})

process.on('unhandledRejection', (reason) => {
  trackError('unhandled_rejection', reason)
})
