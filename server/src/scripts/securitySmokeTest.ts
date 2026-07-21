import assert from 'node:assert/strict'
import { passwordValidationMessage, sanitizePlainText } from '../utils/securityInput'

function run() {
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
