import type { ExamplePage } from './types.js'

export function formatPageMeta(page: ExamplePage): string {
  const views = page.views ?? 0
  const author = page.author?.name ?? 'No author selected'

  return `${views} views · ${author}`
}
