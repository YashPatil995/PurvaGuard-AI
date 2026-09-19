import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/ops/incidents — list incidents with filters + events/assignments counts.
export async function GET(req: Request) {
  if (!_auth.ok) return _auth.response
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)

    const where: any = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (type) where.incidentType = type

    const items = await db.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 100,
      include: {
        events: { select: { id: true, eventType: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        assignments: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            volunteer: { select: { id: true, name: true } },
          },
        },
      },
    })

    const total = await db.incident.count({ where })

    return NextResponse.json({
      items: items.map((i) => ({
        ...i,
        eventsCount: i.events.length,
        assignmentsCount: i.assignments.length,
      })),
      total,
    })
  } catch (err) {
    console.error('[api/ops/incidents] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list incidents', detail: String(err) },
      { status: 500 }
    )
  }
}
