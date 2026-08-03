import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import React from 'react'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

import {
  InviteEnrollForm,
  type InviteFormField,
} from '@/components/events/InviteEnrollForm'

type Args = {
  params: Promise<{ token: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { token } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { title: true },
  })

  const event = result.docs[0]
  if (!event) return { title: 'Invite' }

  return {
    title: `Join ${event.title}`,
    description: `Enrollment invite for ${event.title}`,
  }
}

export default async function InvitePage({ params }: Args) {
  const { token } = await params
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: token } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })

  const event = result.docs[0]
  if (!event) notFound()

  const formDoc = typeof event.inviteForm === 'object' ? event.inviteForm : null
  if (!formDoc || typeof formDoc !== 'object') {
    return (
      <div className="container py-20 max-w-xl mx-auto text-center space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight break-words [overflow-wrap:anywhere]">
          {event.title}
        </h1>
        <p className="text-muted-foreground">
          This invite is not ready yet. Ask the admin to attach an enrollment form.
        </p>
      </div>
    )
  }

  const fields = ((formDoc as { fields?: InviteFormField[] }).fields || []).map((field) => ({
    id: (field as { id?: string }).id,
    blockType: field.blockType,
    name: field.name,
    label: field.label,
    required: field.required,
    defaultValue: field.defaultValue,
    placeholder: field.placeholder,
    options: field.options,
    message: (field.message as DefaultTypedEditorState | null | undefined) || null,
  }))

  return (
    <div className="container py-16">
      <InviteEnrollForm
        token={token}
        eventTitle={event.title}
        inviteDescription={(event.inviteDescription as DefaultTypedEditorState | null) || null}
        fields={fields}
        submitLabel={(formDoc as { submitButtonLabel?: string | null }).submitButtonLabel}
      />
    </div>
  )
}
