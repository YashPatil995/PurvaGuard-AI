// PurvaGuard AI — Alert detail API
// GET /api/alerts/[id]
// Returns a single alert with full detail, regions, and NotificationDelivery list.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function mapDelivery(d: any) {
  return {
    id: d.id,
    channel: d.channel,
    provider: d.provider ?? null,
    status: d.status,
    recipient: d.recipient,
    queuedAt: d.queuedAt instanceof Date ? d.queuedAt.toISOString() : d.queuedAt,
    sentAt: d.sentAt instanceof Date ? d.sentAt.toISOString() : d.sentAt,
    deliveredAt: d.deliveredAt instanceof Date ? d.deliveredAt.toISOString() : d.deliveredAt,
    attempts: d.attempts,
    simulationMode: !!d.simulationMode,
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const alert = await db.alert.findUnique({
      where: { id },
      include: {
        regions: { include: { region: true } },
        deliveries: { orderBy: { queuedAt: 'desc' } },
        author: true,
      },
    })
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const regions = alert.regions.map((ar) => ({
      id: ar.region?.id ?? ar.regionId,
      canonicalName: ar.region?.canonicalName ?? 'Unknown region',
      localName: ar.region?.localName ?? null,
      regionType: ar.region?.regionType ?? null,
    }))

    return NextResponse.json({
      id: alert.id,
      title: alert.title,
      body: alert.body,
      alertType: alert.alertType,
      severity: alert.severity,
      modelRiskLevel: alert.modelRiskLevel ?? null,
      confidence: alert.confidence !== null && alert.confidence !== undefined ? Number(alert.confidence) : null,
      issuerType: alert.issuerType,
      issuerName: alert.issuerName,
      sourceUrl: alert.sourceUrl ?? null,
      lat: alert.lat ?? null,
      lng: alert.lng ?? null,
      radiusKm: alert.radiusKm,
      issuedAt: alert.issuedAt instanceof Date ? alert.issuedAt.toISOString() : alert.issuedAt,
      validFrom: alert.validFrom instanceof Date ? alert.validFrom.toISOString() : alert.validFrom,
      expiresAt: alert.expiresAt instanceof Date ? alert.expiresAt.toISOString() : alert.expiresAt,
      status: alert.status,
      verificationStatus: alert.verificationStatus,
      languages: alert.languages ? String(alert.languages).split(',').map((s) => s.trim()).filter(Boolean) : ['en'],
      simulationMode: !!alert.simulationMode,
      version: alert.version,
      approvedBy: alert.approvedBy ?? null,
      publishedAt: alert.publishedAt instanceof Date ? alert.publishedAt.toISOString() : alert.publishedAt,
      authorName: alert.author?.name ?? null,
      regions,
      deliveries: alert.deliveries.map(mapDelivery),
      deliveryCount: alert.deliveries.length,
    })
  } catch (err: any) {
    console.error('[api/alerts/[id]] error', err)
    return NextResponse.json(
      { error: 'Failed to load alert', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
