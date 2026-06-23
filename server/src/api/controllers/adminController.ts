import type { Request, Response } from 'express'
import * as adminService from '../../services/adminService'
import { normalizeEmail, normalizePassword, normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

export async function bootstrapAdmin(req: Request, res: Response) {
  try {
    const result = await adminService.bootstrapAdmin({
      name: normalizeText(req.body.name),
      email: normalizeEmail(req.body.email),
      password: normalizePassword(req.body.password),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function listRestaurants(_req: Request, res: Response) {
  try {
    res.json({ restaurants: await adminService.listRestaurants() })
  } catch (error) {
    sendError(error, res)
  }
}

export async function createRestaurant(req: Request, res: Response) {
  try {
    const result = await adminService.createRestaurant({
      ownerName: normalizeText(req.body.ownerName),
      ownerEmail: normalizeEmail(req.body.ownerEmail),
      restaurantName: normalizeText(req.body.restaurantName),
      description: normalizeText(req.body.description),
      phone: normalizeText(req.body.phone),
      email: normalizeEmail(req.body.email),
      imageUrl: normalizeText(req.body.imageUrl),
      categoryName: normalizeText(req.body.categoryName),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}
