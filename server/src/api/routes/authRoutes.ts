import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middleware/authenticate'

export const authRoutes = Router()

authRoutes.post('/signup', authController.signup)
authRoutes.post('/login', authController.login)
authRoutes.get('/auth0/callback', authController.auth0Callback)
authRoutes.get('/auth0/:provider', authController.startAuth0Login)
authRoutes.post('/refresh', authController.refresh)
authRoutes.post('/logout', authController.logout)
authRoutes.post('/request-password-reset', authController.requestPasswordReset)
authRoutes.post('/verify-password-reset-code', authController.verifyPasswordResetCode)
authRoutes.post('/reset-password', authController.resetPassword)
authRoutes.post('/change-password', authenticate, authController.changePassword)
authRoutes.post('/resend-code', authController.resendCode)
authRoutes.post('/verify-email', authController.verifyEmail)
