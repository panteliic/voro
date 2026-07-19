import type { Request, Response } from 'express'
import * as restaurantAuthService from '../../services/restaurantAuthService'
import { normalizeEmail, normalizePassword, normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

export async function login(req: Request, res: Response) {
  try {
    res.json(
      await restaurantAuthService.login({
        email: normalizeEmail(req.body.email),
        password: normalizePassword(req.body.password),
      }),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    res.json(await restaurantAuthService.refresh({ refreshToken: normalizeText(req.body.refreshToken) }))
  } catch (error) {
    sendError(error, res)
  }
}

export async function logout(req: Request, res: Response) {
  try {
    res.json(await restaurantAuthService.logout({ refreshToken: normalizeText(req.body.refreshToken) }))
  } catch (error) {
    sendError(error, res)
  }
}

export async function setupPassword(req: Request, res: Response) {
  try {
    res.json(
      await restaurantAuthService.setupPassword({
        email: normalizeEmail(req.body.email),
        setupCode: normalizeText(req.body.setupCode),
        password: normalizePassword(req.body.password),
      }),
    )
  } catch (error) {
    sendError(error, res)
  }
}
