import { Router } from 'express'
import * as restaurantController from '../controllers/restaurantController'
import { authenticateRestaurant } from '../middleware/authenticate'

export const restaurantRoutes = Router()

restaurantRoutes.use(authenticateRestaurant)
restaurantRoutes.get('/me', restaurantController.getDashboard)
restaurantRoutes.get('/orders/completed', restaurantController.getCompletedOrders)
restaurantRoutes.patch('/operations', restaurantController.updateOperations)
restaurantRoutes.get('/notifications', restaurantController.getNotifications)
restaurantRoutes.patch('/notifications/:notificationId/read', restaurantController.readNotification)
restaurantRoutes.patch('/orders/:orderId/status', restaurantController.updateOrderStatus)
restaurantRoutes.post('/categories', restaurantController.createCategory)
restaurantRoutes.post('/products', restaurantController.createProduct)
restaurantRoutes.patch('/products/:productId', restaurantController.updateProduct)
