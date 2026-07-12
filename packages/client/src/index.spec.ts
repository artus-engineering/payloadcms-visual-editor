import { describe, expect, it } from 'vitest'

import { applyRelationFallbacks, findFieldPathByText, setValueAtPath } from './document.js'
import { isFieldUpdateMessage } from './protocol.js'

describe('document helpers', () => {
  it('sets nested values by path', () => {
    const document = setValueAtPath({}, 'hero.title', 'Hello')

    expect(document).toEqual({ hero: { title: 'Hello' } })
  })

  it('finds a field path by comparable text', () => {
    const path = findFieldPathByText(
      [
        {
          descriptor: { path: 'title', type: 'text' },
          displayValue: 'Hello World',
        },
      ],
      'hello   world',
    )

    expect(path).toBe('title')
  })

  it('applies relation fallbacks for empty relationships', () => {
    const next = applyRelationFallbacks(
      {
        author: {
          relationTo: 'authors',
          value: null,
        },
      },
      [
        {
          collectionSlug: 'authors',
          fallback: { name: 'Anonymous' },
        },
      ],
    )

    expect(next).toEqual({
      author: {
        relationTo: 'authors',
        value: { name: 'Anonymous' },
      },
    })
  })
})

describe('protocol guards', () => {
  it('validates field update messages', () => {
    expect(
      isFieldUpdateMessage({
        path: 'title',
        type: 'artus-visual-editor:field-update',
        value: 'Updated',
      }),
    ).toBe(true)
  })
})
