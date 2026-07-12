import config from '@payload-config'
import { getPayload } from 'payload'

import { PagePreview } from '@/components/PagePreview'
import type { ExamplePage } from '@/lib/types'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function PageRoute({ params }: Args) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    depth: 2,
    limit: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const page = docs[0] as ExamplePage | undefined

  if (!page) {
    return <div>Page not found</div>
  }

  return <PagePreview initialPage={page} serverURL={serverURL} />
}
