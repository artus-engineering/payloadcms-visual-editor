import type { ReactNode } from 'react'

import { VisualEditorListener } from '@artus-engineering/payload-visual-editor-client/react'

import './globals.css'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/pages/home">Demo page</a>
        </header>
        <main className="site-main">{children}</main>
        <VisualEditorListener />
      </body>
    </html>
  )
}
