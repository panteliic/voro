import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import * as customerService from '../../services/customerService'
import { sendError } from '../../utils/sendError'

function auth(req: Request) {
  return (req as AuthenticatedRequest).auth
}

function numericParam(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(param)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function queryText(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  return String(param || '').trim()
}

function queryNumber(value: unknown) {
  const parsedValue = Number(queryText(value))
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

export async function getProfile(req: Request, res: Response) {
  try {
    res.json(await customerService.getCustomerProfile(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function searchAddressSuggestions(req: Request, res: Response) {
  try {
    res.json(await customerService.searchAddressSuggestions(queryText(req.query.q)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function resolveCurrentAddress(req: Request, res: Response) {
  try {
    res.json(await customerService.resolveCurrentAddress(
      queryNumber(req.query.latitude),
      queryNumber(req.query.longitude),
    ))
  } catch (error) {
    sendError(error, res)
  }
}

export async function listRestaurants(req: Request, res: Response) {
  try {
    res.json(await customerService.getRestaurantDiscovery(queryText(req.query.category), auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getRestaurantMenu(req: Request, res: Response) {
  try {
    res.json(await customerService.getRestaurantMenu(numericParam(req.params.restaurantId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createOrder(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createOrder(
      auth(req).userId,
      req.body,
      req.get('Idempotency-Key'),
    ))
  } catch (error) {
    sendError(error, res)
  }
}

export async function exportData(req: Request, res: Response) {
  try {
    res.set('Content-Disposition', 'attachment; filename="voro-account-data.json"').json(await customerService.exportCustomerData(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function deleteAccount(req: Request, res: Response) {
  try {
    res.json(await customerService.deleteCustomerAccount(auth(req).userId, auth(req).role, req.body?.confirmation))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createSupportTicket(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createSupportTicket(auth(req).userId, req.body || {}))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrders(req: Request, res: Response) {
  try {
    res.json(await customerService.getOrders(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrderRoute(req: Request, res: Response) {
  try {
    res.json(await customerService.getOrderRoute(auth(req).userId, numericParam(req.params.orderId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrderTracking(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await customerService.getOrderTracking(auth(req).userId, numericParam(req.params.orderId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function listFavorites(req: Request, res: Response) {
  try {
    res.json(await customerService.listFavorites(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function setFavorite(req: Request, res: Response) {
  try {
    res.json(await customerService.setFavorite(
      auth(req).userId,
      numericParam(req.params.restaurantId),
      req.method === 'DELETE' ? false : req.body?.isFavorite !== false,
    ))
  } catch (error) {
    sendError(error, res)
  }
}

export async function cancelOrder(req: Request, res: Response) {
  try {
    res.json(await customerService.cancelOrder(auth(req).userId, numericParam(req.params.orderId), req.body?.reason))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createOrderIssue(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createOrderIssue(auth(req).userId, numericParam(req.params.orderId), req.body || {}))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createOrderReview(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createOrderReview(auth(req).userId, numericParam(req.params.orderId), req.body || {}))
  } catch (error) {
    sendError(error, res)
  }
}

export async function reorderOrder(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.reorderOrder(auth(req).userId, numericParam(req.params.orderId), req.body || {}))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrderMessages(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await customerService.getOrderMessages(auth(req).userId, numericParam(req.params.orderId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function sendOrderMessage(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.sendOrderMessage(auth(req).userId, numericParam(req.params.orderId), req.body?.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await customerService.getNotifications(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function exportPersonalData(req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'no-store').json(await customerService.exportPersonalData(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function deletePersonalAccount(req: Request, res: Response) {
  try {
    res.json(await customerService.deletePersonalAccount(auth(req).userId, req.body?.confirmation))
  } catch (error) {
    sendError(error, res)
  }
}

export async function readNotification(req: Request, res: Response) {
  try {
    res.json(await customerService.readNotification(auth(req).userId, numericParam(req.params.notificationId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    res.json(await customerService.updateProfile(auth(req).userId, req.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updatePreferences(req: Request, res: Response) {
  try {
    res.json(await customerService.updatePreferences(auth(req).userId, req.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createAddress(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createAddress(auth(req).userId, req.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateAddress(req: Request, res: Response) {
  try {
    res.json(
      await customerService.updateAddress(
        auth(req).userId,
        numericParam(req.params.addressId),
        req.body,
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function setDefaultAddress(req: Request, res: Response) {
  try {
    res.json(
      await customerService.setDefaultAddress(auth(req).userId, numericParam(req.params.addressId)),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function deleteAddress(req: Request, res: Response) {
  try {
    res.json(
      await customerService.deleteAddress(auth(req).userId, numericParam(req.params.addressId)),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function createPaymentMethod(req: Request, res: Response) {
  try {
    res.status(201).json(await customerService.createPaymentMethod(auth(req).userId, req.body))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updatePaymentMethod(req: Request, res: Response) {
  try {
    res.json(
      await customerService.updatePaymentMethod(
        auth(req).userId,
        numericParam(req.params.paymentMethodId),
        req.body,
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function setDefaultPaymentMethod(req: Request, res: Response) {
  try {
    res.json(
      await customerService.setDefaultPaymentMethod(
        auth(req).userId,
        numericParam(req.params.paymentMethodId),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function deletePaymentMethod(req: Request, res: Response) {
  try {
    res.json(
      await customerService.deletePaymentMethod(
        auth(req).userId,
        numericParam(req.params.paymentMethodId),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}
