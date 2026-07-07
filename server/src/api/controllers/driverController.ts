import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import * as driverService from '../../services/driverService'
import { sendError } from '../../utils/sendError'

function auth(req: Request) {
  return (req as AuthenticatedRequest).auth
}

export async function getDashboard(req: Request, res: Response) {
  try {
    res.json(await driverService.getDashboard(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}
