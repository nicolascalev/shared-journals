import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Entries: CollectionConfig = {
  slug: 'entries',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['member', 'event', 'loggedAt', 'updatedAt'],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data?.event || !data?.member) return data

        const eventId = typeof data.event === 'object' ? data.event.id : data.event
        const memberId = typeof data.member === 'object' ? data.member.id : data.member

        const event = await req.payload.findByID({
          collection: 'events',
          id: eventId,
          depth: 0,
          overrideAccess: true,
        })

        const memberIds = (event.members || []).map((m) =>
          typeof m === 'object' ? String(m.id) : String(m),
        )

        if (!memberIds.includes(String(memberId))) {
          throw new Error('Member is not part of this event')
        }

        if (operation === 'create' && !data.loggedAt) {
          data.loggedAt = new Date().toISOString()
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      required: true,
      index: true,
    },
    {
      name: 'loggedAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      min: 0,
      admin: {
        description: 'Optional workout duration in minutes',
        step: 1,
      },
      label: 'Duration (minutes)',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}
