import { Router } from 'express'
import * as restaurantController from '../controllers/restaurantController'
import { authenticate, requireRole } from '../middleware/authenticate'

export const restaurantRoutes = Router()

restaurantRoutes.use(authenticate, requireRole('restaurant'))
restaurantRoutes.get('/me', restaurantController.getDashboard)
restaurantRoutes.patch('/orders/:orderId/status', restaurantController.updateOrderStatus)
restaurantRoutes.post('/categories', restaurantController.createCategory)
restaurantRoutes.post('/products', restaurantController.createProduct)
restaurantRoutes.patch('/products/:productId', restaurantController.updateProduct)
