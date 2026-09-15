import { Router } from 'express'
import * as restaurantAuthController from '../controllers/restaurantAuthController'
import { rateLimit } from '../middleware/rateLimit'

export const restaurantAuthRoutes = Router()

const authAttemptLimit = rateLimit({
  namespace: 'restaurant-auth-attempt',
  limit: 8,
  windowSeconds: 15 * 60,
})
const emailDeliveryLimit = rateLimit({
  namespace: 'restaurant-auth-email',
  limit: 4,
  windowSeconds: 15 * 60,
})

restaurantAuthRoutes.post('/login', authAttemptLimit, restaurantAuthController.login)
restaurantAuthRoutes.post('/refresh', restaurantAuthController.refresh)
restaurantAuthRoutes.post('/logout', restaurantAuthController.logout)
restaurantAuthRoutes.post(
  '/request-password-reset',
  emailDeliveryLimit,
  restaurantAuthController.requestPasswordReset,
)
restaurantAuthRoutes.post(
  '/setup-password',
  authAttemptLimit,
  restaurantAuthController.setupPassword,
)
