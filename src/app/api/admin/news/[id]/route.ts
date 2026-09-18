import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'

type PatchBody = {
  title?: string
  summary?: string
  publisher?: string
  sourceUrl?: string
  categories?: string
  pinned?: boolean
  status?: string
  language?: string
  regionId?: string | null
}

// PATCH /api/admin/news/[id] — edit a NewsItem.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = (await req.json()) as PatchBody
    const before = await db.newsItem.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const updated = await db.newsItem.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        summary: body.summary ?? undefined,
        publisher: body.publisher ?? undefined,
        sourceUrl: body.sourceUrl ?? undefined,
        categories: body.categories ?? undefined,
        pinned: body.pinned ?? undefined,
        status: body.status ?? undefined,
        language: body.language ?? undefined,
        regionId: body.regionId === undefined ? undefined : body.regionId,
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'NEWS_UPDATE',
      entityType: 'NewsItem',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[api/admin/news/[id]] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update news', detail: String(err) },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/news/[id] — soft delete: set status ARCHIVED.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const before = await db.newsItem.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')
    const updated = await db.newsItem.update({
      where: { id },
      data: { status: 'ARCHIVED', pinned: false },
    })
    await writeAudit({
      actorId: admin?.id,
      action: 'NEWS_ARCHIVE',
      entityType: 'NewsItem',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[api/admin/news/[id]] DELETE failed', err)
    return NextResponse.json(
      { error: 'Failed to archive news', detail: String(err) },
      { status: 500 }
    )
  }
}
