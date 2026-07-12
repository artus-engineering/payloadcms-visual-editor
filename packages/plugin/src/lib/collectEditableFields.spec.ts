import { describe, expect, it } from 'vitest'

import { collectEditableFields, collectRelationFallbacks, filterEditableFields } from '../lib/collectEditableFields.js'

describe('collectEditableFields', () => {
  it('collects nested editable fields', () => {
    const fields = collectEditableFields(
      [
        { name: 'title', type: 'text' },
        {
          name: 'hero',
          type: 'group',
          fields: [{ name: 'subtitle', type: 'textarea' }],
        },
      ],
      ['text', 'textarea'],
    )

    expect(fields).toEqual([
      { path: 'title', type: 'text' },
      { path: 'hero.subtitle', type: 'textarea' },
    ])
  })

  it('filters allow and deny lists', () => {
    const filtered = filterEditableFields(
      [
        { path: 'title', type: 'text' },
        { path: 'slug', type: 'text' },
      ],
      {
        excludeFields: ['slug'],
        fields: ['title', 'slug'],
      },
    )

    expect(filtered).toEqual([{ path: 'title', type: 'text' }])
  })

  it('collects relation fallbacks from collection config', () => {
    const fallbacks = collectRelationFallbacks({
      relationFallbacks: {
        authors: { name: 'Anonymous' },
      },
    })

    expect(fallbacks).toEqual([
      {
        collectionSlug: 'authors',
        fallback: { name: 'Anonymous' },
      },
    ])
  })
})
