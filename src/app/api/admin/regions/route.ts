import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

type CreateBody = {
  canonicalName: string
  regionType: string // STATE | DISTRICT | LOCALITY
  lat: number
  lng: number
  localName?: string
  defaultLanguage?: string
  coverageStatus?: string // CONFIGURED | DATA_CONNECTED | DEMO | INACTIVE
  parentId?: string | null
  stateCode?: string
  boundarySource?: string
}

// GET /api/admin/regions — list all regions (hierarchical flat list).
export async function GET(request: Request) {
  const _auth = await requireAdmin(request)
  if (!_auth.ok) return _auth.response
  try {
    const regions = await db.region.findMany({
      orderBy: [{ regionType: 'asc' }, { canonicalName: 'asc' }],
      include: {
        parent: { select: { id: true, canonicalName: true } },
        _count: { select: { facilities: true, alerts: true, children: true } },
      },
    })
    return NextResponse.json({ items: regions, total: regions.length })
  } catch (err) {
    console.error('[api/admin/regions] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list regions', detail: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/admin/regions — create a region.
export async function POST(req: Request, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const body = (await req.json()) as CreateBody
    if (!body.canonicalName || !body.regionType || body.lat == null || body.lng == null) {
      return NextResponse.json(
        { error: 'Missing required fields: canonicalName, regionType, lat, lng' },
        { status: 400 }
      )
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const created = await db.region.create({
      data: {
        canonicalName: body.canonicalName,
        regionType: body.regionType,
        lat: body.lat,
        lng: body.lng,
        localName: body.localName ?? null,
        defaultLanguage: body.defaultLanguage ?? 'en',
        coverageStatus: body.coverageStatus ?? 'DEMO',
        parentId: body.parentId ?? null,
        stateCode: body.stateCode ?? null,
        boundarySource: body.boundarySource ?? null,
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'REGION_CREATE',
      entityType: 'Region',
      entityId: created.id,
      before: null,
      after: jsonSafe(created),
    })
    return NextResponse.json({ region: created })
  } catch (err) {
    console.error('[api/admin/regions] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to create region', detail: String(err) },
      { status: 500 }
    )
  }
}
