import type { FieldState } from 'payload'

export function coerceFieldValue(
  fieldType: string,
  value: number | string,
  currentValue: unknown,
): unknown {
  if (fieldType === 'number') {
    if (typeof value === 'number') {
      return value
    }

    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }

  if (fieldType === 'richText') {
    if (currentValue && typeof currentValue === 'object') {
      const root = currentValue as {
        root?: { children?: Array<Record<string, unknown>> }
      }

      if (Array.isArray(root.root?.children) && root.root.children.length > 0) {
        const next = structuredClone(root)
        const firstParagraph = next.root?.children?.[0]

        if (firstParagraph && Array.isArray(firstParagraph.children)) {
          const textNode = firstParagraph.children.find((child) => child.type === 'text')

          if (textNode) {
            textNode.text = String(value)
            return next
          }
        }
      }
    }

    return {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: String(value),
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
  }

  return String(value)
}

export function getBlockCount(formState: Record<string, FieldState>, blockPath: string): number {
  const prefix = `${blockPath}.`
  const indexes = new Set<number>()

  for (const path of Object.keys(formState)) {
    if (!path.startsWith(prefix)) {
      continue
    }

    const remainder = path.slice(prefix.length)
    const indexSegment = remainder.split('.')[0]

    if (!indexSegment) {
      continue
    }

    const index = Number(indexSegment)

    if (!Number.isNaN(index)) {
      indexes.add(index)
    }
  }

  return indexes.size
}

export function createEmptyBlock(blockType: string): { blockType: string } {
  return {
    blockType,
  }
}
