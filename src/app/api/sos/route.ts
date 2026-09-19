// PurvaGuard AI — SOS / Get Help API
// POST: create an SOS incident (simulationMode true). Also create an IN_APP NotificationDelivery
//       to district-ops-queue, status ACKNOWLEDGED (simulated operator handoff).
// GET:  list recent SOS incidents.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }
    if (body?.consent !== true) {
      return NextResponse.json(
        { error: 'Explicit consent is required to submit an SOS' },
        { status: 400 }
      )
    }

    const accuracyM = body?.accuracyM !== undefined ? Number(body.accuracyM) : null
    const locationKind = String(body?.locationKind ?? 'GPS').toUpperCase()
    const peopleCount = Math.max(1, Number(body?.peopleCount ?? 1) || 1)
    const emergencyType = body?.emergencyType ? String(body.emergencyType) : null
    const description = body?.description ? String(body.description).slice(0, 1000) : ''
    const needs: string[] = Array.isArray(body?.needs)
      ? body.needs.filter((n: any) => typeof n === 'string').slice(0, 20)
      : []
    const contact = body?.contact ? String(body.contact).slice(0, 80) : null

    // Generate next incidentCode PG-2026-XXX based on existing count.
    const existingCount = await db.incident.count()
    const seq = String(existingCount + 1).padStart(3, '0')
    const incidentCode = `PG-2026-${seq}`

    const consentSnapshot = JSON.stringify({
      grantedAt: new Date().toISOString(),
      scope: 'SOS_REPORT',
      shared: ['location', 'emergencyType', 'peopleCount', 'needs', 'contact'],
      simulationMode: true,
    })

    const incident = await db.incident.create({
      data: {
        incidentCode,
        incidentType: 'SOS',
        priority: 'CRITICAL',
        status: 'NEW',
        description:
          description || (emergencyType ? `SOS: ${emergencyType}` : 'SOS — assistance requested'),
        lat,
        lng,
        locationAccuracyM: accuracyM ?? null,
        locationKind,
        peopleCount,
        needs: needs.length ? JSON.stringify(needs) : null,
        reporterContact: contact,
        consentSnapshot,
        sourceChannel: 'WEB',
        verificationStatus: 'UNVERIFIED',
        simulationMode: true,
      },
    })

    // Simulated delivery — ACKNOWLEDGED by a (demo) district operator queue.
    const delivery = await db.notificationDelivery.create({
      data: {
        incidentId: incident.id,
        recipient: 'district-ops-queue',
        channel: 'IN_APP',
        provider: 'purvaguard-ops-queue',
        status: 'ACKNOWLEDGED',
        queuedAt: new Date(),
        sentAt: new Date(),
        deliveredAt: new Date(),
        attempts: 1,
        simulationMode: true,
      },
    })

    await db.incidentEvent.create({
      data: {
        incidentId: incident.id,
        eventType: 'CREATED',
        toStatus: 'NEW',
        note: 'SOS submitted via web. Simulated delivery to district-ops-queue.',
        createdAt: incident.createdAt,
      },
    })

    return NextResponse.json({
      incident: {
        id: incident.id,
        incidentCode: incident.incidentCode,
        status: incident.status,
        priority: incident.priority,
        incidentType: incident.incidentType,
        lat: incident.lat,
        lng: incident.lng,
        locationAccuracyM: incident.locationAccuracyM,
        locationKind: incident.locationKind,
        peopleCount: incident.peopleCount,
        needs,
        description: incident.description,
        simulationMode: incident.simulationMode,
        createdAt: incident.createdAt,
      },
      deliveryStatus:
        'ACKNOWLEDGED (SIMULATED — not sent to government/emergency services)',
      deliveryId: delivery.id,
      simulationMode: true,
    })
  } catch (err: any) {
    console.error('[api/sos POST] error', err)
    return NextResponse.json(
      { error: 'Failed to submit SOS', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20))
    const incidents = await db.incident.findMany({
      where: { incidentType: 'SOS' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        incidentCode: true,
        status: true,
        priority: true,
        description: true,
        lat: true,
        lng: true,
        locationKind: true,
        peopleCount: true,
        createdAt: true,
        simulationMode: true,
      },
    })
    return NextResponse.json({
      items: incidents,
      count: incidents.length,
      simulationMode: true,
    })
  } catch (err: any) {
    console.error('[api/sos GET] error', err)
    return NextResponse.json(
      { error: 'Failed to list incidents', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
