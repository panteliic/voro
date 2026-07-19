import { Router } from 'express'
import * as restaurantAuthController from '../controllers/restaurantAuthController'

export const restaurantAuthRoutes = Router()

restaurantAuthRoutes.post('/login', restaurantAuthController.login)
restaurantAuthRoutes.post('/refresh', restaurantAuthController.refresh)
restaurantAuthRoutes.post('/logout', restaurantAuthController.logout)
restaurantAuthRoutes.post('/setup-password', restaurantAuthController.setupPassword)
