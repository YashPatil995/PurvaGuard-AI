import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

// Allowed incident status transitions (used by PATCH).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ['TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED', 'DUPLICATE', 'CANCELLED', 'UNVERIFIED_CLOSED'],
  TRIAGED: ['VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED', 'DUPLICATE', 'CANCELLED', 'UNVERIFIED_CLOSED'],
  VERIFIED: ['ASSIGNED', 'RESPONDING', 'RESOLVED', 'DUPLICATE', 'CANCELLED', 'UNVERIFIED_CLOSED'],
  ASSIGNED: ['RESPONDING', 'RESOLVED', 'CANCELLED', 'DUPLICATE'],
  RESPONDING: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  DUPLICATE: [],
  UNVERIFIED_CLOSED: [],
  CANCELLED: [],
}

type PatchBody = {
  status?: string
  priority?: string
  assignedTeamId?: string | null
  note?: string
}

// GET /api/ops/incidents/[id] — full incident detail.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!_auth.ok) return _auth.response
  try {
    const { id } = await ctx.params
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        assignments: {
          include: { volunteer: { select: { id: true, name: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        attachments: true,
        reporter: { select: { id: true, name: true, email: true } },
      },
    })
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }
    // NotificationDelivery has no relation back to Incident — fetch separately.
    const deliveries = await db.notificationDelivery.findMany({
      where: { incidentId: id },
      orderBy: { queuedAt: 'desc' },
    })
    return NextResponse.json({ incident: { ...incident, deliveries } })
  } catch (err) {
    console.error('[api/ops/incidents/[id]] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load incident', detail: String(err) },
      { status: 500 }
    )
  }
}

// PATCH /api/ops/incidents/[id]
// Body: { status?, priority?, assignedTeamId?, note? }
// Validates status transitions, appends IncidentEvent (STATUS_CHANGE or NOTE),
// and creates an IncidentAssignment when assigning.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const { id } = await ctx.params
    const body = (await req.json()) as PatchBody

    const operator = await getDemoActor('district.operator.demo@purvaguard.in')
    const before = await db.incident.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    const updates: any = {}
    const eventsToCreate: any[] = []

    // Validate + apply status transition
    if (body.status && body.status !== before.status) {
      const allowed = ALLOWED_TRANSITIONS[before.status] ?? []
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: ${before.status} → ${body.status}`,
            allowed,
          },
          { status: 400 }
        )
      }
      updates.status = body.status
      if (body.status === 'RESOLVED') updates.closedAt = new Date()
      if (body.status === 'VERIFIED') updates.verificationStatus = 'VERIFIED'
      eventsToCreate.push({
        eventType: 'STATUS_CHANGE',
        fromStatus: before.status,
        toStatus: body.status,
        note: body.note ?? null,
        actorId: operator?.id ?? null,
      })
    }

    // Priority update
    if (body.priority && body.priority !== before.priority) {
      updates.priority = body.priority
      eventsToCreate.push({
        eventType: 'PRIORITY_CHANGE',
        fromStatus: null,
        toStatus: null,
        note: `Priority changed ${before.priority} → ${body.priority}`,
        actorId: operator?.id ?? null,
        payload: JSON.stringify({ from: before.priority, to: body.priority }),
      })
    }

    // Assignment change
    if (body.assignedTeamId !== undefined && body.assignedTeamId !== before.assignedTeamId) {
      updates.assignedTeamId = body.assignedTeamId
      eventsToCreate.push({
        eventType: 'ASSIGN_TEAM',
        fromStatus: null,
        toStatus: null,
        note: `Team assignment set to ${body.assignedTeamId ?? 'unassigned'}`,
        actorId: operator?.id ?? null,
        payload: JSON.stringify({ from: before.assignedTeamId, to: body.assignedTeamId }),
      })
    }

    // Standalone note
    if (body.note && !body.status && !body.priority && body.assignedTeamId === undefined) {
      eventsToCreate.push({
        eventType: 'NOTE',
        fromStatus: null,
        toStatus: null,
        note: body.note,
        actorId: operator?.id ?? null,
      })
    }

    const updated = await db.incident.update({
      where: { id },
      data: {
        ...updates,
        events: eventsToCreate.length ? { create: eventsToCreate } : undefined,
      },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        assignments: { include: { volunteer: { select: { id: true, name: true } } } },
        attachments: true,
      },
    })
    const deliveries = await db.notificationDelivery.findMany({
      where: { incidentId: id },
      orderBy: { queuedAt: 'desc' },
    })
    const updatedWithDeliveries = { ...updated, deliveries }

    // Audit
    await writeAudit({
      actorId: operator?.id,
      action: 'INCIDENT_UPDATE',
      entityType: 'Incident',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updatedWithDeliveries),
    })

    const newEvent = updated.events[updated.events.length - 1] ?? null
    return NextResponse.json({ incident: updatedWithDeliveries, newEvent })
  } catch (err) {
    console.error('[api/ops/incidents/[id]] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update incident', detail: String(err) },
      { status: 500 }
    )
  }
}
