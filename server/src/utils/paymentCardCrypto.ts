import crypto from 'crypto'
import { env } from '../config/env'

const algorithm = 'aes-256-gcm'
const version = 'v1'

function encryptionKey() {
  const configuredKey = env.paymentCardEncryptionKey.trim()

  if (!configuredKey && env.isProduction) {
    throw new Error('PAYMENT_CARD_ENCRYPTION_KEY is required to store payment cards.')
  }

  if (/^[0-9a-f]{64}$/i.test(configuredKey)) {
    return Buffer.from(configuredKey, 'hex')
  }

  if (configuredKey.startsWith('base64:')) {
    const key = Buffer.from(configuredKey.slice('base64:'.length), 'base64')

    if (key.length === 32) {
      return key
    }
  }

  return crypto.createHash('sha256').update(configuredKey || env.jwtSecret).digest()
}

export function encryptPaymentCardNumber(cardNumber: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(algorithm, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(cardNumber, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    version,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptPaymentCardNumber(encryptedCardNumber: string) {
  const [storedVersion, iv, authTag, encrypted] = encryptedCardNumber.split(':')

  if (storedVersion !== version || !iv || !authTag || !encrypted) {
    throw new Error('Unsupported encrypted payment card format.')
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
