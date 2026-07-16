import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import * as restaurantService from '../../services/restaurantService'
import { normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

function auth(req: Request) {
  return (req as AuthenticatedRequest).auth
}

function numericField(value: unknown) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function nullableNumericField(value: unknown) {
  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

function numericParam(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(param)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

export async function getDashboard(req: Request, res: Response) {
  try {
    res.json(await restaurantService.getDashboard(auth(req).userId))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    res.json(
      await restaurantService.updateOrderStatus(
        auth(req).userId,
        numericParam(req.params.orderId),
        normalizeText(req.body.status).toLowerCase(),
      ),
    )
  } catch (error) {
    sendError(error, res)
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const result = await restaurantService.createCategory(auth(req).userId, {
      name: normalizeText(req.body.name),
      description: normalizeText(req.body.description),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const result = await restaurantService.createProduct(auth(req).userId, {
      categoryId: nullableNumericField(req.body.categoryId),
      name: normalizeText(req.body.name),
      description: normalizeText(req.body.description),
      price: numericField(req.body.price),
      imageUrl: normalizeText(req.body.imageUrl),
      isAvailable: req.body.isAvailable !== false,
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const result = await restaurantService.updateProduct(
      auth(req).userId,
      numericParam(req.params.productId),
      {
        categoryId: nullableNumericField(req.body.categoryId),
        name: normalizeText(req.body.name),
        description: normalizeText(req.body.description),
        price: numericField(req.body.price),
        imageUrl: normalizeText(req.body.imageUrl),
        isAvailable: req.body.isAvailable !== false,
      },
    )

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}
