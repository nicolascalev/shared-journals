'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import config from '@payload-config'

import {
  EVENT_SESSION_COOKIE,
  buildEventSession,
  encodeEventSession,
  getEventSessionForSlug,
  sessionCookieOptions,
} from '@/utilities/eventSession'
import { verifyAccessCode } from '@/utilities/accessCode'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function unlockEvent(slug: string, code: string): Promise<ActionResult> {
  const trimmed = code.trim()
  if (!trimmed) return { ok: false, error: 'Enter the access code.' }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    context: { keepAccessCode: true },
  })

  const event = result.docs[0]
  if (!event?.accessCode || !verifyAccessCode(trimmed, event.accessCode)) {
    return { ok: false, error: 'Invalid access code.' }
  }

  const session = buildEventSession({
    eventId: event.id,
    slug: event.slug,
    endDate: event.endDate,
  })

  const jar = await cookies()
  jar.set(EVENT_SESSION_COOKIE, encodeEventSession(session), sessionCookieOptions(session.exp))

  revalidatePath(`/events/${slug}`)
  return { ok: true }
}

export async function selectMember(slug: string, memberId: string): Promise<ActionResult> {
  const session = await getEventSessionForSlug(slug)
  if (!session) return { ok: false, error: 'Unlock this event first.' }

  const payload = await getPayload({ config })
  const event = await payload.findByID({
    collection: 'events',
    id: session.eventId,
    depth: 0,
    overrideAccess: true,
  })

  const memberIds = (event.members || []).map((m) => (typeof m === 'object' ? String(m.id) : String(m)))
  if (!memberIds.includes(String(memberId))) {
    return { ok: false, error: 'That member is not in this event.' }
  }

  const next = buildEventSession({
    eventId: session.eventId,
    slug: session.slug,
    endDate: event.endDate,
    memberId,
  })
  next.exp = session.exp

  const jar = await cookies()
  jar.set(EVENT_SESSION_COOKIE, encodeEventSession(next), sessionCookieOptions(next.exp))

  revalidatePath(`/events/${slug}`)
  return { ok: true }
}

export async function lockEvent(slug: string): Promise<ActionResult> {
  const jar = await cookies()
  jar.delete(EVENT_SESSION_COOKIE)
  revalidatePath(`/events/${slug}`)
  return { ok: true }
}
