import { Router } from 'express'
import * as driverController from '../controllers/driverController'
import { authenticate, requireRole } from '../middleware/authenticate'

export const driverRoutes = Router()

driverRoutes.use(authenticate, requireRole('courier'))
driverRoutes.get('/me', driverController.getDashboard)
