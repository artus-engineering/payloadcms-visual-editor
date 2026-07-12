export {
  BLOCK_INDEX_ATTRIBUTE,
  BLOCK_PATH_ATTRIBUTE,
  BLOCK_TYPE_ATTRIBUTE,
  createBlockAttributes,
  createFieldAttributes,
  FIELD_PATH_ATTRIBUTE,
  isBlockOperationMessage,
  isFieldFocusMessage,
  isFieldUpdateMessage,
  isModeChangeMessage,
  isSyncFieldsMessage,
  isSyncRelationFallbacksMessage,
  isTrustedOrigin,
  MESSAGE_TYPES,
  postToAdmin,
} from './protocol.js'

export type {
  BlockOperation,
  EditableFieldDescriptor,
  EditableFieldType,
  FieldFocusMessage,
  FieldUpdateMessage,
  ModeChangeMessage,
  RelationFallbackDescriptor,
  SyncFieldsMessage,
  SyncRelationFallbacksMessage,
  VisualEditorAdminMessage,
  VisualEditorClientMessage,
  VisualEditorMode,
} from './protocol.js'

export {
  applyRelationFallbacks,
  buildFieldValueEntries,
  findFieldPathByText,
  getValueAtPath,
  normalizeComparableText,
  setValueAtPath,
  toDisplayValue,
} from './document.js'

export { VisualEditorRuntime } from './runtime.js'
export type { BlockToolbarAction, VisualEditorRuntimeOptions } from './runtime.js'
