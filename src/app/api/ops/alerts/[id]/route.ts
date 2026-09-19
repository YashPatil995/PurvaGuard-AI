import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

type ActionBody = { action: 'approve' | 'publish' | 'expire' | 'retract' }

// GET /api/ops/alerts/[id] — single alert with regions + deliveries.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!_auth.ok) return _auth.response
  try {
    const { id } = await ctx.params
    const alert = await db.alert.findUnique({
      where: { id },
      include: {
        regions: { include: { region: { select: { id: true, canonicalName: true, localName: true } } } },
        deliveries: { orderBy: { queuedAt: 'desc' } },
        author: { select: { id: true, name: true, email: true } },
      },
    })
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    return NextResponse.json({ alert })
  } catch (err) {
    console.error('[api/ops/alerts/[id]] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load alert', detail: String(err) },
      { status: 500 }
    )
  }
}

// PATCH /api/ops/alerts/[id] with body { action }.
// approve/publish/expire/retract — transitions status, verificationStatus,
// publishedAt and creates a NotificationDelivery on publish (simulated).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const { id } = await ctx.params
    const body = (await req.json()) as ActionBody
    const operator = await getDemoActor('district.operator.demo@purvaguard.in')

    const before = await db.alert.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const updates: any = {}
    let deliveryCreated: any = null

    if (body.action === 'approve') {
      updates.status = before.status === 'DRAFT' ? 'DRAFT' : before.status
      updates.verificationStatus = 'DISTRICT_VERIFIED'
      updates.approvedBy = operator?.id ?? null
    } else if (body.action === 'publish') {
      updates.status = 'ACTIVE'
      updates.publishedAt = new Date()
      if (before.verificationStatus === 'PLATFORM') {
        updates.verificationStatus = 'DISTRICT_VERIFIED'
      }
      updates.approvedBy = operator?.id ?? before.approvedBy ?? null
    } else if (body.action === 'expire') {
      updates.status = 'EXPIRED'
    } else if (body.action === 'retract') {
      updates.status = 'RETRACTED'
    } else {
      return NextResponse.json(
        { error: 'Unknown action. Expected: approve | publish | expire | retract' },
        { status: 400 }
      )
    }

    const updated = await db.alert.update({
      where: { id },
      data: updates,
      include: {
        regions: { include: { region: { select: { id: true, canonicalName: true, localName: true } } } },
        deliveries: { orderBy: { queuedAt: 'desc' } },
      },
    })

    // Simulated delivery receipt created on publish (no AlertEvent model —
    // use a NotificationDelivery row as the audit-friendly event record).
    if (body.action === 'publish') {
      const stateLabel = updated.regions[0]?.region?.canonicalName ?? 'Sikkim'
      deliveryCreated = await db.notificationDelivery.create({
        data: {
          alertId: updated.id,
          recipient: `geofence:${stateLabel.split(',').pop()?.trim() ?? stateLabel}`,
          channel: 'IN_APP',
          provider: 'purvaguard-push',
          status: 'DELIVERED',
          sentAt: new Date(),
          deliveredAt: new Date(),
          simulationMode: true,
        },
      })
    }

    await writeAudit({
      actorId: operator?.id,
      action: `ALERT_${body.action.toUpperCase()}`,
      entityType: 'Alert',
      entityId: id,
      before: jsonSafe(before),
      after: jsonSafe(updated),
    })

    return NextResponse.json({ alert: updated, delivery: deliveryCreated })
  } catch (err) {
    console.error('[api/ops/alerts/[id]] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update alert', detail: String(err) },
      { status: 500 }
    )
  }
}
