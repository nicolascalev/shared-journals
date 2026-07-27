import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(code.normalize('NFKC'), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyAccessCode(code: string, stored: string): boolean {
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
