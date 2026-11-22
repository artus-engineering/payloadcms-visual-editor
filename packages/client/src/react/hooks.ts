'use client'

import { useEffect, useState } from 'react'

import { isModeChangeMessage } from '../protocol.js'

export function useVisualEditorMode(): boolean {
  const [isLivePreview, setIsLivePreview] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsLivePreview(params.has('payloadLivePreview') || params.has('preview'))
  }, [])

  return isLivePreview
}

export function useVisualEditorEditMode(): boolean {
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (isModeChangeMessage(event.data)) {
        setEditMode(event.data.enabled && event.data.mode === 'edit')
      }
    }

    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return editMode
}
