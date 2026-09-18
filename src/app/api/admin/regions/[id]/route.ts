import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'

type PatchBody = {
  localName?: string
  coverageStatus?: string // CONFIGURED | DATA_CONNECTED | DEMO | INACTIVE
  defaultLanguage?: string
}

// PATCH /api/admin/regions/[id] — edit locality metadata.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = (await req.json()) as PatchBody
    const before = await db.region.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const updated = await db.region.update({
      where: { id },
      data: {
        localName: body.localName ?? undefined,
        coverageStatus: body.coverageStatus ?? undefined,
        defaultLanguage: body.defaultLanguage ?? undefined,
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'REGION_UPDATE',
      entityType: 'Region',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })
    return NextResponse.json({ region: updated })
  } catch (err) {
    console.error('[api/admin/regions/[id]] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update region', detail: String(err) },
      { status: 500 }
    )
  }
}
