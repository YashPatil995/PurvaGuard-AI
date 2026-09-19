import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

type DraftBody = {
  alertType: string
  severity: string
  title: string
  body: string
  lat?: number
  lng?: number
  radiusKm?: number
  validFrom?: string
  expiresAt?: string
  languages?: string
  simulationMode?: boolean
}

// GET /api/ops/alerts — list alerts (default: all) with optional status filter.
export async function GET(req: Request) {
  const _auth = await requireAdmin(req)
  if (!_auth.ok) return _auth.response
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // DRAFT | ACTIVE | EXPIRED | RETRACTED
    const alerts = await db.alert.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        regions: { include: { region: { select: { id: true, canonicalName: true, localName: true } } } },
        deliveries: { select: { id: true, channel: true, status: true, recipient: true, simulationMode: true } },
      },
    })
    return NextResponse.json({ items: alerts, total: alerts.length })
  } catch (err) {
    console.error('[api/ops/alerts] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list alerts', detail: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/ops/alerts — draft a new alert.
// Created with status DRAFT and verificationStatus PLATFORM.
// authorId is the seeded district operator.
export async function POST(req: Request, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const body = (await req.json()) as DraftBody
    if (!body.alertType || !body.severity || !body.title || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: alertType, severity, title, body' },
        { status: 400 }
      )
    }
    const operator = await getDemoActor('district.operator.demo@purvaguard.in')
    if (!operator) {
      return NextResponse.json({ error: 'Operator account not seeded' }, { status: 500 })
    }

    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date()
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 6 * 3600000)

    const created = await db.alert.create({
      data: {
        alertType: body.alertType,
        issuerType: 'OPERATOR',
        issuerName: operator.name,
        title: body.title,
        body: body.body,
        severity: body.severity,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        radiusKm: body.radiusKm ?? 10,
        validFrom,
        expiresAt,
        status: 'DRAFT',
        verificationStatus: 'PLATFORM',
        languages: body.languages ?? 'en,hi,ne,as',
        simulationMode: body.simulationMode ?? true,
        authorId: operator.id,
      },
    })

    await writeAudit({
      actorId: operator.id,
      action: 'ALERT_DRAFT',
      entityType: 'Alert',
      entityId: created.id,
      before: null,
      after: jsonSafe(created),
    })

    return NextResponse.json({ alert: created })
  } catch (err) {
    console.error('[api/ops/alerts] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to draft alert', detail: String(err) },
      { status: 500 }
    )
  }
}
