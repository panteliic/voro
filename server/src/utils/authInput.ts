import { sanitizePlainText } from './securityInput'

export function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function normalizeText(value: unknown) {
  return sanitizePlainText(value, 2_000)
}

export function normalizePassword(value: unknown) {
  return typeof value === 'string' ? value : ''
}
