import { Router } from 'express'
import * as customerController from '../controllers/customerController'
import { authenticate } from '../middleware/authenticate'

export const customerRoutes = Router()

customerRoutes.use(authenticate)
customerRoutes.get('/profile', customerController.getProfile)
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
