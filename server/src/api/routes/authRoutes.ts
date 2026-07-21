import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middleware/authenticate'
import { rateLimit } from '../middleware/rateLimit'

export const authRoutes = Router()

const authAttemptLimit = rateLimit({ namespace: 'auth-attempt', limit: 8, windowSeconds: 15 * 60 })
const emailDeliveryLimit = rateLimit({ namespace: 'auth-email', limit: 4, windowSeconds: 15 * 60 })
const refreshLimit = rateLimit({ namespace: 'auth-refresh', limit: 30, windowSeconds: 15 * 60 })

authRoutes.post('/signup', emailDeliveryLimit, authController.signup)
authRoutes.post('/login', authAttemptLimit, authController.login)
authRoutes.get('/auth0/callback', authController.auth0Callback)
authRoutes.get('/auth0/:provider', authController.startAuth0Login)
authRoutes.post('/refresh', refreshLimit, authController.refresh)
authRoutes.post('/logout', authController.logout)
authRoutes.post('/request-password-reset', emailDeliveryLimit, authController.requestPasswordReset)
authRoutes.post('/verify-password-reset-code', authAttemptLimit, authController.verifyPasswordResetCode)
authRoutes.post('/reset-password', authAttemptLimit, authController.resetPassword)
authRoutes.post('/change-password', authenticate, authAttemptLimit, authController.changePassword)
authRoutes.post('/resend-code', emailDeliveryLimit, authController.resendCode)
authRoutes.post('/verify-email', authAttemptLimit, authController.verifyEmail)
