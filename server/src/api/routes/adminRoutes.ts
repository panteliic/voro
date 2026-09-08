import { Router } from 'express'
import * as adminController from '../controllers/adminController'
import { authenticate, requireRole } from '../middleware/authenticate'
import { requireAdminBootstrapToken } from '../middleware/adminBootstrap'
import { rateLimit } from '../middleware/rateLimit'

export const adminRoutes = Router()

const adminLoginLimit = rateLimit({ namespace: 'admin-login', limit: 8, windowSeconds: 15 * 60 })
const adminBootstrapLimit = rateLimit({ namespace: 'admin-bootstrap', limit: 3, windowSeconds: 15 * 60 })

adminRoutes.post('/bootstrap', adminBootstrapLimit, requireAdminBootstrapToken, adminController.bootstrapAdmin)
adminRoutes.post('/auth/login', adminLoginLimit, adminController.login)

adminRoutes.use(authenticate, requireRole('admin'))
adminRoutes.get('/me', adminController.getMe)
adminRoutes.get('/overview', adminController.getOverview)
adminRoutes.get('/dashboard/stats', adminController.getDashboardStats)
adminRoutes.get('/promotions', adminController.listPromotions)
adminRoutes.post('/promotions', adminController.createPromotion)

adminRoutes.get('/users', adminController.listUsers)
adminRoutes.get('/users/:userId', adminController.getUser)
adminRoutes.patch('/users/:userId/status', adminController.updateUserStatus)

adminRoutes.get('/restaurants', adminController.listRestaurants)
adminRoutes.get('/restaurant-categories', adminController.listRestaurantCategories)
adminRoutes.get('/restaurant-location-suggestions', adminController.searchRestaurantAddressSuggestions)
adminRoutes.post('/restaurant-location', adminController.resolveRestaurantLocation)
adminRoutes.post('/restaurants', adminController.createRestaurant)
adminRoutes.get('/restaurants/:restaurantId/analytics', adminController.getRestaurantAnalytics)
adminRoutes.get('/restaurants/:restaurantId', adminController.getRestaurant)
adminRoutes.patch('/restaurants/:restaurantId', adminController.updateRestaurant)
adminRoutes.patch('/restaurants/:restaurantId/status', adminController.updateRestaurantStatus)
adminRoutes.post(
  '/restaurants/:restaurantId/password-reset',
  adminController.resetRestaurantAccess,
)

adminRoutes.get('/drivers', adminController.listCouriers)
adminRoutes.post('/drivers', adminController.createCourier)
adminRoutes.get('/drivers/:driverId/analytics', adminController.getCourierAnalytics)
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
adminRoutes.get('/orders/:orderId/messages', adminController.getOrderConversation)
adminRoutes.get('/operations', adminController.getOperations)
adminRoutes.post('/orders/:orderId/reassign', adminController.reassignOrder)
adminRoutes.patch('/dispatch-alerts/:alertId/acknowledge', adminController.acknowledgeDispatchAlert)
adminRoutes.patch('/issues/:issueId', adminController.updateIssue)
