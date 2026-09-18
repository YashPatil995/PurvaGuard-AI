import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'

type PatchBody = {
  id: string
  action: 'approve' | 'reject'
}

// GET /api/admin/volunteers — list volunteer profiles.
export async function GET() {
  try {
    const items = await db.volunteerProfile.findMany({
      orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    console.error('[api/admin/volunteers] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list volunteers', detail: String(err) },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/volunteers — approve or reject a volunteer profile.
export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchBody
    if (!body.id || !body.action) {
      return NextResponse.json({ error: 'Missing { id, action }' }, { status: 400 })
    }
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400 }
      )
    }
    const before = await db.volunteerProfile.findUnique({ where: { id: body.id } })
    if (!before) {
      return NextResponse.json({ error: 'Volunteer profile not found' }, { status: 404 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const newStatus = body.action === 'approve' ? 'VERIFIED' : 'REJECTED'
    const updated = await db.volunteerProfile.update({
      where: { id: body.id },
      data: {
        verificationStatus: newStatus,
        approvedBy: admin?.id ?? null,
        approvedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    })

    await writeAudit({
      actorId: admin?.id,
      action: `VOLUNTEER_${body.action.toUpperCase()}`,
      entityType: 'VolunteerProfile',
      entityId: body.id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })

    return NextResponse.json({ profile: updated })
  } catch (err) {
    console.error('[api/admin/volunteers] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update volunteer', detail: String(err) },
      { status: 500 }
    )
  }
}
