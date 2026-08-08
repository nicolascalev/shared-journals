import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Entries } from './collections/Entries'
import { Events } from './collections/Events'
import { Media } from './collections/Media'
import { Members } from './collections/Members'
import { Updates } from './collections/Updates'
import { Users } from './collections/Users'
import { defaultLexical } from '@/fields/defaultLexical'
import { plugins } from './plugins'
import { getServerSideURL } from './utilities/getURL'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeLogin: ['@/components/BeforeLogin'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    meta: {
      titleSuffix: ' — Shared Journals',
    },
  },
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: false,
    migrationDir: './src/migrations',
    prodMigrations: migrations,
  }),
  collections: [Users, Media, Members, Events, Entries, Updates],
  cors: [getServerSideURL()].filter(Boolean),
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
