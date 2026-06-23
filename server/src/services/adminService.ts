import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import * as authRepository from '../repositories/authRepository'
import * as restaurantRepository from '../repositories/restaurantRepository'
import type { CreateRestaurantPayload } from '../types/restaurant'
import { HttpError } from '../utils/httpError'
import { generateOtp } from '../utils/otp'

function validateNameEmail(name: string, email: string) {
  if (!name || !email) {
    throw new HttpError(400, 'Name and email are required.')
  }

  if (!email.includes('@')) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
}

function validateUserInput(name: string, email: string, password: string) {
  validateNameEmail(name, email)

  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
  }
}

export async function bootstrapAdmin(payload: {
  name: string
  email: string
  password: string
}) {
  validateUserInput(payload.name, payload.email, payload.password)

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

export async function createRestaurant(payload: CreateRestaurantPayload) {
  validateNameEmail(payload.ownerName, payload.ownerEmail)

  if (!payload.restaurantName) {
    throw new HttpError(400, 'Restaurant name is required.')
  }

  const existingUser = await authRepository.findUserByEmail(payload.ownerEmail)

  if (existingUser) {
    throw new HttpError(409, 'An account with this email already exists.')
  }

  const ownerPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10)
  const setupCode = generateOtp()
  const setupCodeHash = await bcrypt.hash(setupCode, 10)
  const result = await restaurantRepository.createRestaurantWithOwner({
    ...payload,
    ownerPasswordHash,
  })

  await authRepository.savePasswordResetCode({
    userId: result.owner.id,
    codeHash: setupCodeHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    ...result,
    setupCode,
  }
}

export function listRestaurants() {
  return restaurantRepository.listRestaurants()
}
