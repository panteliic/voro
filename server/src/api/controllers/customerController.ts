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

export async function getProfile(req: Request, res: Response) {
  try {
    res.json(await customerService.getCustomerProfile(auth(req).userId))
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
