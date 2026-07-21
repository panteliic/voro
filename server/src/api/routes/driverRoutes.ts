import { Router, type Request } from 'express'
import * as driverController from '../controllers/driverController'
import { authenticate, requireRole } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'
import * as pushController from '../controllers/pushController'

export const driverRoutes = Router()

driverRoutes.use(authenticate, requireRole('courier'))
const driverRateLimitKey = (request: Request) =>
  String((request as { auth?: { userId?: number } }).auth?.userId || request.ip)
const driverWriteLimit = rateLimit({ namespace: 'driver-write', limit: 80, windowSeconds: 10 * 60, key: driverRateLimitKey })
const driverMessageLimit = rateLimit({ namespace: 'driver-message', limit: 40, windowSeconds: 10 * 60, key: driverRateLimitKey })
// GPS updates are expected to be frequent during an active delivery. Keep a
// separate per-courier quota so location tracking cannot exhaust the much
// smaller mutation limit used for accepting offers or changing delivery state.
const driverPresenceLimit = rateLimit({ namespace: 'driver-presence', limit: 900, windowSeconds: 10 * 60, key: driverRateLimitKey })
driverRoutes.get('/me', driverController.getDashboard)
driverRoutes.patch('/presence', driverPresenceLimit, driverController.updatePresence)
driverRoutes.post('/offers/:offerId/accept', driverWriteLimit, driverController.acceptOffer)
driverRoutes.post('/offers/:offerId/decline', driverWriteLimit, driverController.declineOffer)
driverRoutes.patch('/deliveries/:deliveryId/status', driverWriteLimit, driverController.updateDeliveryStatus)
driverRoutes.post('/deliveries/:deliveryId/withdraw', driverWriteLimit, driverController.withdrawFromDelivery)
driverRoutes.get('/deliveries/:deliveryId/route', driverController.getDeliveryRoute)
driverRoutes.get('/orders/:orderId/messages', driverController.getOrderMessages)
driverRoutes.post('/orders/:orderId/messages', driverMessageLimit, driverController.sendOrderMessage)
driverRoutes.post('/push-subscriptions', driverWriteLimit, pushController.registerPushSubscription)
driverRoutes.delete('/push-subscriptions', driverWriteLimit, pushController.removePushSubscription)
driverRoutes.get('/notifications', driverController.getNotifications)
driverRoutes.patch('/notifications/:notificationId/read', driverController.readNotification)
