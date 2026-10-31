// PurvaGuard AI — Road Closures & Blockages API
// Reads verified closures & community reports from Supabase PostgreSQL (RoadSegment & CommunityReport).
// Accepts new community blockage reports and enforces verification tiers.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { distanceKm } from '@/lib/constants'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const radiusKm = Math.min(200, Math.max(1, Number(searchParams.get('radius') ?? '50') || 50))

    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

    // 1. Fetch official road segments
    const roadSegments = await db.roadSegment.findMany({
      where: {
        status: { in: ['CLOSED', 'RESTRICTED'] },
      },
    })

    // 2. Fetch community road block reports
    const communityReports = await db.communityReport.findMany({
      where: {
        category: 'ROAD_BLOCK',
        status: { not: 'REJECTED' },
      },
      orderBy: { observedAt: 'desc' },
      take: 50,
    })

    const now = Date.now()
    const STALE_MS = 48 * 60 * 60 * 1000 // 48 hours

    // Map road segments (Official Authority Closures)
    const officialClosures = roadSegments
      .map((r) => {
        const d = hasCoords ? distanceKm(lat, lng, r.lat, r.lng) : null
        const isStale = r.verifiedAt ? now - new Date(r.verifiedAt).getTime() > STALE_MS : false
        return {
          id: r.id,
          sourceType: 'OFFICIAL_AUTHORITY',
          sourceName: r.source || 'State Highway / PWD Department',
          title: r.name,
          description: r.restrictions || 'Road closed by traffic authority due to disaster conditions.',
          status: 'VERIFIED',
          severity: 'HIGH',
          lat: r.lat,
          lng: r.lng,
          distanceKm: d !== null ? Math.round(d * 10) / 10 : null,
          reportedAt: r.createdAt.toISOString(),
          verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
          isStale,
        }
      })
      .filter((r) => r.distanceKm === null || r.distanceKm <= radiusKm)

    // Map community reports
    const mappedCommunity = communityReports
      .map((c) => {
        const d = hasCoords ? distanceKm(lat, lng, c.lat, c.lng) : null
        const isStale = now - new Date(c.observedAt).getTime() > STALE_MS
        const isVerified = c.status === 'VERIFIED'
        return {
          id: c.id,
          sourceType: 'COMMUNITY_REPORT',
          sourceName: isVerified ? 'Community Report (District Verified)' : 'Citizen Crowd-sourced Report',
          title: `Road Obstruction: ${c.severity} Severity`,
          description: c.description,
          status: c.status, // RECEIVED | UNDER_REVIEW | VERIFIED | RESOLVED
          severity: c.severity,
          lat: c.lat,
          lng: c.lng,
          distanceKm: d !== null ? Math.round(d * 10) / 10 : null,
          reportedAt: c.observedAt.toISOString(),
          verifiedAt: isVerified ? c.updatedAt.toISOString() : null,
          isStale,
        }
      })
      .filter((c) => c.distanceKm === null || c.distanceKm <= radiusKm)

    const confirmed = [
      ...officialClosures,
      ...mappedCommunity.filter((c) => c.status === 'VERIFIED'),
    ]

    const pendingCommunity = mappedCommunity.filter((c) => c.status !== 'VERIFIED')

    return NextResponse.json({
      confirmedClosures: confirmed,
      communityReports: pendingCommunity,
      totalConfirmed: confirmed.length,
      totalPending: pendingCommunity.length,
      origin: hasCoords ? { lat, lng } : null,
      radiusKm,
      lastUpdated: new Date().toISOString(),
      disclaimer:
        'Confirmed closures are verified by district responders or state highway authorities. Unconfirmed community reports are citizen submissions undergoing review.',
    })
  } catch (err: any) {
    console.error('[api/road-closures GET] error:', err.message)
    return NextResponse.json(
      { error: 'Failed to retrieve road closures', detail: err.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    const roadName = String(body?.roadName || '').trim()
    const description = String(body?.description || '').trim()
    const cause = String(body?.cause || 'OBSTRUCTION').trim()
    const severity = String(body?.severity || 'HIGH').toUpperCase()

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      )
    }

    if (!description && !roadName) {
      return NextResponse.json(
        { error: 'Road name or blockage description is required' },
        { status: 400 }
      )
    }

    const fullDesc = [
      roadName ? `Location: ${roadName}` : null,
      cause ? `Cause: ${cause}` : null,
      description,
    ]
      .filter(Boolean)
      .join(' — ')

    const validSeverities = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
    const safeSeverity = validSeverities.includes(severity) ? severity : 'HIGH'

    const report = await db.communityReport.create({
      data: {
        category: 'ROAD_BLOCK',
        description: fullDesc,
        lat,
        lng,
        severity: safeSeverity,
        status: 'RECEIVED', // Pending verification by operators
        verificationStatus: 'UNVERIFIED',
        simulationMode: false,
        observedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Road blockage report submitted successfully. It will undergo review by district responders.',
      reportId: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    })
  } catch (err: any) {
    console.error('[api/road-closures POST] error:', err.message)
    return NextResponse.json(
      { error: 'Failed to submit road blockage report', detail: err.message },
      { status: 500 }
    )
  }
}
