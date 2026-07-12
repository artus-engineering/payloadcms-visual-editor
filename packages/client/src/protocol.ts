export const ARTUS_VE_NAMESPACE = 'artus-visual-editor' as const

export const MESSAGE_TYPES = {
  BLOCK_OPERATION: `${ARTUS_VE_NAMESPACE}:block-operation`,
  FIELD_FOCUS: `${ARTUS_VE_NAMESPACE}:focus-field`,
  FIELD_UPDATE: `${ARTUS_VE_NAMESPACE}:field-update`,
  MODE_CHANGE: `${ARTUS_VE_NAMESPACE}:mode-change`,
  SYNC_FIELDS: `${ARTUS_VE_NAMESPACE}:sync-fields`,
  SYNC_RELATION_FALLBACKS: `${ARTUS_VE_NAMESPACE}:sync-relation-fallbacks`,
} as const

export type EditableFieldType = 'number' | 'richText' | 'text' | 'textarea' | 'upload'

export type EditableFieldDescriptor = {
  path: string
  type: EditableFieldType
}

export type RelationFallbackDescriptor = {
  collectionSlug: string
  fallback: Record<string, unknown>
}

export type VisualEditorMode = 'edit' | 'navigate'

export type FieldUpdateMessage = {
  path: string
  saveDraft?: boolean
  type: typeof MESSAGE_TYPES.FIELD_UPDATE
  value: number | string
}

export type FieldFocusMessage = {
  path: string
  type: typeof MESSAGE_TYPES.FIELD_FOCUS
}

export type ModeChangeMessage = {
  collectionSlug?: string
  enabled: boolean
  mode: VisualEditorMode
  type: typeof MESSAGE_TYPES.MODE_CHANGE
}

export type SyncFieldsMessage = {
  collectionSlug: string
  fields: EditableFieldDescriptor[]
  type: typeof MESSAGE_TYPES.SYNC_FIELDS
}

export type SyncRelationFallbacksMessage = {
  fallbacks: RelationFallbackDescriptor[]
  type: typeof MESSAGE_TYPES.SYNC_RELATION_FALLBACKS
}

export type BlockOperation =
  | {
      blockPath: string
      blockType: string
      index: number
      operation: 'insert'
      type: typeof MESSAGE_TYPES.BLOCK_OPERATION
    }
  | {
      blockPath: string
      index: number
      operation: 'delete' | 'duplicate'
      type: typeof MESSAGE_TYPES.BLOCK_OPERATION
    }
  | {
      blockPath: string
      fromIndex: number
      operation: 'move'
      toIndex: number
      type: typeof MESSAGE_TYPES.BLOCK_OPERATION
    }

export type VisualEditorClientMessage =
  | BlockOperation
  | FieldFocusMessage
  | FieldUpdateMessage

export type VisualEditorAdminMessage =
  | ModeChangeMessage
  | SyncFieldsMessage
  | SyncRelationFallbacksMessage

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isFieldUpdateMessage(value: unknown): value is FieldUpdateMessage {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.type === MESSAGE_TYPES.FIELD_UPDATE &&
    typeof value.path === 'string' &&
    (typeof value.value === 'string' || typeof value.value === 'number')
  )
}

export function isFieldFocusMessage(value: unknown): value is FieldFocusMessage {
  if (!isRecord(value)) {
    return false
  }

  return value.type === MESSAGE_TYPES.FIELD_FOCUS && typeof value.path === 'string'
}

export function isModeChangeMessage(value: unknown): value is ModeChangeMessage {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.type === MESSAGE_TYPES.MODE_CHANGE &&
    typeof value.enabled === 'boolean' &&
    (value.mode === 'edit' || value.mode === 'navigate')
  )
}

export function isSyncFieldsMessage(value: unknown): value is SyncFieldsMessage {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.type === MESSAGE_TYPES.SYNC_FIELDS &&
    typeof value.collectionSlug === 'string' &&
    Array.isArray(value.fields)
  )
}

export function isSyncRelationFallbacksMessage(
  value: unknown,
): value is SyncRelationFallbacksMessage {
  if (!isRecord(value)) {
    return false
  }

  return value.type === MESSAGE_TYPES.SYNC_RELATION_FALLBACKS && Array.isArray(value.fallbacks)
}

export function isBlockOperationMessage(value: unknown): value is BlockOperation {
  if (!isRecord(value) || value.type !== MESSAGE_TYPES.BLOCK_OPERATION) {
    return false
  }

  if (value.operation === 'move') {
    return (
      typeof value.blockPath === 'string' &&
      typeof value.fromIndex === 'number' &&
      typeof value.toIndex === 'number'
    )
  }

  if (value.operation === 'insert') {
    return (
      typeof value.blockPath === 'string' &&
      typeof value.index === 'number' &&
      typeof value.blockType === 'string'
    )
  }

  return typeof value.blockPath === 'string' && typeof value.index === 'number'
}

export const FIELD_PATH_ATTRIBUTE = 'data-artus-ve-field' as const
export const BLOCK_PATH_ATTRIBUTE = 'data-artus-ve-block' as const
export const BLOCK_INDEX_ATTRIBUTE = 'data-artus-ve-block-index' as const
export const BLOCK_TYPE_ATTRIBUTE = 'data-artus-ve-block-type' as const

export function createFieldAttributes(path: string): Record<string, string> {
  return {
    [FIELD_PATH_ATTRIBUTE]: path,
  }
}

export function createBlockAttributes(
  blockPath: string,
  index: number,
  blockType: string,
): Record<string, string> {
  return {
    [BLOCK_PATH_ATTRIBUTE]: blockPath,
    [BLOCK_INDEX_ATTRIBUTE]: String(index),
    [BLOCK_TYPE_ATTRIBUTE]: blockType,
  }
}

export function postToAdmin(message: VisualEditorClientMessage, targetOrigin: string): void {
  const target = window.opener ?? window.parent

  if (!target || target === window) {
    return
  }

  target.postMessage(message, targetOrigin)
}

export function isTrustedOrigin(event: MessageEvent, allowedOrigin: string): boolean {
  return event.origin === allowedOrigin
}
