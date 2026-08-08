'use server'

import { getPayload } from 'payload'
import { revalidatePath } from 'next/cache'
import config from '@payload-config'

import { getEventSessionForSlug } from '@/utilities/eventSession'
import { getEventPhase } from '@/utilities/eventPhase'
import { processEntryImage } from '@/utilities/processEntryImage'
import { MAX_UPDATE_IMAGES } from '@/utilities/uploadLimits'

export type UpdateActionResult = { ok: true } | { ok: false; error: string }

export type UploadMediaResult =
  | { ok: true; id: number }
  | { ok: false; error: string }

async function requireSession(slug: string) {
  const session = await getEventSessionForSlug(slug)
  if (!session) {
    return { error: 'Unlock this event first.' as const, session: null }
  }
  return { error: null, session }
}

function assertEventAcceptsPosts(
  startDate: string,
  endDate: string,
): { ok: false; error: string } | null {
  const phase = getEventPhase(startDate, endDate)
  if (phase === 'upcoming') return { ok: false, error: 'This event has not started yet.' }
  if (phase === 'finished') {
    return { ok: false, error: 'This event has finished. Logging is closed.' }
  }
  return null
}

function parseImageIds(formData: FormData): number[] {
  const raw = formData.getAll('imageIds')
  const ids: number[] = []
  for (const value of raw) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) ids.push(n)
  }
  return ids
}

/** Upload a single compressed image as media (keeps Server Action body under Vercel limits). */
export async function uploadMedia(formData: FormData): Promise<UploadMediaResult> {
  try {
    const slug = String(formData.get('slug') || '')
    const { session, error } = await requireSession(slug)
    if (!session) return { ok: false, error: error || 'Unauthorized' }

    const alt = String(formData.get('alt') || 'Update photo').slice(0, 100)
    const image = formData.get('image')

    if (!(image instanceof File) || image.size === 0) {
      return { ok: false, error: 'Choose an image to upload.' }
    }

    const payload = await getPayload({ config })
    const event = await payload.findByID({
      collection: 'events',
      id: session.eventId,
      depth: 0,
      overrideAccess: true,
    })

    const phaseError = assertEventAcceptsPosts(event.startDate, event.endDate)
    if (phaseError) return { ok: false, error: phaseError.error }

    const buffer = Buffer.from(await image.arrayBuffer())
    const processed = await processEntryImage(buffer, image.name)
    const media = await payload.create({
      collection: 'media',
      data: { alt },
      file: {
        data: processed.data,
        mimetype: processed.mimetype,
        name: processed.name,
        size: processed.size,
      },
      overrideAccess: true,
    })

    return { ok: true, id: Number(media.id) }
  } catch (err) {
    console.error('uploadMedia failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not process image.',
    }
  }
}

export async function createUpdate(formData: FormData): Promise<UpdateActionResult> {
  try {
    const slug = String(formData.get('slug') || '')
    const { session, error } = await requireSession(slug)
    if (!session) return { ok: false, error: error || 'Unauthorized' }

    const memberId = String(formData.get('memberId') || session.memberId || '')
    const text = String(formData.get('text') || '').trim()
    const postedAt = String(formData.get('postedAt') || new Date().toISOString())
    const imageIds = parseImageIds(formData)

    if (!memberId) return { ok: false, error: 'Pick who you are.' }
    if (!text) return { ok: false, error: 'Add a short update.' }
    if (imageIds.length > MAX_UPDATE_IMAGES) {
      return { ok: false, error: `Updates can have at most ${MAX_UPDATE_IMAGES} images.` }
    }

    const payload = await getPayload({ config })

    const event = await payload.findByID({
      collection: 'events',
      id: session.eventId,
      depth: 0,
      overrideAccess: true,
    })

    const phaseError = assertEventAcceptsPosts(event.startDate, event.endDate)
    if (phaseError) return phaseError

    const memberIds = (event.members || []).map((m) =>
      typeof m === 'object' ? String(m.id) : String(m),
    )
    if (!memberIds.includes(memberId)) {
      return { ok: false, error: 'That member is not in this event.' }
    }

    await payload.create({
      collection: 'updates',
      data: {
        event: Number(session.eventId),
        member: Number(memberId),
        text,
        postedAt,
        images: imageIds.length ? imageIds : undefined,
      },
      overrideAccess: true,
    })

    revalidatePath(`/events/${slug}`)
    return { ok: true }
  } catch (err) {
    console.error('createUpdate failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not save your update. Please try again.',
    }
  }
}

export async function updateUpdate(formData: FormData): Promise<UpdateActionResult> {
  try {
    const slug = String(formData.get('slug') || '')
    const updateId = String(formData.get('updateId') || '')
    const { session, error } = await requireSession(slug)
    if (!session) return { ok: false, error: error || 'Unauthorized' }
    if (!updateId) return { ok: false, error: 'Missing update.' }

    const text = String(formData.get('text') || '').trim()
    const postedAt = String(formData.get('postedAt') || '')
    const replaceImages = String(formData.get('replaceImages') || '') === '1'
    const imageIds = parseImageIds(formData)

    if (!text) return { ok: false, error: 'Add a short update.' }
    if (replaceImages && imageIds.length > MAX_UPDATE_IMAGES) {
      return { ok: false, error: `Updates can have at most ${MAX_UPDATE_IMAGES} images.` }
    }

    const payload = await getPayload({ config })
    const existing = await payload.findByID({
      collection: 'updates',
      id: updateId,
      depth: 0,
      overrideAccess: true,
    })

    const updateEventId = typeof existing.event === 'object' ? existing.event.id : existing.event
    const updateMemberId =
      typeof existing.member === 'object' ? existing.member.id : existing.member

    if (String(updateEventId) !== String(session.eventId)) {
      return { ok: false, error: 'Update does not belong to this event.' }
    }

    if (!session.memberId || String(updateMemberId) !== String(session.memberId)) {
      return { ok: false, error: 'You can only edit your own updates. Pick your name first.' }
    }

    const event = await payload.findByID({
      collection: 'events',
      id: session.eventId,
      depth: 0,
      overrideAccess: true,
    })
    const phaseError = assertEventAcceptsPosts(event.startDate, event.endDate)
    if (phaseError) return phaseError

    await payload.update({
      collection: 'updates',
      id: updateId,
      data: {
        text,
        postedAt: postedAt || existing.postedAt,
        ...(replaceImages ? { images: imageIds } : {}),
      },
      overrideAccess: true,
    })

    revalidatePath(`/events/${slug}`)
    return { ok: true }
  } catch (err) {
    console.error('updateUpdate failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not update this post. Please try again.',
    }
  }
}

export async function deleteUpdate(slug: string, updateId: string): Promise<UpdateActionResult> {
  try {
    const { session, error } = await requireSession(slug)
    if (!session) return { ok: false, error: error || 'Unauthorized' }

    const payload = await getPayload({ config })
    const existing = await payload.findByID({
      collection: 'updates',
      id: updateId,
      depth: 0,
      overrideAccess: true,
    })

    const updateEventId = typeof existing.event === 'object' ? existing.event.id : existing.event
    const updateMemberId =
      typeof existing.member === 'object' ? existing.member.id : existing.member

    if (String(updateEventId) !== String(session.eventId)) {
      return { ok: false, error: 'Update does not belong to this event.' }
    }

    if (!session.memberId || String(updateMemberId) !== String(session.memberId)) {
      return { ok: false, error: 'You can only delete your own updates. Pick your name first.' }
    }

    const event = await payload.findByID({
      collection: 'events',
      id: session.eventId,
      depth: 0,
      overrideAccess: true,
    })
    const phaseError = assertEventAcceptsPosts(event.startDate, event.endDate)
    if (phaseError) return phaseError

    await payload.delete({
      collection: 'updates',
      id: updateId,
      overrideAccess: true,
    })

    revalidatePath(`/events/${slug}`)
    return { ok: true }
  } catch (err) {
    console.error('deleteUpdate failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not delete this update.',
    }
  }
}
