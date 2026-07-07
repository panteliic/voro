import { Router } from 'express'
import * as adminController from '../controllers/adminController'
import { authenticate, requireRole } from '../middleware/authenticate'

export const adminRoutes = Router()

adminRoutes.post('/bootstrap', adminController.bootstrapAdmin)
adminRoutes.post('/auth/login', adminController.login)
adminRoutes.post('/auth/register', adminController.registerAdmin)

adminRoutes.use(authenticate, requireRole('admin'))
adminRoutes.get('/me', adminController.getMe)
adminRoutes.get('/overview', adminController.getOverview)
adminRoutes.get('/dashboard/stats', adminController.getDashboardStats)

adminRoutes.get('/users', adminController.listUsers)
adminRoutes.get('/users/:userId', adminController.getUser)
adminRoutes.patch('/users/:userId/status', adminController.updateUserStatus)

adminRoutes.get('/restaurants', adminController.listRestaurants)
adminRoutes.get('/restaurant-categories', adminController.listRestaurantCategories)
adminRoutes.post('/restaurants', adminController.createRestaurant)
adminRoutes.get('/restaurants/:restaurantId', adminController.getRestaurant)
adminRoutes.patch('/restaurants/:restaurantId', adminController.updateRestaurant)
adminRoutes.patch('/restaurants/:restaurantId/status', adminController.updateRestaurantStatus)
adminRoutes.post(
  '/restaurants/:restaurantId/password-reset',
  adminController.resetRestaurantOwnerPassword,
)

adminRoutes.get('/drivers', adminController.listCouriers)
adminRoutes.post('/drivers', adminController.createCourier)
adminRoutes.get('/drivers/:driverId', adminController.getCourier)
adminRoutes.patch('/drivers/:driverId/status', adminController.updateCourierStatus)
adminRoutes.post('/drivers/:driverId/password-reset', adminController.resetCourierPassword)

adminRoutes.get('/couriers', adminController.listCouriers)
adminRoutes.post('/couriers', adminController.createCourier)
adminRoutes.get('/couriers/:driverId', adminController.getCourier)
adminRoutes.patch('/couriers/:driverId/status', adminController.updateCourierStatus)
adminRoutes.post('/couriers/:driverId/password-reset', adminController.resetCourierPassword)

adminRoutes.get('/orders', adminController.listOrders)
adminRoutes.get('/orders/:orderId', adminController.getOrder)
