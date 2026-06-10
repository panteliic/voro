export function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizePassword(value: unknown) {
  return typeof value === 'string' ? value : ''
}
