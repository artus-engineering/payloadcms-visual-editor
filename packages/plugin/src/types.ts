import type { Field, FieldTypes } from 'payload'

export const DEFAULT_EDITABLE_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'richText',
  'upload',
] as const satisfies readonly FieldTypes[]

export type EditableFieldType = (typeof DEFAULT_EDITABLE_FIELD_TYPES)[number]

export type VisualEditorCollectionConfig =
  | {
      excludeFields?: string[]
      fields?: string[]
      relationFallbacks?: Record<string, Record<string, unknown>>
    }
  | true

export type { VisualEditorCollectionConfig as VisualEditorGlobalConfig }

export type PayloadVisualEditorConfig = {
  collections?: Record<string, VisualEditorCollectionConfig>
  disabled?: boolean
  editableFieldTypes?: EditableFieldType[]
  globals?: Record<string, VisualEditorCollectionConfig>
}

export type EditableFieldDescriptor = {
  path: string
  type: EditableFieldType
}

export type RelationFallbackDescriptor = {
  collectionSlug: string
  fallback: Record<string, unknown>
}

export function isEditableFieldType(
  type: Field['type'],
  allowed: readonly EditableFieldType[],
): type is EditableFieldType {
  return (allowed as readonly string[]).includes(type)
}
