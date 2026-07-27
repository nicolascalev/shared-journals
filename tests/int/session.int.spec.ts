import { describe, expect, it } from 'vitest'

import { hashAccessCode, verifyAccessCode } from '../../src/utilities/accessCode'
import {
  buildEventSession,
  decodeEventSession,
  encodeEventSession,
} from '../../src/utilities/eventSession'

describe('accessCode', () => {
  it('hashes and verifies codes', () => {
    const hash = hashAccessCode('fitness123')
    expect(verifyAccessCode('fitness123', hash)).toBe(true)
    expect(verifyAccessCode('wrong', hash)).toBe(false)
  })
})

describe('eventSession', () => {
  it('round-trips a signed session', () => {
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-for-vitest'
    const session = buildEventSession({
      eventId: 1,
      slug: 'summer-cut',
      endDate: new Date(Date.now() + 86400000).toISOString(),
      memberId: 2,
    })
    const token = encodeEventSession(session)
    const decoded = decodeEventSession(token)
    expect(decoded?.slug).toBe('summer-cut')
    expect(String(decoded?.memberId)).toBe('2')
  })

  it('rejects tampered tokens', () => {
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-for-vitest'
    const session = buildEventSession({ eventId: 1, slug: 'x' })
    const token = encodeEventSession(session)
    expect(decodeEventSession(token.slice(0, -2) + 'ab')).toBeNull()
  })
})
