import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

import { payloadVisualEditor } from '../../packages/plugin/src/index.js'
import { Authors } from './collections/authors.js'
import { Pages } from './collections/pages.js'
import { Users } from './collections/users.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

if (!process.env.DATABASE_URL?.trim()) {
  const globalStore = globalThis as typeof globalThis & { _mongoMemoryDBUri?: string }

  if (!globalStore._mongoMemoryDBUri) {
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        dbName: 'artus-visual-editor',
      },
    })

    globalStore._mongoMemoryDBUri = `${memoryDB.getUri()}&retryWrites=true`
  }

  process.env.DATABASE_URL = globalStore._mongoMemoryDBUri
}

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Authors, Pages],
  db: mongooseAdapter({
    ensureIndexes: true,
    url: process.env.DATABASE_URL ?? '',
  }),
  editor: lexicalEditor(),
  onInit: async (payload) => {
    // Version collection indexes must settle before the seed transaction writes drafts.
    await Promise.all(Object.values(payload.db.connection.models).map((model) => model.init()))
    await seed(payload)
  },
  plugins: [
    payloadVisualEditor({
      collections: {
        pages: {
          excludeFields: ['slug'],
          relationFallbacks: {
            authors: {
              name: 'Anonymous Author',
            },
          },
        },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-key',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
