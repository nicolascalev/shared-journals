import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const EVENT_SESSION_COOKIE = 'event_session'
export const WELCOME_PENDING_COOKIE = 'event_welcome_pending'

export type EventSession = {
  eventId: number | string
  slug: string
  memberId?: number | string | null
  exp: number
}

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is not set')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function encodeEventSession(session: EventSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function decodeEventSession(token: string | undefined | null): EventSession | null {
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as EventSession
    if (!session?.eventId || !session?.slug || !session?.exp) return null
    if (Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
}

export function buildEventSession(args: {
  eventId: number | string
  slug: string
  endDate?: string | null
  memberId?: number | string | null
}): EventSession {
  const thirtyDays = 1000 * 60 * 60 * 24 * 30
  const endMs = args.endDate ? new Date(args.endDate).getTime() + thirtyDays : Date.now() + thirtyDays
  const exp = Math.max(Date.now() + thirtyDays, endMs)

  return {
    eventId: args.eventId,
    slug: args.slug,
    memberId: args.memberId ?? null,
    exp,
  }
}

export async function getEventSession(): Promise<EventSession | null> {
  const jar = await cookies()
  return decodeEventSession(jar.get(EVENT_SESSION_COOKIE)?.value)
}

export async function getEventSessionForSlug(slug: string): Promise<EventSession | null> {
  const session = await getEventSession()
  if (!session || session.slug !== slug) return null
  return session
}

export function sessionCookieOptions(exp: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(exp),
  }
}
