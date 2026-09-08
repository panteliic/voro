import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'

const requestCounts = new Map<string, number>()
const requestDurations = new Map<string, { count: number; totalMs: number }>()
const errorCounts = new Map<string, number>()

const terminalColor = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  cyan: '\u001b[36m',
} as const

function metricKey(request: Request, response: Response) {
  const route = request.route?.path || request.path || 'unmatched'
  return `${request.method} ${route} ${response.statusCode}`
}

export function logEvent(level: 'error' | 'info' | 'warn', event: string, context: Record<string, unknown> = {}) {
  const entry = { timestamp: new Date().toISOString(), level, event, ...context }
  if (env.isProduction) {
    console[level](JSON.stringify(entry))
    return
  }
  const color = level === 'error'
    ? terminalColor.red
    : level === 'warn'
      ? terminalColor.yellow
      : terminalColor.cyan
  console[level](`${color}[${entry.timestamp}] ${event}${terminalColor.reset}`, context)
}

export function trackError(event: string, error: unknown, context: Record<string, unknown> = {}) {
  errorCounts.set(event, (errorCounts.get(event) || 0) + 1)
  if (!(error instanceof Error)) {
    logEvent('error', event, { ...context, name: 'UnknownError', message: String(error) })
    return
  }

  const networkError = error as NodeJS.ErrnoException & { errors?: unknown }
  const code = networkError.code
  const connectionErrors = Array.isArray(networkError.errors)
    ? networkError.errors.map((nestedError) => {
        if (!(nestedError instanceof Error)) return { message: String(nestedError) }
        const nestedNetworkError = nestedError as NodeJS.ErrnoException & { address?: string; port?: number }
        return {
          name: nestedError.name,
          message: nestedError.message,
          ...(nestedNetworkError.code ? { code: nestedNetworkError.code } : {}),
          ...(nestedNetworkError.address ? { address: nestedNetworkError.address } : {}),
          ...(nestedNetworkError.port ? { port: nestedNetworkError.port } : {}),
        }
      })
    : undefined
  logEvent('error', event, {
    ...context,
    name: error.name,
    message: error.message,
    ...(code ? { code } : {}),
    ...(connectionErrors?.length ? { connectionErrors } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  })
}

export function observeHttpRequest(request: Request, response: Response, next: NextFunction) {
  const startedAt = Date.now()
  response.once('finish', () => {
    const key = metricKey(request, response)
    requestCounts.set(key, (requestCounts.get(key) || 0) + 1)
    const duration = requestDurations.get(key) || { count: 0, totalMs: 0 }
    duration.count += 1
    duration.totalMs += Date.now() - startedAt
    requestDurations.set(key, duration)
  })
  next()
}

export function prometheusMetrics() {
  const lines = [
    '# HELP voro_http_requests_total Completed HTTP requests by method, route and status.',
    '# TYPE voro_http_requests_total counter',
  ]
  for (const [key, count] of requestCounts) {
    const [method, route, status] = key.split(' ')
    lines.push(`voro_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`)
  }
  lines.push('# HELP voro_http_request_duration_ms_total Total observed HTTP response duration in milliseconds.')
  lines.push('# TYPE voro_http_request_duration_ms_total counter')
  for (const [key, value] of requestDurations) {
    const [method, route, status] = key.split(' ')
    lines.push(`voro_http_request_duration_ms_total{method="${method}",route="${route}",status="${status}"} ${Math.round(value.totalMs)}`)
  }
  lines.push('# HELP voro_errors_total Tracked application errors by event type.')
  lines.push('# TYPE voro_errors_total counter')
  for (const [event, count] of errorCounts) {
    lines.push(`voro_errors_total{event="${event}"} ${count}`)
  }
  return `${lines.join('\n')}\n`
}
