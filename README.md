# @artus-engineering/payload-visual-editor

Visual editing for [Payload CMS](https://payloadcms.com) live preview.

Inspired by community work on live preview tooling, but implemented as a clean-room Payload 3 plugin for Artus Engineering projects. Not affiliated with Payload's enterprise Visual Editor.

## Features

- Navigate mode: click preview content to focus the matching admin field
- Edit mode: inline editing for text, textarea, number, rich text, and upload fields
- Block toolbar: move, duplicate, delete, and insert blocks in preview
- Relation fallbacks: render placeholder data for empty relationships during editing
- Explicit field mapping via `veField()` / `veBlock()` helpers, with optional text-match fallback
- Draft autosave when exiting edit mode or after debounced inline edits

## Packages

- `@artus-engineering/payload-visual-editor` - Payload admin plugin
- `@artus-engineering/payload-visual-editor-client` - frontend SDK (`/react` bindings included)

## Installation

```bash
pnpm add @artus-engineering/payload-visual-editor @artus-engineering/payload-visual-editor-client
```

## Payload setup

```ts
import { payloadVisualEditor } from '@artus-engineering/payload-visual-editor'

export default buildConfig({
  plugins: [
    payloadVisualEditor({
      collections: {
        pages: {
          excludeFields: ['slug'],
          relationFallbacks: {
            authors: { name: 'Anonymous' },
          },
        },
      },
    }),
  ],
})
```

Regenerate the import map after installing:

```bash
payload generate:importmap
```

Enable live preview on the collection:

```ts
admin: {
  livePreview: {
    url: ({ data }) => `/pages/${data?.slug}?payloadLivePreview=true&collection=pages`,
  },
}
```

## Frontend setup

Mount the listener once in the live-preview frontend layout:

```tsx
import { VisualEditorListener } from '@artus-engineering/payload-visual-editor-client/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <VisualEditorListener />
      </body>
    </html>
  )
}
```

Annotate editable regions explicitly:

```tsx
import { veBlock, veField } from '@artus-engineering/payload-visual-editor-client/react'

<h1 {...veField('title')}>{page.title}</h1>

<section {...veBlock('layout', index, block.blockType)}>
  <h2 {...veField(`layout.${index}.heading`)}>{block.heading}</h2>
</section>
```

If your preview component re-renders on live preview updates, pause rendering while edit mode is active. Use `useVisualEditorEditMode()` from the client package and apply queued preview data when edit mode ends.

## Development

```bash
pnpm install
pnpm build
pnpm dev
```

Demo credentials:

- Email: `demo@artus-engineering.de`
- Password: `demo1234`

Useful commands:

```bash
pnpm test
pnpm check
pnpm --filter @artus-engineering/visual-editor-example generate:importmap
```

## License

Dual-license model. See [LICENSE](LICENSE) for the full text.

Noncommercial use is free under the [PolyForm Noncommercial License 1.0.0](LICENSE.noncommercial). That covers personal projects, non-profits, education, research, and hobby use.

Commercial use requires a paid license from Artus Engineering. See [COMMERCIAL.md](COMMERCIAL.md).

Copyright 2026 Artus Engineering
