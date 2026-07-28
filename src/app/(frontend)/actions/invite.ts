'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@payload-config'

import { verifyAccessCode } from '@/utilities/accessCode'
import {
  EVENT_SESSION_COOKIE,
  WELCOME_PENDING_COOKIE,
  buildEventSession,
  encodeEventSession,
  sessionCookieOptions,
} from '@/utilities/eventSession'

export type ActionResult = { ok: true } | { ok: false; error: string }

type FormFieldBlock = {
  blockType?: string
  name?: string
  label?: string
  required?: boolean
  options?: { label: string; value: string }[]
}

function getFormFields(form: { fields?: FormFieldBlock[] | null }): FormFieldBlock[] {
  return (form.fields || []).filter(
    (field) => field && field.blockType !== 'message' && typeof field.name === 'string',
  )
}

async function findEventByInviteToken(token: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
    context: { keepAccessCode: true },
  })
  return { payload, event: result.docs[0] }
}

export async function verifyInviteCode(token: string, code: string): Promise<ActionResult> {
  const trimmedToken = token.trim()
  const trimmedCode = code.trim()

  if (!trimmedToken) return { ok: false, error: 'Invalid invite link.' }
  if (!trimmedCode) return { ok: false, error: 'Enter the access code.' }

  const { event } = await findEventByInviteToken(trimmedToken)
  if (!event) return { ok: false, error: 'Invite not found.' }
  if (!event.accessCode || !verifyAccessCode(trimmedCode, event.accessCode)) {
    return { ok: false, error: 'Invalid access code.' }
  }

  return { ok: true }
}

export async function enrollWithInvite(formData: FormData): Promise<ActionResult> {
  const token = String(formData.get('token') || '').trim()
  const code = String(formData.get('code') || '').trim()

  if (!token) return { ok: false, error: 'Invalid invite link.' }
  if (!code) return { ok: false, error: 'Enter the access code.' }

  const { payload, event } = await findEventByInviteToken(token)
  if (!event) return { ok: false, error: 'Invite not found.' }
  if (!event.accessCode || !verifyAccessCode(code, event.accessCode)) {
    return { ok: false, error: 'Invalid access code.' }
  }

  const formDoc = typeof event.inviteForm === 'object' ? event.inviteForm : null
  if (!formDoc || typeof formDoc !== 'object' || !('id' in formDoc)) {
    return { ok: false, error: 'This invite has no enrollment form configured.' }
  }

  const fields = getFormFields(formDoc as { fields?: FormFieldBlock[] })
  const submissionData: { field: string; value: string }[] = []

  for (const field of fields) {
    const fieldName = field.name!
    const raw = formData.get(fieldName)
    let value = ''

    if (field.blockType === 'checkbox') {
      value = raw === 'on' || raw === 'true' || raw === '1' ? 'true' : 'false'
      if (field.required && value !== 'true') {
        return { ok: false, error: `${field.label || fieldName} is required.` }
      }
    } else {
      value = typeof raw === 'string' ? raw.trim() : ''
      if (field.required && !value) {
        return { ok: false, error: `${field.label || fieldName} is required.` }
      }
    }

    submissionData.push({ field: fieldName, value })
  }

  const nameEntry = submissionData.find((item) => item.field === 'name')
  const memberName = nameEntry?.value?.trim()
  if (!memberName) {
    return {
      ok: false,
      error: 'The invite form must include a required text field named "name".',
    }
  }

  const member = await payload.create({
    collection: 'members',
    data: { name: memberName },
    overrideAccess: true,
  })

  const existingMembers = (event.members || []).map((m) =>
    typeof m === 'object' && m !== null ? Number(m.id) : Number(m),
  )

  await payload.update({
    collection: 'events',
    id: event.id,
    data: {
      members: [...existingMembers, Number(member.id)],
    },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'form-submissions',
    data: {
      form: formDoc.id,
      submissionData,
      event: event.id,
      member: member.id,
    },
    overrideAccess: true,
  })

  const session = buildEventSession({
    eventId: event.id,
    slug: event.slug,
    endDate: event.endDate,
    memberId: member.id,
  })

  const jar = await cookies()
  jar.set(EVENT_SESSION_COOKIE, encodeEventSession(session), sessionCookieOptions(session.exp))
  jar.set(WELCOME_PENDING_COOKIE, event.slug, sessionCookieOptions(session.exp))

  redirect(`/events/${event.slug}`)
}

export async function dismissWelcome(slug: string): Promise<ActionResult> {
  const jar = await cookies()
  const pending = jar.get(WELCOME_PENDING_COOKIE)?.value
  if (pending === slug) {
    jar.delete(WELCOME_PENDING_COOKIE)
  }
  return { ok: true }
}
