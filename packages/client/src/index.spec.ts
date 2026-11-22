import { describe, expect, it } from 'vitest'

import {
  applyRelationFallbacks,
  findFieldPathByText,
  setValueAtPath,
  toDisplayValue,
} from './document.js'
import { isFieldUpdateMessage, isTrustedOrigin } from './protocol.js'

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

describe('display values', () => {
  it('rejects non-scalar values instead of displaying object internals', () => {
    expect(toDisplayValue({ value: 42 }, 'number')).toBe('')
    expect(toDisplayValue({ title: 'Example' }, 'text')).toBe('')
    expect(toDisplayValue(42, 'number')).toBe('42')
    expect(toDisplayValue(false, 'text')).toBe('false')
  })

  it('preserves rich-text ordering while ignoring malformed nodes', () => {
    const value = {
      root: {
        children: [
          null,
          { type: 'text', text: 'First' },
          { children: [null, { text: 'Second' }, { text: 123 }, { text: 'Third' }] },
        ],
      },
    }
    expect(toDisplayValue(value, 'richText')).toBe('First Second Third')
  })
})

describe('trusted message origins', () => {
  it('requires exact origins including scheme and port', () => {
    for (const origin of [
      'https://evil.example',
      'https://admin.example.evil',
      'http://admin.example',
      'https://admin.example:444',
      'null',
    ]) {
      expect(isTrustedOrigin({ origin } as MessageEvent, 'https://admin.example')).toBe(false)
    }
    expect(
      isTrustedOrigin({ origin: 'https://admin.example' } as MessageEvent, 'https://admin.example'),
    ).toBe(true)
  })
})
