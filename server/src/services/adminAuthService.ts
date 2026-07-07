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

  const existingAdmins = await authRepository.countUsersByRole('admin')

  if (existingAdmins > 0) {
    throw new HttpError(409, 'Admin account already exists.')
  }

  const existingUser = await authRepository.findUserByEmail(payload.email)

  if (existingUser) {
    throw new HttpError(409, 'An account with this email already exists.')
  }

  const passwordHash = await bcrypt.hash(payload.password, 10)
  const user = await authRepository.createVerifiedUser({
    name: payload.name,
    email: payload.email,
    passwordHash,
    roleId: 4,
  })

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
