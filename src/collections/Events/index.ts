import type { CollectionConfig } from 'payload'
import { APIError, slugField } from 'payload'
import { randomUUID } from 'crypto'

import { authenticated } from '../../access/authenticated'
import { hashAccessCode, isHashedAccessCode, verifyAccessCode } from '../../utilities/accessCode'
import {
  buildEventSession,
  encodeEventSession,
  sessionCookieOptions,
} from '../../utilities/eventSession'
import { journalRichTextEditor } from '../../fields/journalRichText'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startDate', 'endDate', 'rankingEnabled', 'updatedAt'],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create' && !data?.accessCode) {
          throw new APIError('Access code is required', 400)
        }

        if (operation === 'update' && data && data.accessCode === '' && !originalDoc?.accessCode) {
          throw new APIError('Access code is required', 400)
        }

        return data
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (!data) return data

        if (operation === 'create') {
          if (!data.inviteToken) data.inviteToken = randomUUID()
        } else if (operation === 'update') {
          if (!data.inviteToken) {
            data.inviteToken = originalDoc?.inviteToken || randomUUID()
          }
        }

        // Only hash new plaintext codes. Never re-hash an existing salt:hash value
        // (Payload update payloads can include the stored hash from originalDoc).
        if (typeof data.accessCode === 'string' && data.accessCode.length > 0) {
          const incoming = data.accessCode
          if (operation === 'update') {
            if (incoming === originalDoc?.accessCode || isHashedAccessCode(incoming)) {
              delete data.accessCode
            } else {
              data.accessCode = hashAccessCode(incoming)
            }
          } else {
            data.accessCode = isHashedAccessCode(incoming) ? incoming : hashAccessCode(incoming)
          }
        } else if (operation === 'update') {
          delete data.accessCode
        }

        return data
      },
    ],
    afterRead: [
      ({ doc, context }) => {
        if (context?.keepAccessCode) return doc
        if (doc) {
          doc.accessCode = ''
        }
        return doc
      },
    ],
  },
  endpoints: [
    {
      path: '/:slug/unlock',
      method: 'post',
      handler: async (req) => {
        const slugParam = req.routeParams?.slug
        const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
        if (!slug) {
          throw new APIError('Event slug is required', 400)
        }

        const body = req.json ? await req.json() : {}
        const code = typeof body?.code === 'string' ? body.code.trim() : ''

        if (!code) {
          throw new APIError('Access code is required', 400)
        }

        const result = await req.payload.find({
          collection: 'events',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          context: { keepAccessCode: true },
        })

        const event = result.docs[0]
        if (!event?.accessCode || !verifyAccessCode(code, event.accessCode)) {
          throw new APIError('Invalid access code', 401)
        }

        const session = buildEventSession({
          eventId: event.id,
          slug: event.slug,
          endDate: event.endDate,
        })
        const token = encodeEventSession(session)
        const cookie = sessionCookieOptions(session.exp)

        return Response.json(
          { ok: true, slug: event.slug },
          {
            headers: {
              'Set-Cookie': [
                `event_session=${token}`,
                `Path=${cookie.path}`,
                'HttpOnly',
                `SameSite=${cookie.sameSite}`,
                cookie.secure ? 'Secure' : '',
                `Expires=${cookie.expires.toUTCString()}`,
              ]
                .filter(Boolean)
                .join('; '),
            },
          },
        )
      },
    },
  ],
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      name: 'slug',
      useAsSlug: 'title',
      required: true,
    }),
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Include reward, punishment, rules — whatever the group needs.',
      },
      editor: journalRichTextEditor,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'accessCode',
      type: 'text',
      admin: {
        description:
          'Shared password for the event page and invites. Leave blank when editing to keep the current code.',
      },
    },
    {
      name: 'rankingEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show ranked leaderboard',
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'members',
      hasMany: true,
      admin: {
        description: 'People who can log entries. Filled automatically when someone enrolls via invite.',
      },
    },
    {
      type: 'collapsible',
      label: 'Invite',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'inviteToken',
          type: 'text',
          unique: true,
          index: true,
          admin: {
            readOnly: true,
            description: 'Auto-generated. Used in the public invite URL.',
          },
        },
        {
          name: 'inviteLink',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/InviteLinkField',
            },
          },
        },
        {
          name: 'inviteDescription',
          type: 'richText',
          admin: {
            description: 'Shown on the invite page before enrollment.',
          },
          editor: journalRichTextEditor,
        },
        {
          name: 'inviteForm',
          type: 'relationship',
          relationTo: 'forms',
          admin: {
            description:
              'Form shown during enrollment. Must include a text field named "name" for the member display name.',
          },
        },
      ],
    },
    {
      name: 'entries',
      type: 'join',
      collection: 'entries',
      on: 'event',
      admin: {
        defaultColumns: ['member', 'loggedAt', 'description'],
      },
    },
  ],
  timestamps: true,
}
