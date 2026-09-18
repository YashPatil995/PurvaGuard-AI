import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'

type PatchBody = {
  facilityType?: string
  name?: string
  regionId?: string | null
  lat?: number
  lng?: number
  address?: string
  phone?: string
  capacity?: number
  availableUnits?: number
  accessibility?: string
  hours?: string
  status?: string
  source?: string
}

// PATCH /api/admin/facilities/[id] — update a facility.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = (await req.json()) as PatchBody
    const before = await db.facility.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const updated = await db.facility.update({
      where: { id },
      data: {
        facilityType: body.facilityType ?? undefined,
        name: body.name ?? undefined,
        regionId: body.regionId === undefined ? undefined : body.regionId,
        lat: body.lat ?? undefined,
        lng: body.lng ?? undefined,
        address: body.address ?? undefined,
        phone: body.phone ?? undefined,
        capacity: body.capacity ?? undefined,
        availableUnits: body.availableUnits ?? undefined,
        accessibility: body.accessibility ?? undefined,
        hours: body.hours ?? undefined,
        status: body.status ?? undefined,
        source: body.source ?? undefined,
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'FACILITY_UPDATE',
      entityType: 'Facility',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })
    return NextResponse.json({ facility: updated })
  } catch (err) {
    console.error('[api/admin/facilities/[id]] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update facility', detail: String(err) },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/facilities/[id] — soft delete: set status CLOSED.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const before = await db.facility.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')
    const updated = await db.facility.update({
      where: { id },
      data: { status: 'CLOSED' },
    })
    await writeAudit({
      actorId: admin?.id,
      action: 'FACILITY_CLOSE',
      entityType: 'Facility',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })
    return NextResponse.json({ facility: updated })
  } catch (err) {
    console.error('[api/admin/facilities/[id]] DELETE failed', err)
    return NextResponse.json(
      { error: 'Failed to close facility', detail: String(err) },
      { status: 500 }
    )
  }
}
