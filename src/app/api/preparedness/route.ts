import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/preparedness?hazard=&language=en
// Returns published ContentPages filtered by hazardType/language.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const hazard = searchParams.get('hazard') ?? undefined
    const language = searchParams.get('language') ?? 'en'

    const pages = await db.contentPage.findMany({
      where: {
        status: 'PUBLISHED',
        language,
        ...(hazard && hazard !== 'ALL' ? { hazardType: hazard } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const items = pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      body: p.body,
      hazardType: p.hazardType ?? 'GENERAL',
      contentType: p.contentType,
      language: p.language,
      version: p.version,
      status: p.status,
      reviewedBy: p.reviewedBy,
      reviewedByName: p.author?.name ?? null,
      reviewedAt: p.reviewedAt,
      nextReviewAt: p.nextReviewAt,
      updatedAt: p.updatedAt,
    }))

    return NextResponse.json({ items, language })
  } catch (err: any) {
    console.error('[api/preparedness GET]', err)
    return NextResponse.json(
      { error: 'Failed to load preparedness guides', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
