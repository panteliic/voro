import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import * as pushService from '../../services/pushService'
import { sendError } from '../../utils/sendError'

function userId(request: Request) {
  return (request as AuthenticatedRequest).auth.userId
}

export async function registerPushSubscription(request: Request, response: Response) {
  try {
    await pushService.savePushSubscription(userId(request), request.body, request.get('user-agent') || '')
    response.status(201).json({ subscribed: true })
  } catch (error) {
    sendError(error, response)
  }
}

export async function removePushSubscription(request: Request, response: Response) {
  try {
    await pushService.removePushSubscription(userId(request), request.body?.endpoint)
    response.json({ removed: true })
  } catch (error) {
    sendError(error, response)
  }
}
