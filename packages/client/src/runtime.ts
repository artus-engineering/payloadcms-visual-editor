import {
  BLOCK_INDEX_ATTRIBUTE,
  BLOCK_PATH_ATTRIBUTE,
  BLOCK_TYPE_ATTRIBUTE,
  FIELD_PATH_ATTRIBUTE,
  type EditableFieldDescriptor,
  type VisualEditorMode,
} from './protocol.js'
import { buildFieldValueEntries, findFieldPathByText, normalizeComparableText } from './document.js'

const STYLE_ELEMENT_ID = 'artus-visual-editor-styles'
const HOVER_CLASS = 'artus-ve-hover'
const EDITING_CLASS = 'artus-ve-editing'
const ACTIVE_CLASS = 'artus-ve-active'
const INPUT_DEBOUNCE_MS = 300
const BLOCK_TOOLBAR_OFFSET_PX = 36

export type VisualEditorRuntimeOptions = {
  container?: HTMLElement
  enableTextMatchFallback?: boolean
  onBlockToolbarAction?: (action: BlockToolbarAction) => void
  onFieldCommit?: (path: string, value: number | string) => void
  onFieldFocus?: (path: string) => void
}

export type BlockToolbarAction =
  | { blockPath: string; blockType: string; index: number; type: 'insert' }
  | { blockPath: string; index: number; type: 'delete' | 'duplicate' }
  | { blockPath: string; direction: 'down' | 'up'; fromIndex: number; type: 'move' }

type RuntimeState = {
  activeFieldElement: HTMLElement | null
  blockToolbar: HTMLElement | null
  container: HTMLElement | null
  documentData: Record<string, unknown>
  editMode: boolean
  fieldDescriptors: EditableFieldDescriptor[]
  hoveredFieldElement: HTMLElement | null
  mode: VisualEditorMode
  snapshots: Map<string, string>
  stampedFields: Map<string, HTMLElement>
  suppressPreviewUpdates: boolean
}

export class VisualEditorRuntime {
  private readonly options: VisualEditorRuntimeOptions
  private readonly state: RuntimeState
  private listenersAttached = false
  private inputTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: VisualEditorRuntimeOptions = {}) {
    this.options = options
    this.state = {
      activeFieldElement: null,
      blockToolbar: null,
      container: null,
      documentData: {},
      editMode: false,
      fieldDescriptors: [],
      hoveredFieldElement: null,
      mode: 'navigate',
      snapshots: new Map(),
      stampedFields: new Map(),
      suppressPreviewUpdates: false,
    }
  }

  setDocumentData(documentData: Record<string, unknown>): void {
    if (this.state.suppressPreviewUpdates) {
      return
    }

    this.state.documentData = documentData
  }

  setFieldDescriptors(fields: EditableFieldDescriptor[]): void {
    this.state.fieldDescriptors = fields
  }

  setMode(enabled: boolean, mode: VisualEditorMode): void {
    if (!enabled) {
      this.teardownEditMode()
      this.state.editMode = false
      this.state.mode = 'navigate'
      return
    }

    this.state.mode = mode
    this.state.editMode = mode === 'edit'
    this.setupEditMode()
  }

  resolveFieldPathFromTarget(target: EventTarget | null): string | undefined {
    if (!(target instanceof HTMLElement)) {
      return undefined
    }

    const explicit = target.closest<HTMLElement>(`[${FIELD_PATH_ATTRIBUTE}]`)

    if (explicit) {
      return explicit.getAttribute(FIELD_PATH_ATTRIBUTE) ?? undefined
    }

    if (!this.options.enableTextMatchFallback) {
      return undefined
    }

    const text = normalizeComparableText(target.innerText)

    if (!text) {
      return undefined
    }

    const entries = buildFieldValueEntries(this.state.documentData, this.state.fieldDescriptors)
    return findFieldPathByText(entries, text)
  }

  resolveBlockFromTarget(target: EventTarget | null):
    | { blockPath: string; blockType: string; index: number }
    | undefined {
    if (!(target instanceof HTMLElement)) {
      return undefined
    }

    const blockElement = target.closest<HTMLElement>(`[${BLOCK_PATH_ATTRIBUTE}]`)

    if (!blockElement) {
      return undefined
    }

    const blockPath = blockElement.getAttribute(BLOCK_PATH_ATTRIBUTE)
    const blockType = blockElement.getAttribute(BLOCK_TYPE_ATTRIBUTE)
    const indexValue = blockElement.getAttribute(BLOCK_INDEX_ATTRIBUTE)

    if (!blockPath || !blockType || !indexValue) {
      return undefined
    }

    const index = Number(indexValue)

    if (Number.isNaN(index)) {
      return undefined
    }

    return { blockPath, blockType, index }
  }

  private ensureStyles(): void {
    if (document.getElementById(STYLE_ELEMENT_ID)) {
      return
    }

    const style = document.createElement('style')
    style.id = STYLE_ELEMENT_ID
    style.textContent = `
      [${FIELD_PATH_ATTRIBUTE}] { transition: outline 0.15s ease; }
      .${HOVER_CLASS} { outline: 2px dashed rgba(37, 99, 235, 0.55); outline-offset: 3px; cursor: pointer; border-radius: 2px; }
      .${EDITING_CLASS} [${FIELD_PATH_ATTRIBUTE}] { cursor: text; }
      .${EDITING_CLASS} [${FIELD_PATH_ATTRIBUTE}]:focus-within,
      .${EDITING_CLASS} .${ACTIVE_CLASS} { outline: 2px solid rgb(37, 99, 235); outline-offset: 3px; border-radius: 2px; }
      .artus-ve-block-toolbar {
        position: absolute;
        z-index: 9999;
        display: flex;
        gap: 4px;
        padding: 4px;
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.92);
        color: white;
        font: 12px/1.2 system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
      }
      .artus-ve-block-toolbar button {
        border: 0;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.12);
        color: inherit;
        cursor: pointer;
        padding: 4px 6px;
      }
      .artus-ve-block-toolbar button:hover { background: rgba(255, 255, 255, 0.22); }
    `

    document.head.appendChild(style)
  }

  private getContainer(): HTMLElement {
    if (this.options.container) {
      return this.options.container
    }

    return (
      document.querySelector('main') ??
      document.querySelector('article') ??
      document.querySelector('[role="main"]') ??
      document.body
    )
  }

  private setupEditMode(): void {
    this.teardownEditMode()
    this.ensureStyles()

    const container = this.getContainer()
    this.state.container = container
    this.state.suppressPreviewUpdates = true
    container.classList.add(EDITING_CLASS)

    const stamped = container.querySelectorAll<HTMLElement>(`[${FIELD_PATH_ATTRIBUTE}]`)

    for (const element of stamped) {
      const path = element.getAttribute(FIELD_PATH_ATTRIBUTE)

      if (!path) {
        continue
      }

      this.state.stampedFields.set(path, element)
      this.state.snapshots.set(path, normalizeComparableText(element.innerText))
      element.setAttribute('contenteditable', 'true')
    }

    if (!this.listenersAttached) {
      container.addEventListener('mouseover', this.onMouseOver, true)
      container.addEventListener('mouseout', this.onMouseOut, true)
      container.addEventListener('click', this.onClick, true)
      container.addEventListener('input', this.onInput, true)
      container.addEventListener('keydown', this.onKeyDown, true)
      document.addEventListener('selectionchange', this.onSelectionChange)
      this.listenersAttached = true
    }
  }

  private teardownEditMode(): void {
    const container = this.state.container

    if (container && this.listenersAttached) {
      container.removeEventListener('mouseover', this.onMouseOver, true)
      container.removeEventListener('mouseout', this.onMouseOut, true)
      container.removeEventListener('click', this.onClick, true)
      container.removeEventListener('input', this.onInput, true)
      container.removeEventListener('keydown', this.onKeyDown, true)
      document.removeEventListener('selectionchange', this.onSelectionChange)
      this.listenersAttached = false
    }

    this.commitDirtyFields()

    for (const element of this.state.stampedFields.values()) {
      element.removeAttribute('contenteditable')
      element.classList.remove(HOVER_CLASS, ACTIVE_CLASS)
    }

    container?.classList.remove(EDITING_CLASS)
    this.hideBlockToolbar()

    this.state.container = null
    this.state.suppressPreviewUpdates = false
    this.state.snapshots.clear()
    this.state.stampedFields.clear()
    this.state.hoveredFieldElement = null
    this.state.activeFieldElement = null
  }

  private readonly onMouseOver = (event: MouseEvent): void => {
    if (!this.state.editMode) {
      return
    }

    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const fieldElement = target.closest<HTMLElement>(`[${FIELD_PATH_ATTRIBUTE}]`)

    if (fieldElement === this.state.hoveredFieldElement) {
      return
    }

    this.state.hoveredFieldElement?.classList.remove(HOVER_CLASS)
    this.state.hoveredFieldElement = fieldElement
    fieldElement?.classList.add(HOVER_CLASS)

    const block = this.resolveBlockFromTarget(target)

    if (block) {
      this.showBlockToolbar(target, block)
    } else {
      this.hideBlockToolbar()
    }
  }

  private readonly onMouseOut = (event: MouseEvent): void => {
    const related = event.relatedTarget

    if (this.state.hoveredFieldElement && related instanceof Node) {
      if (this.state.hoveredFieldElement.contains(related)) {
        return
      }
    }

    this.state.hoveredFieldElement?.classList.remove(HOVER_CLASS)
    this.state.hoveredFieldElement = null
  }

  private readonly onClick = (event: MouseEvent): void => {
    const path = this.resolveFieldPathFromTarget(event.target)

    if (!path) {
      return
    }

    if (!this.state.editMode) {
      event.preventDefault()
      this.options.onFieldFocus?.(path)
      return
    }

    const block = this.resolveBlockFromTarget(event.target)

    if (block) {
      this.showBlockToolbar(event.target as HTMLElement, block)
    }
  }

  private readonly onInput = (): void => {
    if (this.inputTimer) {
      clearTimeout(this.inputTimer)
    }

    this.inputTimer = setTimeout(() => {
      this.inputTimer = null
      this.commitDirtyFields()
    }, INPUT_DEBOUNCE_MS)
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.state.editMode) {
      return
    }

    for (const [path, element] of this.state.stampedFields) {
      const original = this.state.snapshots.get(path)

      if (original != null && element.isConnected) {
        element.innerText = original
        element.blur()
      }
    }
  }

  private readonly onSelectionChange = (): void => {
    if (!this.state.editMode) {
      return
    }

    const selection = document.getSelection()

    if (!selection || selection.rangeCount === 0) {
      return
    }

    const anchor = selection.anchorNode
    const element =
      anchor instanceof HTMLElement
        ? anchor.closest<HTMLElement>(`[${FIELD_PATH_ATTRIBUTE}]`)
        : (anchor?.parentElement?.closest<HTMLElement>(`[${FIELD_PATH_ATTRIBUTE}]`) ?? null)

    if (element === this.state.activeFieldElement) {
      return
    }

    this.state.activeFieldElement?.classList.remove(ACTIVE_CLASS)
    this.state.activeFieldElement = element
    element?.classList.add(ACTIVE_CLASS)
  }

  private commitDirtyFields(): void {
    for (const [path, element] of this.state.stampedFields) {
      if (!element.isConnected) {
        continue
      }

      const currentText = normalizeComparableText(element.innerText)
      const originalText = this.state.snapshots.get(path)

      if (currentText === originalText) {
        continue
      }

      const descriptor = this.state.fieldDescriptors.find((field) => field.path === path)
      const fieldType = descriptor?.type ?? 'text'
      let value: number | string = currentText

      if (fieldType === 'number') {
        const parsed = Number(currentText)
        value = Number.isNaN(parsed) ? currentText : parsed
      }

      this.state.snapshots.set(path, currentText)
      this.options.onFieldCommit?.(path, value)
    }
  }

  private showBlockToolbar(
    target: HTMLElement,
    block: { blockPath: string; blockType: string; index: number },
  ): void {
    this.hideBlockToolbar()

    const toolbar = document.createElement('div')
    toolbar.className = 'artus-ve-block-toolbar'

    const actions: Array<{ direction?: 'down' | 'up'; label: string; type: BlockToolbarAction['type'] }> = [
      { direction: 'up', label: 'Up', type: 'move' },
      { direction: 'down', label: 'Down', type: 'move' },
      { label: 'Duplicate', type: 'duplicate' },
      { label: 'Delete', type: 'delete' },
      { label: 'Insert', type: 'insert' },
    ]

    for (const action of actions) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = action.label
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.emitBlockAction(action.type, block, action.direction)
      })
      toolbar.appendChild(button)
    }

    const rect = target.getBoundingClientRect()
    toolbar.style.top = `${window.scrollY + rect.top - BLOCK_TOOLBAR_OFFSET_PX}px`
    toolbar.style.left = `${window.scrollX + rect.left}px`
    document.body.appendChild(toolbar)
    this.state.blockToolbar = toolbar
  }

  private hideBlockToolbar(): void {
    this.state.blockToolbar?.remove()
    this.state.blockToolbar = null
  }

  private emitBlockAction(
    type: BlockToolbarAction['type'],
    block: { blockPath: string; blockType: string; index: number },
    direction?: 'down' | 'up',
  ): void {
    let action: BlockToolbarAction

    if (type === 'move') {
      action = {
        blockPath: block.blockPath,
        direction: direction ?? 'up',
        fromIndex: block.index,
        type: 'move',
      }
    } else if (type === 'insert') {
      action = {
        blockPath: block.blockPath,
        blockType: block.blockType,
        index: block.index + 1,
        type: 'insert',
      }
    } else {
      action = {
        blockPath: block.blockPath,
        index: block.index,
        type,
      }
    }

    this.options.onBlockToolbarAction?.(action)
  }

  destroy(): void {
    if (this.inputTimer) {
      clearTimeout(this.inputTimer)
    }

    this.teardownEditMode()
  }
}
