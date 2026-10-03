import assert from 'node:assert/strict'
import { env } from '../config/env'
import { encryptMessage, decryptMessage } from '../utils/messageCrypto'
import { passwordValidationMessage, sanitizePlainText } from '../utils/securityInput'

function run() {
  const originalKey = env.messageEncryptionKey
  env.messageEncryptionKey = 'ab'.repeat(32)
  const message = 'Zdravo \u010d\u0107\u0161\u0111\u017e \u{1f44b}'
  const encrypted = encryptMessage(message, 42, 7)
  assert.equal(decryptMessage(encrypted, 42, 7), message)
  assert.notEqual(encrypted, encryptMessage(message, 42, 7))
  assert.ok(!encrypted.includes(message))
  assert.throws(() => decryptMessage(encrypted, 43, 7))
  assert.throws(() => decryptMessage(encrypted, 42, 8))
  const parts = encrypted.split(':')
  const ciphertext = Buffer.from(parts[3], 'base64')
  ciphertext[0] ^= 1
  parts[3] = ciphertext.toString('base64')
  assert.throws(() => decryptMessage(parts.join(':'), 42, 7))
  env.messageEncryptionKey = 'cd'.repeat(32)
  assert.throws(() => decryptMessage(encrypted, 42, 7))
  env.messageEncryptionKey = ''
  assert.throws(() => encryptMessage(message, 42, 7))
  env.messageEncryptionKey = originalKey

  assert.equal(sanitizePlainText('<img src=x onerror=alert(1)>Hello', 100), 'Hello')
  assert.equal(sanitizePlainText('  Normal\u0000 text\u200B  ', 100), 'Normal text')
  assert.equal(sanitizePlainText('A'.repeat(12), 5), 'AAAAA')

  assert.ok(passwordValidationMessage('short1'))
  assert.ok(passwordValidationMessage('onlyletters'))
  assert.ok(passwordValidationMessage(' password123'))
  assert.equal(passwordValidationMessage('valid-password-123'), null)

  console.log('Security input smoke tests passed.')
}

run()
