import crypto from 'crypto'

export function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}
