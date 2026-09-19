// PurvaGuard AI — Community Reports API
// GET:  list CommunityReports with optional category/status/limit filters.
// POST: create a CommunityReport (status RECEIVED, verificationStatus UNVERIFIED, sim mode true).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CATEGORIES = new Set([
  'LANDSLIDE', 'CRACK', 'FLOOD', 'ROAD_BLOCK', 'BRIDGE_DAMAGE',
  'FALLEN_TREE', 'BUILDING_DAMAGE', 'MISSING_PERSON', 'FIRE', 'OTHER',
])
const STATUSES = new Set(['RECEIVED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED'])
const SEVERITIES = new Set(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '50') || 50))
    const category = searchParams.get('category')?.toUpperCase()
    const status = searchParams.get('status')?.toUpperCase()

    const where: any = {}
    if (category && CATEGORIES.has(category)) where.category = category
    if (status && STATUSES.has(status)) where.status = status

    const reports = await db.communityReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({
      items: reports,
      count: reports.length,
      simulationMode: true,
    })
  } catch (err: any) {
    console.error('[api/reports GET] error', err)
    return NextResponse.json(
      { error: 'Failed to list reports', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const category = String(body?.category ?? '').toUpperCase()
    const description = String(body?.description ?? '').slice(0, 2000)
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    const severity = String(body?.severity ?? 'MODERATE').toUpperCase()

    if (!CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }
    if (!SEVERITIES.has(severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }

    const observedAt = body?.observedAt ? new Date(body.observedAt) : new Date()
    if (Number.isNaN(observedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid observedAt' }, { status: 400 })
    }

    const report = await db.communityReport.create({
      data: {
        category,
        description,
        lat,
        lng,
        severity,
        status: 'RECEIVED',
        verificationStatus: 'UNVERIFIED',
        simulationMode: true,
        observedAt,
      },
    })

    return NextResponse.json({ report, simulationMode: true })
  } catch (err: any) {
    console.error('[api/reports POST] error', err)
    return NextResponse.json(
      { error: 'Failed to create report', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
