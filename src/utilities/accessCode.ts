import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/** Our stored format: 16-byte salt hex + ":" + 64-byte hash hex */
export function isHashedAccessCode(value: string): boolean {
  const [salt, hash] = value.split(':')
  return Boolean(
    salt &&
      hash &&
      value.split(':').length === 2 &&
      /^[a-f0-9]{32}$/i.test(salt) &&
      /^[a-f0-9]{128}$/i.test(hash),
  )
}

export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(code.normalize('NFKC'), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyAccessCode(code: string, stored: string): boolean {
  if (!isHashedAccessCode(stored)) return false

  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  try {
    const test = scryptSync(code.normalize('NFKC'), salt, 64)
    const expected = Buffer.from(hash, 'hex')
    if (test.length !== expected.length) return false
    return timingSafeEqual(test, expected)
  } catch {
    return false
  }
}
