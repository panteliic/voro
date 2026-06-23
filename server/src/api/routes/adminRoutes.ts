import { Router } from 'express'
import * as adminController from '../controllers/adminController'
import { authenticate, requireRole } from '../middleware/authenticate'

export const adminRoutes = Router()

adminRoutes.post('/bootstrap', adminController.bootstrapAdmin)
adminRoutes.use(authenticate, requireRole('admin'))
adminRoutes.get('/restaurants', adminController.listRestaurants)
adminRoutes.post('/restaurants', adminController.createRestaurant)
