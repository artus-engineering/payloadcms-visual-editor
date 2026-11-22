import { describe, expect, it } from 'vitest'

import { coerceFieldValue } from './formState.js'

describe('rich-text updates', () => {
  it('keeps formatting and other content without mutating the current document', () => {
    const original = {
      root: {
        children: [
          {
            children: [
              { type: 'text', text: 'Old', format: 1 },
              { type: 'text', text: 'Keep' },
            ],
          },
        ],
      },
    }
    const updated = coerceFieldValue('richText', 'New', original)
    expect(updated).toEqual({
      root: {
        children: [
          {
            children: [
              { type: 'text', text: 'New', format: 1 },
              { type: 'text', text: 'Keep' },
            ],
          },
        ],
      },
    })
    expect(original.root.children[0]?.children[0]?.text).toBe('Old')
  })

  it('creates a Lexical paragraph when no text node is available', () => {
    expect(coerceFieldValue('richText', 'New', null)).toMatchObject({
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [{ type: 'text', text: 'New' }] }],
      },
    })
  })
})
