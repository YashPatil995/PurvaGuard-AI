import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — pagination cursor + region filter mean responses vary per request.
export const dynamic = 'force-dynamic'

interface NewsListItem {
  id: string
  title: string
  summary: string
  publisher: string
  sourceUrl: string
  publishedAt: string
  fetchedAt: string
  categories: string
  language: string
  status: string
  pinned: boolean
  demoLabel: boolean
  regionId: string | null
}

// GET /api/news?limit=20&cursor=<id>&regionId=<id>
// Returns paginated published news (pinned first, then most recent), with optional region filter.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10)
    const cursor = searchParams.get('cursor') ?? undefined
    const regionId = searchParams.get('regionId') ?? undefined

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20

    const items = await db.newsItem.findMany({
      where: {
        status: 'PUBLISHED',
        ...(regionId ? { regionId } : {}),
      },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      const nextItem = items.pop()
      nextCursor = nextItem?.id ?? null
    }

    const mapped: NewsListItem[] = items.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      publisher: n.publisher,
      sourceUrl: n.sourceUrl,
      publishedAt: n.publishedAt.toISOString(),
      fetchedAt: n.fetchedAt.toISOString(),
      categories: n.categories,
      language: n.language,
      status: n.status,
      pinned: n.pinned,
      demoLabel: n.demoLabel,
      regionId: n.regionId,
    }))

    return NextResponse.json({ items: mapped, nextCursor })
  } catch (err: any) {
    console.error('[api/news GET]', err)
    return NextResponse.json(
      { error: 'Failed to load news', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
