import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'

type CreateBody = {
  title: string
  summary: string
  publisher: string
  sourceUrl: string
  categories?: string
  pinned?: boolean
  status?: string // DRAFT | PUBLISHED | ARCHIVED
  regionId?: string
  language?: string
}

// GET /api/admin/news — list all NewsItem (incl. DRAFT).
export async function GET() {
  try {
    const items = await db.newsItem.findMany({
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      include: {
        region: { select: { id: true, canonicalName: true, localName: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    console.error('[api/admin/news] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list news', detail: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/admin/news — create NewsItem. authorId is the seeded admin.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody
    if (!body.title || !body.summary || !body.publisher || !body.sourceUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, publisher, sourceUrl' },
        { status: 400 }
      )
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')
    if (!admin) {
      return NextResponse.json({ error: 'Admin account not seeded' }, { status: 500 })
    }
    const created = await db.newsItem.create({
      data: {
        title: body.title,
        summary: body.summary,
        publisher: body.publisher,
        sourceUrl: body.sourceUrl,
        categories: body.categories ?? 'GENERAL',
        pinned: body.pinned ?? false,
        status: body.status ?? 'PUBLISHED',
        regionId: body.regionId ?? null,
        language: body.language ?? 'en',
        demoLabel: true,
        authorId: admin.id,
        publishedAt: new Date(),
        fetchedAt: new Date(),
      },
    })
    await writeAudit({
      actorId: admin.id,
      action: 'NEWS_CREATE',
      entityType: 'NewsItem',
      entityId: created.id,
      before: null,
      after: jsonSafe(created),
    })
    return NextResponse.json({ item: created })
  } catch (err) {
    console.error('[api/admin/news] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to create news', detail: String(err) },
      { status: 500 }
    )
  }
}
