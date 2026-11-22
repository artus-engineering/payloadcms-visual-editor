export type ExamplePage = {
  author?: {
    name?: string
  } | null
  excerpt?: string | null
  layout?: Array<
    | {
        id: string
        blockType: 'content'
        text?: string | null
      }
    | {
        id: string
        blockType: 'hero'
        body?: string | null
        heading?: string | null
      }
  >
  slug: string
  title: string
  views?: number | null
}
