import type { Field } from 'payload'

import type {
  EditableFieldDescriptor,
  EditableFieldType,
  RelationFallbackDescriptor,
} from '../types.js'
import { isEditableFieldType } from '../types.js'

const NESTED_FIELD_TYPES = new Set(['array', 'blocks', 'collapsible', 'group', 'row', 'tabs'])

function getFieldsFromContainer(field: Field): Field[] {
  if (field.type === 'tabs') {
    return field.tabs.flatMap((tab) => ('fields' in tab ? tab.fields : []))
  }

  if ('fields' in field && Array.isArray(field.fields)) {
    return field.fields
  }

  return []
}

export function collectEditableFields(
  fields: Field[],
  allowedTypes: readonly EditableFieldType[],
  prefix = '',
): EditableFieldDescriptor[] {
  const result: EditableFieldDescriptor[] = []

  for (const field of fields) {
    if ('name' in field && typeof field.name === 'string') {
      const path = prefix ? `${prefix}.${field.name}` : field.name

      if (isEditableFieldType(field.type, allowedTypes)) {
        result.push({
          path,
          type: field.type,
        })
      }

      if (NESTED_FIELD_TYPES.has(field.type)) {
        result.push(...collectEditableFields(getFieldsFromContainer(field), allowedTypes, path))
      }

      continue
    }

    if (NESTED_FIELD_TYPES.has(field.type)) {
      result.push(...collectEditableFields(getFieldsFromContainer(field), allowedTypes, prefix))
    }
  }

  return result
}

export function filterEditableFields(
  fields: EditableFieldDescriptor[],
  config: { excludeFields?: string[]; fields?: string[] },
): EditableFieldDescriptor[] {
  let filtered = fields

  if (config.fields?.length) {
    const allowed = new Set(config.fields)
    filtered = filtered.filter((field) => allowed.has(field.path))
  }

  if (config.excludeFields?.length) {
    const excluded = new Set(config.excludeFields)
    filtered = filtered.filter((field) => !excluded.has(field.path))
  }

  return filtered
}

export function collectRelationFallbacks(
  config: { relationFallbacks?: Record<string, Record<string, unknown>> } | true,
): RelationFallbackDescriptor[] {
  if (config === true || !config.relationFallbacks) {
    return []
  }

  return Object.entries(config.relationFallbacks).map(([collectionSlug, fallback]) => ({
    collectionSlug,
    fallback,
  }))
}
