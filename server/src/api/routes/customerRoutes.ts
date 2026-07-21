import { Router } from 'express'
import * as customerController from '../controllers/customerController'
import { authenticate } from '../middleware/authenticate'

export const customerRoutes = Router()

customerRoutes.use(authenticate)
customerRoutes.get('/profile', customerController.getProfile)
customerRoutes.get('/address-suggestions', customerController.searchAddressSuggestions)
customerRoutes.get('/restaurants', customerController.listRestaurants)
customerRoutes.get('/restaurants/:restaurantId', customerController.getRestaurantMenu)
customerRoutes.get('/favorites', customerController.listFavorites)
customerRoutes.put('/favorites/:restaurantId', customerController.setFavorite)
customerRoutes.delete('/favorites/:restaurantId', customerController.setFavorite)
customerRoutes.post('/orders', customerController.createOrder)
customerRoutes.get('/orders', customerController.getOrders)
customerRoutes.post('/orders/:orderId/cancel', customerController.cancelOrder)
customerRoutes.post('/orders/:orderId/issues', customerController.createOrderIssue)
customerRoutes.post('/orders/:orderId/review', customerController.createOrderReview)
customerRoutes.post('/orders/:orderId/reorder', customerController.reorderOrder)
customerRoutes.get('/orders/:orderId/messages', customerController.getOrderMessages)
customerRoutes.post('/orders/:orderId/messages', customerController.sendOrderMessage)
customerRoutes.get('/orders/:orderId/route', customerController.getOrderRoute)
customerRoutes.get('/orders/:orderId/tracking', customerController.getOrderTracking)
customerRoutes.get('/notifications', customerController.getNotifications)
customerRoutes.patch('/notifications/:notificationId/read', customerController.readNotification)
customerRoutes.patch('/profile', customerController.updateProfile)
customerRoutes.patch('/preferences', customerController.updatePreferences)
customerRoutes.post('/addresses', customerController.createAddress)
customerRoutes.patch('/addresses/:addressId', customerController.updateAddress)
customerRoutes.patch('/addresses/:addressId/default', customerController.setDefaultAddress)
customerRoutes.delete('/addresses/:addressId', customerController.deleteAddress)
customerRoutes.post('/payment-methods', customerController.createPaymentMethod)
customerRoutes.patch('/payment-methods/:paymentMethodId', customerController.updatePaymentMethod)
customerRoutes.patch(
  '/payment-methods/:paymentMethodId/default',
  customerController.setDefaultPaymentMethod,
)
customerRoutes.delete('/payment-methods/:paymentMethodId', customerController.deletePaymentMethod)
