import type { Payload } from 'payload'

export async function seed(payload: Payload): Promise<void> {
  const users = await payload.find({
    collection: 'users',
    limit: 1,
  })

  if (users.docs.length === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: 'demo@artus-engineering.de',
        password: 'demo1234',
      },
    })
  }

  const pages = await payload.find({
    collection: 'pages',
    limit: 1,
  })

  if (pages.docs.length > 0) {
    return
  }

  await payload.create({
    collection: 'pages',
    data: {
      _status: 'published',
      excerpt: 'A demo page for the Artus Payload Visual Editor.',
      layout: [
        {
          blockType: 'hero',
          body: 'Edit this hero directly in the live preview.',
          heading: 'Visual Editor Demo',
        },
        {
          blockType: 'content',
          text: 'Use the Edit button in the admin bar to change content inline.',
        },
      ],
      slug: 'home',
      title: 'Homepage',
      views: 42,
    },
  })
}
