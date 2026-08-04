'use server'

import { getPayload } from 'payload'
import { revalidatePath } from 'next/cache'
import config from '@payload-config'

import { getEventSessionForSlug } from '@/utilities/eventSession'
import { getEventPhase } from '@/utilities/eventPhase'
import { processEntryImage } from '@/utilities/processEntryImage'

export type EntryActionResult = { ok: true } | { ok: false; error: string }

async function requireSession(slug: string) {
  const session = await getEventSessionForSlug(slug)
  if (!session) {
    return { error: 'Unlock this event first.' as const, session: null }
  }
  return { error: null, session }
}

function assertEventAcceptsEntries(startDate: string, endDate: string): EntryActionResult | null {
  const phase = getEventPhase(startDate, endDate)
  if (phase === 'upcoming') return { ok: false, error: 'This event has not started yet.' }
  if (phase === 'finished') {
    return { ok: false, error: 'This event has finished. Logging is closed.' }
  }
  return null
}

export async function createEntry(formData: FormData): Promise<EntryActionResult> {
  try {
    const slug = String(formData.get('slug') || '')
    const { session, error } = await requireSession(slug)
    if (!session) return { ok: false, error: error || 'Unauthorized' }

    const memberId = String(formData.get('memberId') || session.memberId || '')
    const description = String(formData.get('description') || '').trim()
    const loggedAt = String(formData.get('loggedAt') || new Date().toISOString())
    const durationRaw = String(formData.get('durationMinutes') || '').trim()
    const image = formData.get('image')

    if (!memberId) return { ok: false, error: 'Pick who you are.' }
    if (!description) return { ok: false, error: 'Add a short description.' }

    const payload = await getPayload({ config })

    const event = await payload.findByID({
      collection: 'events',
      id: session.eventId,
      depth: 0,
      overrideAccess: true,
    })

    const phaseError = assertEventAcceptsEntries(event.startDate, event.endDate)
    if (phaseError) return phaseError

    const memberIds = (event.members || []).map((m) =>
      typeof m === 'object' ? String(m.id) : String(m),
    )
    if (!memberIds.includes(memberId)) {
      return { ok: false, error: 'That member is not in this event.' }
    }

    let imageId: number | string | undefined
    if (image && image instanceof File && image.size > 0) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer())
        const processed = await processEntryImage(buffer, image.name)
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: description.slice(0, 100),
          },
          file: {
            data: processed.data,
            mimetype: processed.mimetype,
            name: processed.name,
            size: processed.size,
          },
          overrideAccess: true,
        })
        imageId = media.id
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Could not process image.',
        }
      }
    }

    await payload.create({
      collection: 'entries',
      data: {
        event: Number(session.eventId),
        member: Number(memberId),
        description,
        loggedAt,
        durationMinutes: durationRaw ? Number(durationRaw) : undefined,
        image: imageId != null ? Number(imageId) : undefined,
      },
      overrideAccess: true,
    })

    revalidatePath(`/events/${slug}`)
    return { ok: true }
  } catch (err) {
    console.error('createEntry failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not save your entry. Please try again.',
    }
  }
}

export async function updateEntry(formData: FormData): Promise<EntryActionResult> {
  const slug = String(formData.get('slug') || '')
  const entryId = String(formData.get('entryId') || '')
  const { session, error } = await requireSession(slug)
  if (!session) return { ok: false, error: error || 'Unauthorized' }
  if (!entryId) return { ok: false, error: 'Missing entry.' }

  const description = String(formData.get('description') || '').trim()
  const loggedAt = String(formData.get('loggedAt') || '')
  const durationRaw = String(formData.get('durationMinutes') || '').trim()
  const image = formData.get('image')

  if (!description) return { ok: false, error: 'Add a short description.' }

  const payload = await getPayload({ config })
  const entry = await payload.findByID({
    collection: 'entries',
    id: entryId,
    depth: 0,
    overrideAccess: true,
  })

  const entryEventId = typeof entry.event === 'object' ? entry.event.id : entry.event
  const entryMemberId = typeof entry.member === 'object' ? entry.member.id : entry.member

  if (String(entryEventId) !== String(session.eventId)) {
    return { ok: false, error: 'Entry does not belong to this event.' }
  }

  if (!session.memberId || String(entryMemberId) !== String(session.memberId)) {
    return { ok: false, error: 'You can only edit your own entries. Pick your name first.' }
  }

  const event = await payload.findByID({
    collection: 'events',
    id: session.eventId,
    depth: 0,
    overrideAccess: true,
  })
  const phaseError = assertEventAcceptsEntries(event.startDate, event.endDate)
  if (phaseError) return phaseError

  let imageId: number | string | undefined | null = undefined
  if (image && image instanceof File && image.size > 0) {
    try {
      const buffer = Buffer.from(await image.arrayBuffer())
      const processed = await processEntryImage(buffer, image.name)
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: description.slice(0, 100),
        },
        file: {
          data: processed.data,
          mimetype: processed.mimetype,
          name: processed.name,
          size: processed.size,
        },
        overrideAccess: true,
      })
      imageId = media.id
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Could not process image.',
      }
    }
  }

  await payload.update({
    collection: 'entries',
    id: entryId,
    data: {
      description,
      loggedAt: loggedAt || entry.loggedAt,
      durationMinutes: durationRaw ? Number(durationRaw) : null,
      ...(imageId !== undefined ? { image: Number(imageId) } : {}),
    },
    overrideAccess: true,
  })

  revalidatePath(`/events/${slug}`)
  return { ok: true }
}

export async function deleteEntry(slug: string, entryId: string): Promise<EntryActionResult> {
  const { session, error } = await requireSession(slug)
  if (!session) return { ok: false, error: error || 'Unauthorized' }

  const payload = await getPayload({ config })
  const entry = await payload.findByID({
    collection: 'entries',
    id: entryId,
    depth: 0,
    overrideAccess: true,
  })

  const entryEventId = typeof entry.event === 'object' ? entry.event.id : entry.event
  const entryMemberId = typeof entry.member === 'object' ? entry.member.id : entry.member

  if (String(entryEventId) !== String(session.eventId)) {
    return { ok: false, error: 'Entry does not belong to this event.' }
  }

  if (!session.memberId || String(entryMemberId) !== String(session.memberId)) {
    return { ok: false, error: 'You can only delete your own entries. Pick your name first.' }
  }

  const event = await payload.findByID({
    collection: 'events',
    id: session.eventId,
    depth: 0,
    overrideAccess: true,
  })
  const phaseError = assertEventAcceptsEntries(event.startDate, event.endDate)
  if (phaseError) return phaseError

  await payload.delete({
    collection: 'entries',
    id: entryId,
    overrideAccess: true,
  })

  revalidatePath(`/events/${slug}`)
  return { ok: true }
}
