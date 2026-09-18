import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/preparedness/[slug]
// Returns a single ContentPage by slug with full body.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const page = await db.contentPage.findUnique({
      where: { slug },
      include: { author: { select: { id: true, name: true } } },
    })
    if (!page) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      body: page.body,
      hazardType: page.hazardType ?? 'GENERAL',
      contentType: page.contentType,
      language: page.language,
      version: page.version,
      status: page.status,
      reviewedBy: page.reviewedBy,
      reviewedByName: page.author?.name ?? null,
      reviewedAt: page.reviewedAt,
      nextReviewAt: page.nextReviewAt,
      updatedAt: page.updatedAt,
    })
  } catch (err: any) {
    console.error('[api/preparedness/[slug] GET]', err)
    return NextResponse.json(
      { error: 'Failed to load guide', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
