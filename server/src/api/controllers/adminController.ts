import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authenticate'
import * as adminAuthService from '../../services/adminAuthService'
import * as adminService from '../../services/adminService'
import { normalizeEmail, normalizePassword, normalizeText } from '../../utils/authInput'
import { sendError } from '../../utils/sendError'

function auth(req: Request) {
  return (req as AuthenticatedRequest).auth
}

function numericParam(value: unknown) {
  const param = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(param)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function booleanField(value: unknown, fallback = true) {
  return typeof value === 'boolean' ? value : fallback
}

function numericArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function queryText(value: unknown) {
  return Array.isArray(value) ? normalizeText(value[0]) : normalizeText(value)
}

export async function login(req: Request, res: Response) {
  try {
    const result = await adminAuthService.login({
      email: normalizeEmail(req.body.email),
      password: normalizePassword(req.body.password),
    })

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function registerAdmin(req: Request, res: Response) {
  try {
    const result = await adminAuthService.registerFirstAdmin({
      name: normalizeText(req.body.name),
      email: normalizeEmail(req.body.email),
      password: normalizePassword(req.body.password),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const current = auth(req)
    const user = await adminService.getUser(current.userId)

    res.json({ user })
  } catch (error) {
    sendError(error, res)
  }
}

export const bootstrapAdmin = registerAdmin

export async function getOverview(_req: Request, res: Response) {
  try {
    res.json(await adminService.getOverview())
  } catch (error) {
    sendError(error, res)
  }
}

export async function getDashboardStats(_req: Request, res: Response) {
  try {
    res.json({ stats: await adminService.getDashboardStats() })
  } catch (error) {
    sendError(error, res)
  }
}

export async function listUsers(_req: Request, res: Response) {
  try {
    res.json({ users: await adminService.listUsers() })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    res.json({ user: await adminService.getUser(numericParam(req.params.userId)) })
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  try {
    const result = await adminService.updateUserStatus(
      numericParam(req.params.userId),
      booleanField(req.body.isActive),
      auth(req).userId,
    )

    res.json({ user: result })
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

export async function listRestaurantCategories(_req: Request, res: Response) {
  try {
    res.json({ categories: await adminService.listRestaurantCategories() })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getRestaurant(req: Request, res: Response) {
  try {
    res.json({ restaurant: await adminService.getRestaurant(numericParam(req.params.restaurantId)) })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getRestaurantAnalytics(req: Request, res: Response) {
  try {
    res.json(await adminService.getRestaurantAnalytics(numericParam(req.params.restaurantId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createRestaurant(req: Request, res: Response) {
  try {
    const result = await adminService.createRestaurant({
      contactName: normalizeText(req.body.contactName),
      contactEmail: normalizeEmail(req.body.contactEmail),
      restaurantName: normalizeText(req.body.restaurantName),
      description: normalizeText(req.body.description),
      phone: normalizeText(req.body.phone),
      email: normalizeEmail(req.body.email),
      imageUrl: normalizeText(req.body.imageUrl),
      address: normalizeText(req.body.address),
      categoryName: normalizeText(req.body.categoryName),
      categoryIds: numericArray(req.body.categoryIds),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function resolveRestaurantLocation(req: Request, res: Response) {
  try {
    res.json(await adminService.resolveRestaurantLocation(normalizeText(req.body.address)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function searchRestaurantAddressSuggestions(req: Request, res: Response) {
  try {
    res.json(await adminService.searchRestaurantAddressSuggestions(queryText(req.query.q)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateRestaurant(req: Request, res: Response) {
  try {
    const result = await adminService.updateRestaurant(numericParam(req.params.restaurantId), {
      name: normalizeText(req.body.name),
      categoryName: normalizeText(req.body.categoryName),
      description: normalizeText(req.body.description),
      phone: normalizeText(req.body.phone),
      email: normalizeEmail(req.body.email),
      imageUrl: normalizeText(req.body.imageUrl),
      isActive: booleanField(req.body.isActive),
      categoryIds: numericArray(req.body.categoryIds),
    })

    res.json({ restaurant: result })
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateRestaurantStatus(req: Request, res: Response) {
  try {
    const result = await adminService.updateRestaurantStatus(
      numericParam(req.params.restaurantId),
      booleanField(req.body.isActive),
    )

    res.json({ restaurant: result })
  } catch (error) {
    sendError(error, res)
  }
}

export async function resetRestaurantAccess(req: Request, res: Response) {
  try {
    const result = await adminService.resetRestaurantAccess(
      numericParam(req.params.restaurantId),
    )

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function listCouriers(_req: Request, res: Response) {
  try {
    res.json({ couriers: await adminService.listCouriers() })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getCourier(req: Request, res: Response) {
  try {
    res.json({ courier: await adminService.getCourier(numericParam(req.params.driverId)) })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getCourierAnalytics(req: Request, res: Response) {
  try {
    res.json(await adminService.getCourierAnalytics(numericParam(req.params.driverId)))
  } catch (error) {
    sendError(error, res)
  }
}

export async function createCourier(req: Request, res: Response) {
  try {
    const result = await adminService.createCourier({
      name: normalizeText(req.body.name),
      email: normalizeEmail(req.body.email),
      phone: normalizeText(req.body.phone),
      vehicleType: normalizeText(req.body.vehicleType),
    })

    res.status(201).json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function updateCourierStatus(req: Request, res: Response) {
  try {
    const result = await adminService.updateCourierStatus(
      numericParam(req.params.driverId),
      booleanField(req.body.isAvailable),
    )

    res.json({ courier: result })
  } catch (error) {
    sendError(error, res)
  }
}

export async function resetCourierPassword(req: Request, res: Response) {
  try {
    const result = await adminService.resetCourierPassword(numericParam(req.params.driverId))

    res.json(result)
  } catch (error) {
    sendError(error, res)
  }
}

export async function listOrders(req: Request, res: Response) {
  try {
    res.json({ orders: await adminService.listOrders(queryText(req.query.status)) })
  } catch (error) {
    sendError(error, res)
  }
}

export async function getOrder(req: Request, res: Response) {
  try {
    res.json({ order: await adminService.getOrder(numericParam(req.params.orderId)) })
  } catch (error) {
    sendError(error, res)
  }
}
