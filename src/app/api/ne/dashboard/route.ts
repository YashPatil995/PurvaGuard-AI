import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NE_STATES, matchNeStates, isPointInNorthEast, type NeState } from '@/lib/ne-geo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const stateFilter = url.searchParams.get('state')?.trim() // optional: 'Assam', 'Sikkim', etc.
    const hazardFilter = url.searchParams.get('hazard')?.trim() // optional: 'HEAVY_RAIN', 'EARTHQUAKE', etc.

    // 1. Fetch official active/recent SACHET alerts
    const alertsRaw = await db.alert.findMany({
      orderBy: [{ status: 'asc' }, { issuedAt: 'desc' }],
      take: 100,
      include: {
        regions: { include: { region: true } },
      },
    })

    // Filter SACHET alerts strictly relevant to North-East India
    const neAlerts = alertsRaw
      .map((a) => {
        const affectedStates = matchNeStates({
          title: a.title,
          body: a.body,
          issuerName: a.issuerName,
          lat: a.lat,
          lng: a.lng,
        })
        return {
          id: a.id,
          title: a.title,
          body: a.body,
          alertType: a.alertType,
          severity: a.severity,
          issuerType: a.issuerType,
          issuerName: a.issuerName,
          sourceUrl: a.sourceUrl,
          issuedAt: a.issuedAt,
          expiresAt: a.expiresAt,
          status: a.status,
          verificationStatus: a.verificationStatus,
          simulationMode: a.simulationMode,
          affectedStates,
          lat: a.lat,
          lng: a.lng,
        }
      })
      .filter((a) => {
        if (a.affectedStates.length === 0) return false
        if (stateFilter && !a.affectedStates.includes(stateFilter as NeState)) return false
        if (hazardFilter && hazardFilter !== 'ALL' && a.alertType !== hazardFilter) return false
        return true
      })

    // 2. Fetch scientific NESAC NER-DRR earthquake observations
    const earthquakesRaw = await db.riskPrediction.findMany({
      where: {
        hazardType: 'EARTHQUAKE',
      },
      orderBy: { generatedAt: 'desc' },
      take: 60,
    })

    const neEarthquakes = earthquakesRaw
      .map((eq) => {
        let meta: any = {}
        try {
          meta = JSON.parse(eq.inputSnapshot || '{}')
        } catch {}

        const place = String(meta.place || '')
        const region = String(meta.region || '')
        const fullText = `${place} ${region}`

        // State detection
        let state: string | null = null
        for (const s of NE_STATES) {
          if (fullText.toLowerCase().includes(s.toLowerCase())) {
            state = s
            break
          }
        }

        // Bounding check
        const inBounds = isPointInNorthEast(eq.lat, eq.lng)

        return {
          id: eq.id,
          eventId: meta.eventId || eq.id,
          magnitude: meta.magnitude || Math.round((eq.riskScore / 18) * 10) / 10,
          depthKm: meta.depthKm || 10,
          lat: eq.lat,
          lng: eq.lng,
          place: place || 'North East Region',
          region: region || state || 'North East',
          state: state || (inBounds ? 'North East Regional' : null),
          eventTime: eq.generatedAt,
          sourceUrl: meta.eventUrl || 'https://nerdrr.gov.in/',
          source: meta.source || 'NESAC NER-DRR (ISRO)',
          riskLevel: eq.riskLevel,
          riskScore: eq.riskScore,
          isScientificObservation: true,
          simulationMode: eq.simulationMode,
          inBounds,
        }
      })
      .filter((eq) => {
        if (!eq.state && !eq.inBounds) return false
        if (stateFilter && eq.state !== stateFilter) return false
        if (hazardFilter && hazardFilter !== 'ALL' && hazardFilter !== 'EARTHQUAKE') return false
        return true
      })

    // 3. Compute telemetry summary per state
    const stateSummary: Record<string, { alerts: number; earthquakes: number }> = {}
    for (const s of NE_STATES) {
      stateSummary[s] = { alerts: 0, earthquakes: 0 }
    }

    neAlerts.forEach((a) => {
      a.affectedStates.forEach((s) => {
        if (stateSummary[s]) stateSummary[s].alerts++
      })
    })

    neEarthquakes.forEach((eq) => {
      if (eq.state && stateSummary[eq.state]) {
        stateSummary[eq.state].earthquakes++
      }
    })

    // 4. Ingestion telemetry
    const dataSources = await db.dataSource.findMany({
      where: {
        id: { in: ['source-ndma-sachet', 'source-nerdrr-eq'] },
      },
    })

    return NextResponse.json({
      success: true,
      region: 'North-Eastern Region of India (NER)',
      statesCovered: NE_STATES,
      filter: { state: stateFilter || 'ALL', hazard: hazardFilter || 'ALL' },
      counts: {
        totalNeAlerts: neAlerts.length,
        totalNeEarthquakes: neEarthquakes.length,
      },
      stateSummary,
      alerts: neAlerts,
      earthquakes: neEarthquakes,
      dataSources: dataSources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        provider: ds.provider,
        healthStatus: ds.healthStatus,
        lastSuccessAt: ds.lastSuccessAt,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[api/ne/dashboard] Error:', err)
    return NextResponse.json(
      { error: 'Failed to build North-East dashboard data', detail: err.message },
      { status: 500 }
    )
  }
}
