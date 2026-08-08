import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { MAX_UPDATE_IMAGES } from '@/utilities/uploadLimits'

export const Updates: CollectionConfig = {
  slug: 'updates',
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['member', 'event', 'postedAt', 'updatedAt'],
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

        if (operation === 'create' && !data.postedAt) {
          data.postedAt = new Date().toISOString()
        }

        const images = data.images
        if (Array.isArray(images) && images.length > MAX_UPDATE_IMAGES) {
          throw new Error(`Updates can have at most ${MAX_UPDATE_IMAGES} images.`)
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
      name: 'postedAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: `Optional photos (max ${MAX_UPDATE_IMAGES}).`,
      },
    },
  ],
  timestamps: true,
}
