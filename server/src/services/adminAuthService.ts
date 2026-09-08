import bcrypt from 'bcryptjs'
import * as authRepository from '../repositories/authRepository'
import * as authService from './authService'
import type { LoginPayload } from '../types/auth'
import type { RegisterAdminPayload } from '../types/admin'
import { HttpError } from '../utils/httpError'

function validateAdminInput(payload: RegisterAdminPayload) {
  if (!payload.name || !payload.email || !payload.password) {
    throw new HttpError(400, 'Name, email, and password are required.')
  }

  if (!payload.email.includes('@')) {
    throw new HttpError(400, 'Enter a valid email address.')
  }

  if (payload.password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
  }
}

export async function login(payload: LoginPayload) {
  const result = await authService.login(payload)

  if (result.user.role !== 'admin') {
    throw new HttpError(403, 'This app is only for admin accounts.')
  }

  return result
}

export async function registerFirstAdmin(payload: RegisterAdminPayload) {
  validateAdminInput(payload)

  const passwordHash = await bcrypt.hash(payload.password, 10)
  const result = await authRepository.createFirstActiveAdmin({
    name: payload.name,
    email: payload.email,
    passwordHash,
  })

  if (!result.user) {
    throw new HttpError(
      409,
      result.reason === 'email_exists'
        ? 'An account with this email already exists.'
        : 'An active admin account already exists.',
    )
  }

  const user = result.user

  return {
    message: 'Admin account created.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleName,
    },
  }
}
