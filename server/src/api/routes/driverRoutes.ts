import { Router } from 'express'
import * as driverController from '../controllers/driverController'
import { authenticate, requireRole } from '../middleware/authenticate'

export const driverRoutes = Router()

driverRoutes.use(authenticate, requireRole('courier'))
driverRoutes.get('/me', driverController.getDashboard)
driverRoutes.patch('/presence', driverController.updatePresence)
driverRoutes.post('/offers/:offerId/accept', driverController.acceptOffer)
driverRoutes.post('/offers/:offerId/decline', driverController.declineOffer)
driverRoutes.patch('/deliveries/:deliveryId/status', driverController.updateDeliveryStatus)
driverRoutes.get('/deliveries/:deliveryId/route', driverController.getDeliveryRoute)
