'use client'

import { subscribe, unsubscribe } from '@payloadcms/live-preview'
import {
  useVisualEditorEditMode,
  useVisualEditorMode,
  veBlock,
  veField,
} from '@artus-engineering/payload-visual-editor-client/react'
import { useEffect, useRef, useState } from 'react'

import { formatPageMeta } from '../lib/formatPage.js'
import type { ExamplePage } from '../lib/types.js'

type Props = {
  initialPage: ExamplePage
  serverURL: string
}

export function PagePreview({ initialPage, serverURL }: Props) {
  const isLivePreview = useVisualEditorMode()
  const isVisualEditing = useVisualEditorEditMode()
  const [page, setPage] = useState(initialPage)
  const pendingRef = useRef<ExamplePage | null>(null)
  const editingRef = useRef(isVisualEditing)
  editingRef.current = isVisualEditing

  useEffect(() => {
    setPage(initialPage)
  }, [initialPage])

  useEffect(() => {
    if (!isLivePreview) {
      return
    }

    const listener = subscribe<ExamplePage>({
      callback: (data) => {
        if (editingRef.current) {
          pendingRef.current = data
          return
        }

        setPage(data)
      },
      initialData: initialPage,
      serverURL,
    })

    return () => {
      unsubscribe(listener)
    }
  }, [initialPage, isLivePreview, serverURL])

  useEffect(() => {
    if (!isVisualEditing && pendingRef.current) {
      setPage(pendingRef.current)
      pendingRef.current = null
    }
  }, [isVisualEditing])

  return (
    <article className="page">
      <header className="page__header">
        <h1 {...veField('title')}>{page.title}</h1>
        <p className="page__meta">{formatPageMeta(page)}</p>
        {page.excerpt ? (
          <p className="page__excerpt" {...veField('excerpt')}>
            {page.excerpt}
          </p>
        ) : null}
      </header>

      <div className="page__layout">
        {page.layout?.map((block, index) => {
          if (block.blockType === 'hero') {
            return (
              <section
                className="page__hero"
                key={`hero-${index}`}
                {...veBlock('layout', index, 'hero')}
              >
                <h2 {...veField(`layout.${index}.heading`)}>{block.heading}</h2>
                {block.body ? (
                  <p {...veField(`layout.${index}.body`)}>{block.body}</p>
                ) : null}
              </section>
            )
          }

          return (
            <section
              className="page__content-block"
              key={`content-${index}`}
              {...veBlock('layout', index, 'content')}
            >
              {block.text ? <p {...veField(`layout.${index}.text`)}>{block.text}</p> : null}
            </section>
          )
        })}
      </div>
    </article>
  )
}
