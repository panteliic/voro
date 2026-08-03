import type { Response } from 'express'
import { HttpError } from './httpError'
import { trackError } from '../services/observability'

type PgError = {
  code?: string
  message?: string
}

function isPgError(error: unknown): error is PgError {
  return typeof error === 'object' && error !== null && 'code' in error
}

export function sendError(error: unknown, res: Response) {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (isPgError(error)) {
    if (error.code === '28P01') {
      res.status(503).json({ message: 'Database login failed. Check DB_USER and DB_PASSWORD.' })
      return
    }

    if (error.code === '3D000') {
      res.status(503).json({ message: 'Database does not exist. Create the voro database first.' })
      return
    }

    if (error.code === '42P01') {
      res.status(503).json({ message: 'Database tables are missing. Run npm run migrate in server.' })
      return
    }
  }

  trackError('unhandled_request_error', error)
  res.status(500).json({ message: 'Unexpected server error.' })
}
