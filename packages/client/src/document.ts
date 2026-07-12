import type { EditableFieldDescriptor } from './protocol.js'

export type FieldValueEntry = {
  descriptor: EditableFieldDescriptor
  displayValue: string
}

export function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function getValueAtPath(document: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = document

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export function setValueAtPath(
  document: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = path.split('.')
  const nextDocument = structuredClone(document)
  let current: Record<string, unknown> = nextDocument

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]

    if (!segment) {
      continue
    }

    if (index === segments.length - 1) {
      current[segment] = value
      break
    }

    const existing = current[segment]

    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      current[segment] = {}
    }

    current = current[segment] as Record<string, unknown>
  }

  return nextDocument
}

export function toDisplayValue(value: unknown, fieldType: EditableFieldDescriptor['type']): string {
  if (value == null) {
    return ''
  }

  if (fieldType === 'number') {
    return String(value)
  }

  if (fieldType === 'richText' && typeof value === 'object') {
    return extractRichText(value)
  }

  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

function extractRichText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const root = value as { root?: { children?: unknown[] } }
  const children = root.root?.children

  if (!Array.isArray(children)) {
    return ''
  }

  const parts: string[] = []

  for (const child of children) {
    if (!child || typeof child !== 'object') {
      continue
    }

    const node = child as { children?: unknown[]; text?: string; type?: string }

    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
      continue
    }

    if (Array.isArray(node.children)) {
      for (const nested of node.children) {
        if (nested && typeof nested === 'object' && 'text' in nested) {
          const text = (nested as { text?: string }).text
          if (typeof text === 'string') {
            parts.push(text)
          }
        }
      }
    }
  }

  return parts.join(' ')
}

export function buildFieldValueEntries(
  document: Record<string, unknown>,
  fields: EditableFieldDescriptor[],
): FieldValueEntry[] {
  return fields.map((descriptor) => ({
    descriptor,
    displayValue: toDisplayValue(getValueAtPath(document, descriptor.path), descriptor.type),
  }))
}

export function findFieldPathByText(
  entries: FieldValueEntry[],
  text: string,
): string | undefined {
  const normalized = normalizeComparableText(text)

  if (!normalized) {
    return undefined
  }

  const matches = entries.filter(
    (entry) => normalizeComparableText(entry.displayValue) === normalized,
  )

  if (matches.length === 1) {
    return matches[0]?.descriptor.path
  }

  return undefined
}

export function applyRelationFallbacks(
  document: Record<string, unknown>,
  fallbacks: Array<{ collectionSlug: string; fallback: Record<string, unknown> }>,
): Record<string, unknown> {
  const nextDocument = structuredClone(document)

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => walk(item))
    }

    if (!value || typeof value !== 'object') {
      return value
    }

    const record = value as Record<string, unknown>

    if ('relationTo' in record && 'value' in record) {
      const relationValue = record.value

      if (relationValue == null) {
        const relationTo = record.relationTo

        if (typeof relationTo === 'string') {
          const fallback = fallbacks.find((item) => item.collectionSlug === relationTo)

          if (fallback) {
            return {
              ...record,
              value: structuredClone(fallback.fallback),
            }
          }
        }
      }

      return {
        ...record,
        value: walk(relationValue),
      }
    }

    const nextRecord: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(record)) {
      nextRecord[key] = walk(nestedValue)
    }

    return nextRecord
  }

  return walk(nextDocument) as Record<string, unknown>
}
