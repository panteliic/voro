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

export async function updatePresence(req: Request, res: Response) {
  try {
    res.json(await driverService.updatePresence(auth(req).userId, req.body))
  } catch (error) {
    sendError(error, res)
  }
}

function numericParam(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  const parsed = Number(param)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function acceptOffer(req: Request, res: Response) {
  try {
    res.json(await driverService.acceptOffer(auth(req).userId, numericParam(req.params.offerId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function declineOffer(req: Request, res: Response) {
  try {
    res.json(await driverService.declineOffer(auth(req).userId, numericParam(req.params.offerId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateDeliveryStatus(req: Request, res: Response) {
  try {
    res.json(
      await driverService.updateDeliveryStatus(
        auth(req).userId,
        numericParam(req.params.deliveryId),
        req.body?.status,
        req.body || {},
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function withdrawFromDelivery(req: Request, res: Response) {
  try {
    res.json(await driverService.withdrawFromDelivery(auth(req).userId, numericParam(req.params.deliveryId), req.body?.reason))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getDeliveryRoute(req: Request, res: Response) {
  try {
    res.json(await driverService.getDeliveryRoute(auth(req).userId, numericParam(req.params.deliveryId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrderMessages(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await driverService.getOrderMessages(auth(req).userId, numericParam(req.params.orderId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function sendOrderMessage(req: Request, res: Response) {
  try {
    res.status(201).json(await driverService.sendOrderMessage(auth(req).userId, numericParam(req.params.orderId), req.body?.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await driverService.getNotifications(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function readNotification(req: Request, res: Response) {
  try {
    res.json(await driverService.readNotification(auth(req).userId, numericParam(req.params.notificationId)))
  } catch (error) {
    sendError(error, res)
  }
}
