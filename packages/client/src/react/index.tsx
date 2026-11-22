'use client'

import { ready, subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useEffect, useRef } from 'react'

import { applyRelationFallbacks } from '../document.js'
import {
  createBlockAttributes,
  createFieldAttributes,
  isModeChangeMessage,
  isSyncFieldsMessage,
  isSyncRelationFallbacksMessage,
  MESSAGE_TYPES,
  postToAdmin,
  type EditableFieldDescriptor,
  type RelationFallbackDescriptor,
} from '../protocol.js'
import { VisualEditorRuntime } from '../runtime.js'

export type VisualEditorListenerProps = {
  apiBasePath?: string
  enableTextMatchFallback?: boolean
  isLivePreview?: boolean
}

function useLivePreviewFlag(explicit?: boolean): boolean {
  if (typeof explicit === 'boolean') {
    return explicit
  }

  if (typeof window === 'undefined') {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  return params.has('payloadLivePreview') || params.has('preview')
}

export function VisualEditorListener({
  apiBasePath = '/api',
  enableTextMatchFallback = true,
  isLivePreview,
}: VisualEditorListenerProps) {
  const livePreviewEnabled = useLivePreviewFlag(isLivePreview)
  const runtimeRef = useRef<VisualEditorRuntime | null>(null)
  const documentRef = useRef<Record<string, unknown>>({})
  const fieldsRef = useRef<EditableFieldDescriptor[]>([])
  const fallbacksRef = useRef<RelationFallbackDescriptor[]>([])
  const targetOriginRef = useRef('')

  useEffect(() => {
    targetOriginRef.current = window.location.origin
  }, [])

  useEffect(() => {
    if (!livePreviewEnabled) {
      return
    }

    const runtime = new VisualEditorRuntime({
      enableTextMatchFallback,
      onBlockToolbarAction: (action) => {
        if (action.type === 'move') {
          postToAdmin(
            {
              blockPath: action.blockPath,
              fromIndex: action.fromIndex,
              operation: 'move',
              toIndex:
                action.direction === 'up'
                  ? Math.max(0, action.fromIndex - 1)
                  : action.fromIndex + 1,
              type: MESSAGE_TYPES.BLOCK_OPERATION,
            },
            targetOriginRef.current,
          )
          return
        }

        if (action.type === 'insert') {
          postToAdmin(
            {
              blockPath: action.blockPath,
              blockType: action.blockType,
              index: action.index,
              operation: 'insert',
              type: MESSAGE_TYPES.BLOCK_OPERATION,
            },
            targetOriginRef.current,
          )
          return
        }

        postToAdmin(
          {
            blockPath: action.blockPath,
            index: action.index,
            operation: action.type,
            type: MESSAGE_TYPES.BLOCK_OPERATION,
          },
          targetOriginRef.current,
        )
      },
      onFieldCommit: (path, value) => {
        postToAdmin(
          {
            path,
            saveDraft: true,
            type: MESSAGE_TYPES.FIELD_UPDATE,
            value,
          },
          targetOriginRef.current,
        )
      },
      onFieldFocus: (path) => {
        postToAdmin(
          {
            path,
            type: MESSAGE_TYPES.FIELD_FOCUS,
          },
          targetOriginRef.current,
        )
      },
    })

    runtimeRef.current = runtime
    ready({ serverURL: targetOriginRef.current || window.location.origin })

    const onAdminMessage = (event: MessageEvent) => {
      if (event.origin !== targetOriginRef.current) {
        return
      }

      if (isModeChangeMessage(event.data)) {
        runtime.setMode(event.data.enabled, event.data.mode)
        return
      }

      if (isSyncFieldsMessage(event.data)) {
        fieldsRef.current = event.data.fields
        runtime.setFieldDescriptors(event.data.fields)
        return
      }

      if (isSyncRelationFallbacksMessage(event.data)) {
        fallbacksRef.current = event.data.fallbacks
        documentRef.current = applyRelationFallbacks(documentRef.current, event.data.fallbacks)
        runtime.setDocumentData(documentRef.current)
      }
    }

    window.addEventListener('message', onAdminMessage)

    const subscription = subscribe({
      callback: (data) => {
        const nextDocument = applyRelationFallbacks(
          (data ?? {}) as Record<string, unknown>,
          fallbacksRef.current,
        )
        documentRef.current = nextDocument
        runtime.setDocumentData(nextDocument)
      },
      initialData: {},
      serverURL: targetOriginRef.current || window.location.origin,
    })

    return () => {
      window.removeEventListener('message', onAdminMessage)
      unsubscribe(subscription)
      runtime.destroy()
      runtimeRef.current = null
    }
  }, [enableTextMatchFallback, livePreviewEnabled])

  useEffect(() => {
    if (!livePreviewEnabled) {
      return
    }

    const collectionSlug = new URLSearchParams(window.location.search).get('collection')

    if (!collectionSlug) {
      return
    }

    const loadMetadata = async () => {
      const [fieldsResponse, fallbacksResponse] = await Promise.all([
        fetch(
          `${apiBasePath}/visual-editor/fields?collection=${encodeURIComponent(collectionSlug)}`,
          { credentials: 'include' },
        ),
        fetch(
          `${apiBasePath}/visual-editor/relation-fallbacks?collection=${encodeURIComponent(collectionSlug)}`,
          { credentials: 'include' },
        ),
      ])

      if (fieldsResponse.ok) {
        const json = (await fieldsResponse.json()) as { fields: EditableFieldDescriptor[] }
        fieldsRef.current = json.fields
        runtimeRef.current?.setFieldDescriptors(json.fields)
      }

      if (fallbacksResponse.ok) {
        const json = (await fallbacksResponse.json()) as {
          fallbacks: RelationFallbackDescriptor[]
        }
        fallbacksRef.current = json.fallbacks
        documentRef.current = applyRelationFallbacks(documentRef.current, json.fallbacks)
        runtimeRef.current?.setDocumentData(documentRef.current)
      }
    }

    void loadMetadata()
  }, [apiBasePath, livePreviewEnabled])

  return null
}

export function veField(path: string): Record<string, string> {
  return createFieldAttributes(path)
}

export function veBlock(
  blockPath: string,
  index: number,
  blockType: string,
): Record<string, string> {
  return createBlockAttributes(blockPath, index, blockType)
}

export { useVisualEditorEditMode, useVisualEditorMode } from './hooks.js'
