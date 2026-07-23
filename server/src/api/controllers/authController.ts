import type { Request, Response } from 'express'
import { env } from '../../config/env'
import * as authService from '../../services/authService'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import { normalizeEmail, normalizePassword, normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

function sessionMetadata(req: Request) {
  return {
    userAgent: String(req.headers['user-agent'] || ''),
    ipAddress: String(req.ip || ''),
  }
}

function numericParam(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  const parsed = Number(param)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function signup(req: Request, res: Response) {
  try {
    const result = await authService.signup({
      name: normalizeText(req.body.name),
      email: normalizeEmail(req.body.email),
      password: normalizePassword(req.body.password),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login({
      email: normalizeEmail(req.body.email),
      password: normalizePassword(req.body.password),
    }, sessionMetadata(req))

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export function startAuth0Login(req: Request, res: Response) {
  try {
    const redirectUrl = authService.getAuth0LoginUrl(normalizeText(req.params.provider))

    res.redirect(redirectUrl)
  } catch (error) {
    sendError(error, res)
  }
}

export async function auth0Callback(req: Request, res: Response) {
  try {
    const result = await authService.auth0Callback({
      code: normalizeText(req.query.code),
      state: normalizeText(req.query.state),
      error: normalizeText(req.query.error),
      errorDescription: normalizeText(req.query.error_description),
    }, sessionMetadata(req))
    const params = new URLSearchParams({
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: JSON.stringify(result.user),
    })

    res.redirect(`${result.returnTo}#${params.toString()}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not complete social login.'
    const params = new URLSearchParams({ error: message })

    res.redirect(`${env.auth0.clientRedirectUrl}?${params.toString()}`)
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const result = await authService.refresh({
      refreshToken: normalizeText(req.body.refreshToken),
    }, sessionMetadata(req))

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const result = await authService.logout({
      refreshToken: normalizeText(req.body.refreshToken),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const result = await authService.requestPasswordReset({
      email: normalizeEmail(req.body.email),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const result = await authService.resetPassword({
      resetToken: normalizeText(req.body.resetToken),
      password: normalizePassword(req.body.password),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function listSessions(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(
      await authService.listActiveSessions(
        (req as AuthenticatedRequest).auth.userId,
        normalizeText(req.body?.currentRefreshToken),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function revokeOtherSessions(req: Request, res: Response) {
  try {
    res.json(
      await authService.revokeOtherSessions(
        (req as AuthenticatedRequest).auth.userId,
        normalizeText(req.body?.currentRefreshToken),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function revokeSession(req: Request, res: Response) {
  try {
    res.json(
      await authService.revokeSession(
        (req as AuthenticatedRequest).auth.userId,
        numericParam(req.params.sessionId),
        normalizeText(req.body?.currentRefreshToken),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const result = await authService.changePassword({
      userId: (req as AuthenticatedRequest).auth.userId,
      currentPassword: normalizePassword(req.body.currentPassword),
      newPassword: normalizePassword(req.body.newPassword),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function verifyPasswordResetCode(req: Request, res: Response) {
  try {
    const result = await authService.verifyPasswordResetCode({
      email: normalizeEmail(req.body.email),
      code: normalizeText(req.body.code),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function resendCode(req: Request, res: Response) {
  try {
    const result = await authService.resendCode(normalizeEmail(req.body.email))

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const result = await authService.verifyEmail({
      email: normalizeEmail(req.body.email),
      code: normalizeText(req.body.code),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}
