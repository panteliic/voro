import crypto from 'node:crypto'
import { env } from '../config/env'

export function messageEncryptionKey() {
  const value = env.messageEncryptionKey
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be a random 32-byte hex key.')
  }
  return Buffer.from(value, 'hex')
}

export function encryptMessage(body: string, orderId: string | number, senderId: string | number) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', messageEncryptionKey(), iv)
  cipher.setAAD(Buffer.from(`order-message:v1:${orderId}:${senderId}`))
  const ciphertext = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decryptMessage(body: string, orderId: string | number, senderId: string | number) {
  const parts = body.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted message.')
  const iv = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted message.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', messageEncryptionKey(), iv)
  decipher.setAAD(Buffer.from(`order-message:v1:${orderId}:${senderId}`))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8')
}
