// PurvaGuard AI — Incident detail API
// GET:   single incident with events, assignments, deliveries.
// PATCH: update status (with allowed-transition validation) and append a STATUS_CHANGE event.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Allowed forward status transitions for the demo workflow.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ['TRIAGED', 'VERIFIED', 'ASSIGNED', 'CANCELLED', 'DUPLICATE', 'UNVERIFIED_CLOSED'],
  TRIAGED: ['VERIFIED', 'ASSIGNED', 'CANCELLED', 'DUPLICATE', 'UNVERIFIED_CLOSED'],
  VERIFIED: ['ASSIGNED', 'RESPONDING', 'RESOLVED', 'CANCELLED', 'DUPLICATE'],
  ASSIGNED: ['RESPONDING', 'RESOLVED', 'CANCELLED'],
  RESPONDING: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  DUPLICATE: [],
  UNVERIFIED_CLOSED: [],
  CANCELLED: [],
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        assignments: { orderBy: { assignedAt: 'asc' } },
      },
    })
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const deliveries = await db.notificationDelivery.findMany({
      where: { incidentId: incident.id },
      orderBy: { queuedAt: 'asc' },
    })

    return NextResponse.json({
      incident: {
        id: incident.id,
        incidentCode: incident.incidentCode,
        incidentType: incident.incidentType,
        priority: incident.priority,
        status: incident.status,
        description: incident.description,
        lat: incident.lat,
        lng: incident.lng,
        locationAccuracyM: incident.locationAccuracyM,
        locationKind: incident.locationKind,
        peopleCount: incident.peopleCount,
        needs: incident.needs,
        reporterContact: incident.reporterContact,
        verificationStatus: incident.verificationStatus,
        assignedTeamId: incident.assignedTeamId,
        simulationMode: incident.simulationMode,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        closedAt: incident.closedAt,
      },
      events: incident.events,
      assignments: incident.assignments,
      deliveries,
    })
  } catch (err: any) {
    console.error('[api/incidents/[id] GET] error', err)
    return NextResponse.json(
      { error: 'Failed to load incident', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({} as any))
    const newStatus = body?.status ? String(body.status).toUpperCase() : null
    const note = body?.note ? String(body.note).slice(0, 800) : null
    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const incident = await db.incident.findUnique({ where: { id } })
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fromStatus = incident.status
    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Status transition ${fromStatus} -> ${newStatus} is not allowed`,
          allowedNext: allowed,
        },
        { status: 409 }
      )
    }

    const updated = await db.incident.update({
      where: { id },
      data: {
        status: newStatus,
        closedAt:
          newStatus === 'RESOLVED' || newStatus === 'CANCELLED' || newStatus === 'DUPLICATE'
            ? new Date()
            : incident.closedAt,
      },
    })

    await db.incidentEvent.create({
      data: {
        incidentId: incident.id,
        eventType: 'STATUS_CHANGE',
        fromStatus,
        toStatus: newStatus,
        note: note ?? `Status transitioned ${fromStatus} → ${newStatus}`,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      incident: {
        id: updated.id,
        incidentCode: updated.incidentCode,
        status: updated.status,
        priority: updated.priority,
        updatedAt: updated.updatedAt,
        closedAt: updated.closedAt,
        simulationMode: updated.simulationMode,
      },
      fromStatus,
      toStatus: newStatus,
    })
  } catch (err: any) {
    console.error('[api/incidents/[id] PATCH] error', err)
    return NextResponse.json(
      { error: 'Failed to update incident', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
