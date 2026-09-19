// PurvaGuard AI — Risk & Forecast API
// GET /api/risk?lat=&lng=&regionId=
// Returns current nearest risk per hazard, synthetic 24h timeseries, district ranking,
// model explanation, and a historical baseline reference. Labeled as DEMO/simulation.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { distanceKm } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface TopFeature {
  feature: string
  contribution: number
  value: string
}

function parseTopFeatures(raw?: string | null): TopFeature[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => ({
        feature: String(p?.feature ?? 'unknown'),
        contribution: Number(p?.contribution ?? 0),
        value: String(p?.value ?? ''),
      }))
    }
    return []
  } catch {
    return []
  }
}

// Deterministic pseudo-random in [0,1) seeded by an integer.
function seededRand(seed: number) {
  // simple LCG
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Generate a deterministic 24h rainfall series around the requested lat/lng.
// Uses a seed derived from coordinates so the same location always shows the same demo series.
function generateTimeseries(lat: number, lng: number, baseRiskScore: number) {
  const seed = Math.floor((Math.abs(lat) * 1000 + Math.abs(lng) * 1000)) % 100000
  const rand = seededRand(seed || 42)
  const points: Array<{ hour: string; rainfallMm: number; riskScore: number }> = []
  // peak rainfall somewhere in the 6-12h ahead window
  const peakHour = 6 + Math.floor(rand() * 6)
  for (let i = 0; i < 24; i++) {
    // gaussian-ish around peakHour
    const dist = Math.abs(i - peakHour)
    const peakFactor = Math.exp(-(dist * dist) / 8)
    const base = 0.5 + rand() * 1.5
    const rainfallMm = Math.round((base + peakFactor * (8 + rand() * 14)) * 10) / 10
    const riskScore = Math.max(
      0,
      Math.min(100, Math.round(baseRiskScore * 0.4 + peakFactor * (60 + rand() * 35)))
    )
    points.push({
      hour: i.toString().padStart(2, '0') + ':00',
      rainfallMm,
      riskScore,
    })
  }
  return points
}

// Deterministic monthly baseline (12 months) — historical reference for the region.
function generateBaseline(lat: number, lng: number) {
  const seed = Math.floor((Math.abs(lat) * 100 + Math.abs(lng) * 100) + 7) % 100000
  const rand = seededRand(seed || 99)
  // monsoon months (Jun-Sep) are higher in the Himalayan/NE region
  const monsoonFactor = [0.3, 0.3, 0.35, 0.5, 0.7, 0.95, 1.0, 1.0, 0.9, 0.55, 0.35, 0.3]
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((m, i) => ({
    month: m,
    avgRiskScore: Math.round((10 + monsoonFactor[i] * (45 + rand() * 35)) * 10) / 10,
    isMonsoon: monsoonFactor[i] >= 0.9,
  }))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const latParam = url.searchParams.get('lat')
    const lngParam = url.searchParams.get('lng')
    const regionId = url.searchParams.get('regionId')

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      )
    }

    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng must be numeric' },
        { status: 400 }
      )
    }

    // Load all risk predictions with their regions (small dataset for MVP).
    const predictions = await db.riskPrediction.findMany({
      include: { region: true },
      orderBy: { generatedAt: 'desc' },
    })

    // If a regionId is provided, prefer predictions for that region; otherwise use proximity.
    const NEAR_KM = 80

    const byHazard = new Map<string, (typeof predictions)[number] & { regionName: string; distKm: number }>()

    for (const p of predictions) {
      const hazardType = p.hazardType
      // Only show the two primary hazard types for the MVP overview.
      if (hazardType !== 'LANDSLIDE' && hazardType !== 'FLASH_FLOOD') continue

      let distKm = 0
      let regionName = p.region?.canonicalName ?? 'Unknown region'

      if (regionId && p.regionId === regionId) {
        distKm = 0
      } else {
        distKm = distanceKm(lat, lng, p.lat, p.lng)
        if (distKm > NEAR_KM) continue
      }

      const existing = byHazard.get(hazardType)
      // Pick the nearest; on ties, the highest riskScore.
      if (!existing || distKm < existing.distKm ||
          (distKm === existing.distKm && p.riskScore > existing.riskScore)) {
        byHazard.set(hazardType, { ...p, regionName, distKm })
      }
    }

    const HAZARDS = ['LANDSLIDE', 'FLASH_FLOOD'] as const
    const current = HAZARDS.map((hazardType) => {
      const p = byHazard.get(hazardType)
      if (!p) {
        return {
          hazardType,
          riskLevel: 'LOW',
          riskScore: 0,
          confidence: 0,
          dataCoveragePct: 0,
          horizonMinutes: 360,
          topFeatures: [] as TopFeature[],
          modelVersion: 'purvaguard-baseline-v1',
          generatedAt: null,
          expiresAt: null,
          simulationMode: true,
          regionName: null,
          note: 'No reliable estimate — insufficient data',
        }
      }
      return {
        id: p.id,
        hazardType: p.hazardType,
        riskLevel: p.riskLevel,
        riskScore: Math.round(p.riskScore * 10) / 10,
        confidence: Math.round(p.confidence * 100) / 100,
        dataCoveragePct: Math.round(p.dataCoveragePct * 10) / 10,
        horizonMinutes: p.horizonMinutes,
        topFeatures: parseTopFeatures(p.topFeatures),
        modelVersion: p.modelVersion,
        generatedAt: p.generatedAt,
        expiresAt: p.expiresAt,
        simulationMode: p.simulationMode,
        regionName: p.regionName,
      }
    })

    // District ranking: top 8 by max riskScore across all predictions.
    const rankingByRegion = new Map<string, { regionName: string; maxScore: number; hazardType: string; riskLevel: string }>()
    for (const p of predictions) {
      const name = p.region?.canonicalName ?? `(${p.lat.toFixed(3)}, ${p.lng.toFixed(3)})`
      const cur = rankingByRegion.get(name)
      if (!cur || p.riskScore > cur.maxScore) {
        rankingByRegion.set(name, {
          regionName: name,
          maxScore: Math.round(p.riskScore * 10) / 10,
          hazardType: p.hazardType,
          riskLevel: p.riskLevel,
        })
      }
    }
    const districtRanking = Array.from(rankingByRegion.values())
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, 8)

    // Model explanation: pick the highest-risk prediction overall.
    const sortedByRisk = [...predictions].sort((a, b) => b.riskScore - a.riskScore)
    const topRisk = sortedByRisk[0]
    let modelExplanation: any = null
    if (topRisk) {
      const generatedAtMs = new Date(topRisk.generatedAt).getTime()
      const dataFreshnessMinutes = Math.max(0, Math.round((Date.now() - generatedAtMs) / 60000))
      modelExplanation = {
        hazardType: topRisk.hazardType,
        riskLevel: topRisk.riskLevel,
        riskScore: Math.round(topRisk.riskScore * 10) / 10,
        regionName: topRisk.region?.canonicalName ?? 'Unknown region',
        topFeatures: parseTopFeatures(topRisk.topFeatures),
        dataCoveragePct: Math.round(topRisk.dataCoveragePct * 10) / 10,
        modelVersion: topRisk.modelVersion,
        dataFreshnessMinutes,
        limitations:
          'Model output is a baseline estimate trained on limited historical observations for the Himalayan & NE region. ' +
          'Predictions degrade when rainfall radar, river gauges, or sensor telemetry are unavailable. ' +
          'Treat as decision-support only; defer to on-ground verification and official authority bulletins. ' +
          'Do not interpret ranking as a guarantee of safety.',
      }
    } else {
      modelExplanation = {
        hazardType: null,
        riskLevel: 'LOW',
        riskScore: 0,
        regionName: null,
        topFeatures: [],
        dataCoveragePct: 0,
        modelVersion: 'purvaguard-baseline-v1',
        dataFreshnessMinutes: null,
        limitations: 'No model output is currently available. Insufficient live data to produce a forecast.',
      }
    }

    // Anchor the synthetic timeseries to the highest-risk score near the requested location (if any).
    const anchorScore =
      current.find((c) => c.hazardType === 'FLASH_FLOOD')?.riskScore ??
      current.find((c) => c.hazardType === 'LANDSLIDE')?.riskScore ??
      modelExplanation?.riskScore ??
      30
    const timeseries = generateTimeseries(lat, lng, anchorScore)
    const baseline = generateBaseline(lat, lng)

    // Highest-risk "current" entry for the requested location to surface a coverage figure.
    const locationTop = [...current]
      .filter((c) => c.id)
      .sort((a, b) => b.riskScore - a.riskScore)[0]
    const dataCoveragePct = locationTop?.dataCoveragePct ?? 0

    return NextResponse.json({
      simulationMode: true,
      modelVersion: 'purvaguard-baseline-v1',
      generatedAt: new Date().toISOString(),
      location: { lat, lng, regionId: regionId ?? null },
      current,
      timeseries,
      districtRanking,
      modelExplanation,
      baseline,
      dataCoveragePct,
      note:
        'Risk output is generated by the PurvaGuard baseline model (purvaguard-baseline-v1). ' +
        'Timeseries and baseline are deterministic synthetic data labeled DEMO.',
    })
  } catch (err: any) {
    console.error('[api/risk] error', err)
    return NextResponse.json(
      { error: 'Failed to load risk data', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
