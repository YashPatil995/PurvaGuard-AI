import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

type CreateBody = {
  facilityType: string
  name: string
  regionId?: string | null
  lat: number
  lng: number
  address?: string
  phone?: string
  capacity?: number
  availableUnits?: number
  accessibility?: string
  hours?: string
  status?: string
  source?: string
}

// GET /api/admin/facilities — list all facilities.
export async function GET(request: Request) {
  const _auth = await requireAdmin(request)
  if (!_auth.ok) return _auth.response
  try {
    const items = await db.facility.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: {
        region: { select: { id: true, canonicalName: true, localName: true } },
      },
    })
    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    console.error('[api/admin/facilities] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list facilities', detail: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/admin/facilities — create a facility.
export async function POST(req: Request, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const body = (await req.json()) as CreateBody
    if (!body.facilityType || !body.name || body.lat == null || body.lng == null) {
      return NextResponse.json(
        { error: 'Missing required fields: facilityType, name, lat, lng' },
        { status: 400 }
      )
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const created = await db.facility.create({
      data: {
        facilityType: body.facilityType,
        name: body.name,
        regionId: body.regionId ?? null,
        lat: body.lat,
        lng: body.lng,
        address: body.address ?? null,
        phone: body.phone ?? null,
        capacity: body.capacity ?? null,
        availableUnits: body.availableUnits ?? null,
        accessibility: body.accessibility ?? null,
        hours: body.hours ?? null,
        status: body.status ?? 'OPEN',
        verifiedAt: new Date(),
        source: body.source ?? 'Admin Console (demo)',
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'FACILITY_CREATE',
      entityType: 'Facility',
      entityId: created.id,
      before: null,
      after: jsonSafe(created),
    })
    return NextResponse.json({ facility: created })
  } catch (err) {
    console.error('[api/admin/facilities] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to create facility', detail: String(err) },
      { status: 500 }
    )
  }
}
