import type { Request, Response } from 'express'
import * as authService from '../../services/authService'
import { normalizeEmail, normalizePassword, normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

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
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const result = await authService.refresh({
      refreshToken: normalizeText(req.body.refreshToken),
    })

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
