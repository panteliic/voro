import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server, type Socket } from 'socket.io'
import { env } from '../config/env'
import { canAccessOrderConversation } from '../repositories/operationsRepository'

type SocketAuth = {
  userId: number
  role: 'customer' | 'courier'
}

type AccessTokenClaims = {
  userId: number
  email: string
  role?: string
  type: 'access'
}

export type RealtimeOrderMessage = {
  id: number
  orderId: number
  senderUserId: number
  senderRole: 'customer' | 'courier'
  senderName: string
  body: string
  readAt: Date | null
  createdAt: Date
}

export type RealtimeUserNotification = {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  readAt: Date | null
  createdAt: Date
}

export type RealtimeOrderTracking = {
  orderId: number
  courier: {
    name: string
    latitude: number | null
    longitude: number | null
  } | null
  deliveryStatus: string | null
}

export type RealtimeDriverLocation = {
  latitude: number
  longitude: number
}

let realtimeServer: Server | null = null

function orderRoom(orderId: number) {
  return `order:${orderId}`
}

function userRoom(userId: number) {
  return `user:${userId}`
}

function accessTokenFrom(socket: Socket) {
  const tokenFromAuth = socket.handshake.auth?.token
  if (typeof tokenFromAuth === 'string' && tokenFromAuth) return tokenFromAuth

  const authorization = socket.handshake.headers.authorization
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
}

function isAllowedOrigin(origin: string | undefined) {
  if (!origin || env.clientUrls.includes(origin)) return true
  if (env.isProduction) return false

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

function socketAuth(socket: Socket): SocketAuth | null {
  const token = accessTokenFrom(socket)
  if (!token) return null

  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as AccessTokenClaims
    if (
      decoded.type !== 'access' ||
      !Number.isInteger(decoded.userId) ||
      (decoded.role !== 'customer' && decoded.role !== 'courier')
    ) {
      return null
    }

    return { userId: decoded.userId, role: decoded.role }
  } catch {
    return null
  }
}

export function initializeRealtime(server: HttpServer) {
  if (realtimeServer) return realtimeServer

  realtimeServer = new Server(server, {
    cors: {
      origin(origin, callback) {
        const allowed = isAllowedOrigin(origin)
        callback(allowed ? null : new Error('CORS origin is not allowed.'), allowed)
      },
    },
  })

  realtimeServer.use((socket, next) => {
    const auth = socketAuth(socket)
    if (!auth) {
      next(new Error('Authentication is required.'))
      return
    }

    socket.data.auth = auth
    next()
  })

  realtimeServer.on('connection', (socket) => {
    const auth = socket.data.auth as SocketAuth
    socket.join(userRoom(auth.userId))

    socket.on('order:join', async (payload: unknown, acknowledge?: (result: { ok: boolean; message?: string }) => void) => {
      const orderId = Number((payload as { orderId?: unknown } | null)?.orderId)
      const canJoin = Number.isInteger(orderId) && orderId > 0 && await canAccessOrderConversation(orderId, auth.userId, auth.role)

      if (!canJoin) {
        acknowledge?.({ ok: false, message: 'Order conversation not found.' })
        return
      }

      socket.join(orderRoom(orderId))
      acknowledge?.({ ok: true })
    })
  })

  return realtimeServer
}

export function publishOrderMessage(message: RealtimeOrderMessage) {
  realtimeServer?.to(orderRoom(message.orderId)).emit('order:message', message)
}

export function publishOrderTracking(tracking: RealtimeOrderTracking) {
  realtimeServer?.to(orderRoom(tracking.orderId)).emit('order:tracking', tracking)
}

export function publishDriverLocation(userId: number, location: RealtimeDriverLocation) {
  realtimeServer?.to(userRoom(userId)).emit('driver:location', location)
}

export function publishUserNotification(userId: number, notification: RealtimeUserNotification) {
  realtimeServer?.to(userRoom(userId)).emit('notification:new', notification)
}
