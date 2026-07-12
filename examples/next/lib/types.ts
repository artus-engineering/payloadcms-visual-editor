export type ExamplePage = {
  author?: {
    name?: string
  } | null
  excerpt?: string | null
  layout?: Array<
    | {
        blockType: 'content'
        text?: string | null
      }
    | {
        blockType: 'hero'
        body?: string | null
        heading?: string | null
      }
  >
  slug: string
  title: string
  views?: number | null
}
