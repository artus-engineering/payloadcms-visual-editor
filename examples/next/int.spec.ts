import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload } from 'payload'

import { collectEditableFields } from '../../packages/plugin/src/lib/collectEditableFields.js'
import { DEFAULT_EDITABLE_FIELD_TYPES } from '../../packages/plugin/src/types.js'
import config from './payload.config.js'

let payload: Awaited<ReturnType<typeof getPayload>>

describe('visual editor plugin integration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    if (payload?.db && 'destroy' in payload.db) {
      await (payload.db as { destroy: () => Promise<void> }).destroy()
    }
  })

  it('collects editable fields from the pages collection', () => {
    const pages = payload.collections.pages.config
    const fields = collectEditableFields(pages.fields, DEFAULT_EDITABLE_FIELD_TYPES)

    expect(fields).toEqual(
      expect.arrayContaining([
        { path: 'title', type: 'text' },
        { path: 'excerpt', type: 'textarea' },
        { path: 'views', type: 'number' },
      ]),
    )
  })

  it('provides stable Payload IDs for rendered layout blocks', async () => {
    const { docs } = await payload.find({ collection: 'pages', limit: 1 })
    const layout = docs[0]?.layout as Array<{ id: string }> | undefined
    expect(layout?.length).toBeGreaterThan(0)
    const ids = layout?.map((block) => block.id) ?? []
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('registers visual editor endpoints', () => {
    const fieldsEndpoint = payload.config.endpoints?.find(
      (endpoint) => endpoint.path === '/visual-editor/fields',
    )
    const fallbacksEndpoint = payload.config.endpoints?.find(
      (endpoint) => endpoint.path === '/visual-editor/relation-fallbacks',
    )

    expect(fieldsEndpoint?.method).toBe('get')
    expect(fallbacksEndpoint?.method).toBe('get')
  })
})
