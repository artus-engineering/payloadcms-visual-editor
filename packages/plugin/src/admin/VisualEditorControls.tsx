'use client'

import {
  isBlockOperationMessage,
  isFieldFocusMessage,
  isFieldUpdateMessage,
  isTrustedOrigin,
  MESSAGE_TYPES,
  type BlockOperation,
  type EditableFieldDescriptor,
  type RelationFallbackDescriptor,
  type VisualEditorMode,
} from '@artus-engineering/payload-visual-editor-client'
import {
  useAllFormFields,
  useConfig,
  useDocumentForm,
  useDocumentInfo,
  useLivePreviewContext,
  useLocale,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { coerceFieldValue, getBlockCount } from '../lib/formState.js'

import '../admin/styles.css'

const DRAFT_SAVE_DELAY_MS = 400

export const VisualEditorControls = () => {
  const { config } = useConfig()
  const { dispatchFields, setModified, submit } = useDocumentForm()
  const { id, collectionSlug, globalSlug, setUnpublishedVersionCount } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [formState] = useAllFormFields()
  const {
    appIsReady,
    iframeRef,
    isLivePreviewing,
    popupRef,
    previewWindowType,
    url: previewURL,
  } = useLivePreviewContext()

  const [editMode, setEditMode] = useState(false)
  const allowedPathsRef = useRef<Set<string>>(new Set())
  const fieldTypesRef = useRef<Map<string, string>>(new Map())
  const fieldsRef = useRef<EditableFieldDescriptor[]>([])
  const fallbacksRef = useRef<RelationFallbackDescriptor[]>([])
  const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPendingDraftSaveRef = useRef(false)

  const entitySlug = collectionSlug ?? globalSlug
  const isEnabled = Boolean(entitySlug)

  const previewOrigin = useMemo(() => {
    if (!previewURL) {
      return null
    }

    try {
      return new URL(previewURL).origin
    } catch {
      return null
    }
  }, [previewURL])

  const postToPreview = useCallback(
    (message: Record<string, unknown>) => {
      if (!previewURL || !appIsReady || !previewOrigin) {
        return
      }

      if (previewWindowType === 'popup' && popupRef?.current) {
        popupRef.current.postMessage(message, previewOrigin)
        return
      }

      iframeRef.current?.contentWindow?.postMessage(message, previewOrigin)
    },
    [appIsReady, iframeRef, popupRef, previewOrigin, previewURL, previewWindowType],
  )

  const syncFieldsToPreview = useCallback(
    (fields: EditableFieldDescriptor[]) => {
      if (!entitySlug) {
        return
      }

      postToPreview({
        collectionSlug: entitySlug,
        fields,
        type: MESSAGE_TYPES.SYNC_FIELDS,
      })
    },
    [entitySlug, postToPreview],
  )

  const syncFallbacksToPreview = useCallback(
    (fallbacks: RelationFallbackDescriptor[]) => {
      postToPreview({
        fallbacks,
        type: MESSAGE_TYPES.SYNC_RELATION_FALLBACKS,
      })
    },
    [postToPreview],
  )

  const postModeToPreview = useCallback(
    (enabled: boolean, mode: VisualEditorMode) => {
      if (!entitySlug) {
        return
      }

      postToPreview({
        collectionSlug: entitySlug,
        enabled,
        mode,
        type: MESSAGE_TYPES.MODE_CHANGE,
      })

      if (enabled) {
        if (fieldsRef.current.length > 0) {
          syncFieldsToPreview(fieldsRef.current)
        }

        if (fallbacksRef.current.length > 0) {
          syncFallbacksToPreview(fallbacksRef.current)
        }
      }
    },
    [entitySlug, postToPreview, syncFallbacksToPreview, syncFieldsToPreview],
  )

  useEffect(() => {
    if (isLivePreviewing && appIsReady) {
      postModeToPreview(editMode, editMode ? 'edit' : 'navigate')
    }
  }, [appIsReady, editMode, isLivePreviewing, postModeToPreview])

  useEffect(() => {
    if (!isEnabled || !entitySlug) {
      allowedPathsRef.current = new Set()
      fieldTypesRef.current = new Map()
      fieldsRef.current = []
      fallbacksRef.current = []
      return
    }

    const loadMetadata = async () => {
      const [fieldsResponse, fallbacksResponse] = await Promise.all([
        fetch(
          `${config.routes.api}/visual-editor/fields?collection=${encodeURIComponent(entitySlug)}`,
          { credentials: 'include' },
        ),
        fetch(
          `${config.routes.api}/visual-editor/relation-fallbacks?collection=${encodeURIComponent(entitySlug)}`,
          { credentials: 'include' },
        ),
      ])

      if (fieldsResponse.ok) {
        const json = (await fieldsResponse.json()) as { fields: EditableFieldDescriptor[] }
        fieldsRef.current = json.fields
        allowedPathsRef.current = new Set(json.fields.map((field) => field.path))
        fieldTypesRef.current = new Map(json.fields.map((field) => [field.path, field.type]))
        syncFieldsToPreview(json.fields)
      }

      if (fallbacksResponse.ok) {
        const json = (await fallbacksResponse.json()) as {
          fallbacks: RelationFallbackDescriptor[]
        }
        fallbacksRef.current = json.fallbacks
        syncFallbacksToPreview(json.fallbacks)
      }
    }

    void loadMetadata()
  }, [config.routes.api, entitySlug, isEnabled, syncFallbacksToPreview, syncFieldsToPreview])

  const saveDraft = useCallback(async () => {
    const search = `?locale=${locale}&depth=0&fallback-locale=null&draft=true`
    let action: string | undefined
    let method: 'PATCH' | 'POST' = 'POST'

    if (collectionSlug) {
      action = formatAdminURL({
        apiRoute: config.routes.api,
        path: `/${collectionSlug}${id ? `/${id}` : ''}${search}`,
      })

      if (id) {
        method = 'PATCH'
      }
    }

    if (globalSlug) {
      action = formatAdminURL({
        apiRoute: config.routes.api,
        path: `/globals/${globalSlug}${search}`,
      })
    }

    if (!action) {
      return
    }

    await submit({
      action,
      method,
      overrides: {
        _status: 'draft',
      },
      skipValidation: true,
    })

    setUnpublishedVersionCount((count) => count + 1)
  }, [
    collectionSlug,
    config.routes.api,
    globalSlug,
    id,
    locale,
    setUnpublishedVersionCount,
    submit,
  ])

  const flushSaveDraft = useCallback(() => {
    if (!hasPendingDraftSaveRef.current) {
      return
    }

    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
      saveDraftTimeoutRef.current = null
    }

    hasPendingDraftSaveRef.current = false
    void saveDraft()
  }, [saveDraft])

  const scheduleDraftSave = useCallback(() => {
    hasPendingDraftSaveRef.current = true

    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
    }

    saveDraftTimeoutRef.current = setTimeout(() => {
      hasPendingDraftSaveRef.current = false
      saveDraftTimeoutRef.current = null
      void saveDraft()
    }, DRAFT_SAVE_DELAY_MS)
  }, [saveDraft])

  const focusFieldInAdmin = useCallback((path: string) => {
    const field = document.querySelector<HTMLElement>(`[id^="field-${path.replace(/\./g, '__')}"]`)

    if (!field) {
      return
    }

    field.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field.focus({ preventScroll: true })
  }, [])

  const handleBlockOperation = useCallback(
    (message: BlockOperation) => {
      const currentCount = getBlockCount(formState, message.blockPath)

      if (message.operation === 'move') {
        dispatchFields({
          type: 'MOVE_ROW',
          moveFromIndex: message.fromIndex,
          moveToIndex: message.toIndex,
          path: message.blockPath,
        })
        setModified(true)
        scheduleDraftSave()
        return
      }

      if (message.operation === 'delete') {
        dispatchFields({
          type: 'REMOVE_ROW',
          path: message.blockPath,
          rowIndex: message.index,
        })
        setModified(true)
        scheduleDraftSave()
        return
      }

      if (message.operation === 'duplicate') {
        dispatchFields({
          type: 'DUPLICATE_ROW',
          path: message.blockPath,
          rowIndex: message.index,
        })
        setModified(true)
        scheduleDraftSave()
        return
      }

      if (message.operation !== 'insert') {
        return
      }

      if (message.index > currentCount) {
        return
      }

      dispatchFields({
        type: 'ADD_ROW',
        blockType: message.blockType,
        path: message.blockPath,
        rowIndex: message.index,
      })
      setModified(true)
      scheduleDraftSave()
    },
    [dispatchFields, formState, scheduleDraftSave, setModified],
  )

  const handleEditToggle = useCallback(() => {
    if (editMode) {
      flushSaveDraft()
      postModeToPreview(false, 'navigate')
      setEditMode(false)
      return
    }

    setEditMode(true)
  }, [editMode, flushSaveDraft, postModeToPreview])

  useEffect(() => {
    if (!isLivePreviewing) {
      postModeToPreview(false, 'navigate')
      flushSaveDraft()
      setEditMode(false)
    }
  }, [flushSaveDraft, isLivePreviewing, postModeToPreview])

  useEffect(() => {
    if (!isEnabled || !previewOrigin) {
      return
    }

    const onMessage = (event: MessageEvent) => {
      if (!isTrustedOrigin(event, previewOrigin)) {
        return
      }

      if (isFieldFocusMessage(event.data)) {
        if (!allowedPathsRef.current.has(event.data.path)) {
          return
        }

        focusFieldInAdmin(event.data.path)
        return
      }

      if (isFieldUpdateMessage(event.data)) {
        const { path, saveDraft: shouldSaveDraft = true, value } = event.data

        if (!allowedPathsRef.current.has(path)) {
          return
        }

        const fieldType = fieldTypesRef.current.get(path) ?? 'text'
        const currentValue = formState?.[path]?.value
        const coercedValue = coerceFieldValue(fieldType, value, currentValue)

        dispatchFields({
          type: 'UPDATE',
          path,
          value: coercedValue,
        })
        setModified(true)

        if (shouldSaveDraft) {
          scheduleDraftSave()
        }

        return
      }

      if (isBlockOperationMessage(event.data)) {
        handleBlockOperation(event.data)
      }
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)

      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }
    }
  }, [
    dispatchFields,
    focusFieldInAdmin,
    formState,
    handleBlockOperation,
    isEnabled,
    previewOrigin,
    scheduleDraftSave,
    setModified,
  ])

  if (!isEnabled || !isLivePreviewing) {
    return null
  }

  return (
    <>
      <button
        aria-pressed={editMode}
        className="btn btn--icon-style-without-border btn--size-medium btn--style-secondary artus-visual-editor-toggle"
        onClick={handleEditToggle}
        title={editMode ? 'Exit visual edit mode' : 'Edit content directly in preview'}
        type="button"
      >
        {editMode ? 'Done' : 'Edit'}
      </button>
      {editMode ? (
        <span className="artus-visual-editor-hint">
          Click fields to edit inline. Use block toolbar for layout changes.
        </span>
      ) : (
        <span className="artus-visual-editor-hint">Click preview content to focus fields.</span>
      )}
    </>
  )
}
