import type { Plugin } from 'payload'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { s3Storage } from '@payloadcms/storage-s3'

import { authenticated } from '@/access/authenticated'

const s3Bucket = process.env.S3_BUCKET
const s3Enabled = Boolean(s3Bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)

export const plugins: Plugin[] = [
  s3Storage({
    enabled: s3Enabled,
    collections: {
      media: true,
    },
    bucket: s3Bucket || '',
    config: {
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
    },
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      access: {
        create: authenticated,
        read: authenticated,
        update: authenticated,
        delete: authenticated,
      },
    },
    formSubmissionOverrides: {
      access: {
        create: () => false,
        read: authenticated,
        update: () => false,
        delete: authenticated,
      },
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'event',
          type: 'relationship',
          relationTo: 'events',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'member',
          type: 'relationship',
          relationTo: 'members',
          admin: {
            position: 'sidebar',
          },
        },
      ],
    },
  }),
]
