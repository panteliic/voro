import { Router } from 'express'
import * as authController from '../controllers/authController'

export const authRoutes = Router()

authRoutes.post('/signup', authController.signup)
authRoutes.post('/login', authController.login)
authRoutes.post('/refresh', authController.refresh)
authRoutes.post('/logout', authController.logout)
authRoutes.post('/request-password-reset', authController.requestPasswordReset)
authRoutes.post('/verify-password-reset-code', authController.verifyPasswordResetCode)
authRoutes.post('/reset-password', authController.resetPassword)
authRoutes.post('/resend-code', authController.resendCode)
authRoutes.post('/verify-email', authController.verifyEmail)
