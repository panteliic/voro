const markupTag = /<\/?[a-z][^>]*>/gi
const disallowedControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const invisibleCharacters = /[\u200B-\u200D\uFEFF]/g

/**
 * Voro stores user text as plain text only. React already escapes text at render
 * time, but stripping markup here prevents an unsafe consumer from turning a
 * saved message, review, address label, or note into executable HTML later.
 */
export function sanitizePlainText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return ''

  return value
    .normalize('NFKC')
    .replace(disallowedControlCharacters, '')
    .replace(invisibleCharacters, '')
    .replace(markupTag, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maximumLength)
}

export function passwordValidationMessage(password: string) {
  if (password.length < 10 || password.length > 128) {
    return 'Password must be between 10 and 128 characters.'
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.'
  }

  if (/^\s|\s$/.test(password)) {
    return 'Password cannot start or end with whitespace.'
  }

  return null
}
