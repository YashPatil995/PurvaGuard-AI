import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchNerdrrEarthquakes } from '@/lib/nerdrr-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const url = new URL(request.url)
    const limit = Math.min(100, Math.max(5, Number(url.searchParams.get('limit')) || 35))
    const onlyNe = url.searchParams.get('all') !== 'true'

    console.log(`[api/nerdrr/ingest] Fetching earthquakes from NER-DRR (onlyNe=${onlyNe}, limit=${limit})...`)

    const eqList = await fetchNerdrrEarthquakes({ onlyNeStates: onlyNe, limit })

    if (eqList.length === 0) {
      await db.dataSource.upsert({
        where: { id: 'source-nerdrr-eq' },
        update: {
          lastErrorAt: new Date(),
          lastErrorMessage: 'NER-DRR earthquake feed returned 0 items',
          healthStatus: 'DEGRADED',
          updatedAt: new Date(),
        },
        create: {
          id: 'source-nerdrr-eq',
          name: 'NESAC NER-DRR Seismic Network',
          sourceType: 'SENSOR',
          provider: 'North Eastern Space Applications Centre (NESAC / ISRO)',
          refreshIntervalMinutes: 30,
          enabled: true,
          healthStatus: 'DEGRADED',
          lastErrorAt: new Date(),
          simulationMode: false,
        },
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'NER-DRR earthquake service checked; no new seismic events reported in NE in last 24h.',
        fetched: 0,
        inserted: 0,
        updated: 0,
      })
    }

    let inserted = 0
    let updated = 0
    const now = new Date()

    // Store in RiskPrediction table as scientific observations
    for (const eq of eqList) {
      const predId = `eq-obs-${eq.eventId}`
      const riskScore = Math.min(100, Math.max(10, Math.round(eq.magnitude * 18)))
      const riskLevel =
        eq.magnitude >= 5.5 ? 'VERY_HIGH'
        : eq.magnitude >= 4.5 ? 'HIGH'
        : eq.magnitude >= 3.5 ? 'MODERATE'
        : 'LOW'

      const existing = await db.riskPrediction.findUnique({
        where: { id: predId },
        select: { id: true },
      })

      const topFeaturesJson = JSON.stringify([
        { feature: 'Magnitude', contribution: eq.magnitude, value: `${eq.magnitude} M` },
        { feature: 'Depth', contribution: eq.depthKm, value: `${eq.depthKm} km` },
        { feature: 'Location', contribution: 1.0, value: eq.place },
        { feature: 'Source', contribution: 1.0, value: eq.source },
      ])

      const inputSnapshotJson = JSON.stringify({
        eventId: eq.eventId,
        place: eq.place,
        region: eq.region,
        status: eq.status,
        eventUrl: eq.eventUrl,
        source: eq.source,
        observationType: 'SEISMIC_TELEMETRY',
      })

      if (existing) {
        await db.riskPrediction.update({
          where: { id: predId },
          data: {
            riskScore,
            riskLevel,
            topFeatures: topFeaturesJson,
            inputSnapshot: inputSnapshotJson,
          },
        })
        updated++
      } else {
        await db.riskPrediction.create({
          data: {
            id: predId,
            lat: eq.latitude,
            lng: eq.longitude,
            hazardType: 'EARTHQUAKE',
            horizonMinutes: 1440,
            riskLevel,
            riskScore,
            confidence: 0.99, // Instrument recorded observation
            dataCoveragePct: 100,
            topFeatures: topFeaturesJson,
            inputSnapshot: inputSnapshotJson,
            modelVersion: 'NESAC-NERDRR-SEISMO-V1',
            generatedAt: eq.eventTime,
            expiresAt: new Date(eq.eventTime.getTime() + 48 * 3600 * 1000), // 48h active observation window
            simulationMode: false, // 100% genuine scientific observation
          },
        })
        inserted++
      }
    }

    // Update DataSource telemetry
    await db.dataSource.upsert({
      where: { id: 'source-nerdrr-eq' },
      update: {
        lastSuccessAt: now,
        lastErrorAt: null,
        lastErrorMessage: null,
        healthStatus: 'HEALTHY',
        updatedAt: now,
      },
      create: {
        id: 'source-nerdrr-eq',
        name: 'NESAC NER-DRR Seismic Network',
        sourceType: 'SENSOR',
        provider: 'North Eastern Space Applications Centre (NESAC / ISRO)',
        refreshIntervalMinutes: 30,
        enabled: true,
        healthStatus: 'HEALTHY',
        lastSuccessAt: now,
        simulationMode: false,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      provider: 'NESAC NER-DRR (Dept of Space, Govt of India)',
      durationMs: Date.now() - startTime,
      totalFetched: eqList.length,
      inserted,
      updated,
      sampleEvents: eqList.slice(0, 3).map((e) => ({
        id: e.id,
        magnitude: `${e.magnitude} M`,
        depth: `${e.depthKm} km`,
        place: e.place,
        state: e.state,
        coordinates: [e.latitude, e.longitude],
        eventTime: e.eventTime,
        sourceUrl: e.eventUrl,
      })),
    })
  } catch (error: any) {
    console.error('[api/nerdrr/ingest POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest NER-DRR earthquake data',
        detail: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const totalEq = await db.riskPrediction.count({
      where: { hazardType: 'EARTHQUAKE', simulationMode: false },
    })
    const latestEq = await db.riskPrediction.findMany({
      where: { hazardType: 'EARTHQUAKE', simulationMode: false },
      orderBy: { generatedAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      service: 'NESAC NER-DRR Earthquake Observation Service',
      status: 'READY',
      totalObservationsInDb: totalEq,
      latestObservations: latestEq.map((e) => {
        let meta: any = {}
        try {
          meta = JSON.parse(e.inputSnapshot || '{}')
        } catch {}
        return {
          id: e.id,
          lat: e.lat,
          lng: e.lng,
          riskLevel: e.riskLevel,
          riskScore: e.riskScore,
          eventTime: e.generatedAt,
          place: meta.place || 'North East Region',
          sourceUrl: meta.eventUrl,
        }
      }),
      usage: 'Send POST /api/nerdrr/ingest to synchronize real-time earthquake observations from NESAC.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
