// PurvaGuard AI — AI Prediction Engine API
// GET /api/prediction?lat=&lng=
// Returns the current nearest risk per hazard + the full explainability surface:
// modelInfo (PRD section 6.3), pipeline (10 steps), live inputFeatures, aggregated
// featureImportance, historicalAccuracy (12 points), disasterBehaviorAnalysis (text).
//
// All live input features + the accuracy series are deterministic per-location
// synthetic values, labeled DEMO. Risk predictions are read from the DB.

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

// Deterministic LCG in [0,1)
function seededRand(seed: number) {
  let s = (seed >>> 0) || 42
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// 10-step prediction pipeline (PRD section 6.3 — Data → Validation → Alignment →
// Feature Engineering → Model Run → Calibration → Risk Estimate → Guardrails →
// Review → Storage). All steps are `active` in this demo build.
const PIPELINE = [
  { step: 1, name: 'Data Ingestion', desc: 'Rainfall (IMD), slope (GSI), soil, land cover, incident history streams are pulled from regional connectors.', status: 'active' as const },
  { step: 2, name: 'Validation', desc: 'Schema + range checks per source. Stale (>90m) or implausible readings are flagged and quarantined.', status: 'active' as const },
  { step: 3, name: 'Alignment', desc: 'Observations reprojected to a common 1km grid and aligned to the same UTC timestamp window.', status: 'active' as const },
  { step: 4, name: 'Feature Engineering', desc: 'Derive 24h/7d rainfall, antecedent wetness, slope class, drainage density, incident density, seismic proxies.', status: 'active' as const },
  { step: 5, name: 'Model Run', desc: 'Gradient-boosted rule ensemble + logistic baseline score per hazard (landslide / flash flood / heavy rain).', status: 'active' as const },
  { step: 6, name: 'Calibration', desc: 'Platt-scaled probabilities mapped to risk levels using region-specific thresholds (Sikkim / NE calibration set).', status: 'active' as const },
  { step: 7, name: 'Risk Estimate', desc: 'Combined spatio-temporal risk score (0-100) for the next horizon (default 6h).', status: 'active' as const },
  { step: 8, name: 'Guardrails', desc: 'Safety filters: hard-cap LOW when rainfall < 5mm, suppress if sensor coverage < 40%, never auto-issue EMERGENCY.', status: 'active' as const },
  { step: 9, name: 'Review', desc: 'District operator + analyst review queue. District-verified before any public advisory is drafted.', status: 'active' as const },
  { step: 10, name: 'Storage', desc: 'RiskPrediction + AuditLog persisted. Output expires after horizonMinutes; superseded predictions are archived.', status: 'active' as const },
]

// Aggregated top features across all hazards — used by the feature-importance chart.
const FEATURE_IMPORTANCE = [
  { feature: '24h rainfall', avgContribution: 28, description: 'Primary trigger for both shallow landslides and flash-flood onset in steep Himalayan catchments.' },
  { feature: 'Antecedent wetness (7d)', avgContribution: 19, description: 'Saturated soil reduces effective cohesion — the dominant preconditioning factor for slope failure.' },
  { feature: 'Slope class', avgContribution: 15, description: 'Slopes 30-50° are most landslide-prone; flat valleys concentrate flash-flood risk instead.' },
  { feature: 'Drainage density', avgContribution: 11, description: 'Sparse drainage amplifies runoff pooling; dense networks evacuate water faster but flood downstream.' },
  { feature: 'Land cover', avgContribution: 8, description: 'Deforested / sparse slopes fail more readily. Forested slopes dissipate rainfall kinetic energy.' },
  { feature: 'Incident density (30d)', avgContribution: 7, description: 'Recent landslide / flood reports indicate active slope instability in the surrounding cluster.' },
  { feature: 'Soil type', avgContribution: 6, description: 'Clay-rich residual soils on phyllite/quartzite are more prone to flow-type failures.' },
  { feature: 'Seismic activity', avgContribution: 4, description: 'Recent shaking weakens slope fabric; the Teesta / Lohit corridors are particularly sensitive.' },
]

const MODEL_INFO = {
  version: 'purvaguard-baseline-v1',
  type: 'Gradient-boosted rules + logistic baseline',
  trainingData: 'Historical landslide/flood incidents (2015-2024, GSI + IMD demo)',
  supportedHazards: ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN'],
  supportedRegions: 'NE India (8 states + Sikkim)',
  lastEvaluated: '2026-01-15',
  metrics: {
    precision: 0.78,
    recall: 0.71,
    falseAlarmRate: 0.18,
    leadTimeMinutes: 210,
    calibration: 0.82,
  },
  limitations:
    'Model performance is illustrative for the hackathon demo. Validated on held-out data but not yet calibrated for all NE districts. ' +
    'Sensor coverage gaps may reduce accuracy in remote areas. Output is decision-support only — never an official warning.',
}

const HAZARDS = ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN'] as const

// Generate deterministic live input features for the requested location.
function generateInputFeatures(lat: number, lng: number, rainfall24h: number, slopeClass: string, wetness: string) {
  const seed = Math.floor(Math.abs(lat) * 1000 + Math.abs(lng) * 1000) % 100000
  const rand = seededRand(seed)
  const rainfall1h = Math.round((1 + rand() * 14) * 10) / 10
  const elevation = Math.round(800 + rand() * 2200)
  const landCover = ['sparse vegetation', 'dense forest', 'agriculture', 'bare / rocky'][Math.floor(rand() * 4)]
  const drainageDensity = ['high', 'medium', 'low'][Math.floor(rand() * 3)]
  const soilType = ['sandy loam', 'clay-rich residual', 'gravelly', 'silty loam'][Math.floor(rand() * 4)]
  const incidentDensity = Math.floor(rand() * 6)
  const seismicActivity = ['quiet', 'minor swarms (M<3)', 'recent M4+'][Math.floor(rand() * 3)]

  const freshness = (min: number) => `${min}m ago`
  return [
    { feature: '24h rainfall', value: `${rainfall24h} mm`, source: 'IMD radar mosaic', freshness: freshness(8 + Math.floor(rand() * 6)) },
    { feature: '1h rainfall intensity', value: `${rainfall1h} mm/h`, source: 'IMD AWS', freshness: freshness(3 + Math.floor(rand() * 4)) },
    { feature: 'Antecedent wetness (7d)', value: wetness, source: 'IMD 7d cumulative', freshness: freshness(15 + Math.floor(rand() * 10)) },
    { feature: 'Slope class', value: slopeClass, source: 'GSI DEM (CartoDEM 30m)', freshness: 'baseline (static)' },
    { feature: 'Elevation', value: `${elevation} m`, source: 'GSI DEM', freshness: 'baseline (static)' },
    { feature: 'Land cover', value: landCover, source: 'Bhuvan (OSM-tagged)', freshness: 'baseline (static)' },
    { feature: 'Drainage density', value: drainageDensity, source: 'OSM + GSI hydrography', freshness: 'baseline (static)' },
    { feature: 'Soil type', value: soilType, source: 'NBSS&LUP (demo)', freshness: 'baseline (static)' },
    { feature: 'Incident density (30d)', value: `${incidentDensity} reports`, source: 'PurvaGuard incidents', freshness: freshness(5 + Math.floor(rand() * 8)) },
    { feature: 'Seismic activity', value: seismicActivity, source: 'CSIR-NGRI feed', freshness: freshness(20 + Math.floor(rand() * 12)) },
  ]
}

// 12-month accuracy series (deterministic).
function generateHistoricalAccuracy(lat: number, lng: number) {
  const seed = Math.floor(Math.abs(lat) * 100 + Math.abs(lng) * 100 + 17) % 100000
  const rand = seededRand(seed || 7)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  // Monsoon (Jun-Sep) typically has more incidents to predict → recall rises, precision dips slightly.
  const monsoonBoost = [0.0, 0.0, 0.02, 0.03, 0.05, 0.09, 0.12, 0.11, 0.08, 0.03, 0.0, 0.0]
  return months.map((m, i) => {
    const base = 0.7 + rand() * 0.08
    const accuracy = Math.max(0.6, Math.min(0.92, Math.round((base + monsoonBoost[i]) * 100) / 100))
    const falseAlarms = Math.max(0.05, Math.min(0.32, Math.round((0.25 - monsoonBoost[i] * 0.5 + rand() * 0.05) * 100) / 100))
    return { month: m, accuracy, falseAlarms }
  })
}

// Plain-language behavior summary synthesized from the top contributing features.
function buildBehaviorAnalysis(
  regionName: string | null,
  rainfall24h: number,
  slopeClass: string,
  wetness: string,
  topPrediction: { hazardType: string; riskLevel: string; riskScore: number } | null,
): string {
  const loc = regionName ?? 'the selected area'
  const top = topPrediction
    ? ` The dominant signal right now is ${topPrediction.hazardType.replace(/_/g, ' ').toLowerCase()} risk at ${Math.round(topPrediction.riskScore)}/100 (${topPrediction.riskLevel.replace(/_/g, ' ')}).`
    : ''
  return (
    `Current 24h rainfall (${rainfall24h} mm) combined with ${slopeClass} slopes and ${wetness} antecedent wetness ` +
    `indicates ${topPrediction && topPrediction.riskScore >= 55 ? 'elevated' : 'moderate'} hazard probability for ${loc}.${top} ` +
    `The Teesta / Brahmaputra catchment is particularly sensitive due to recent seismic activity and historic deforestation in the lower slopes. ` +
    `River gauge trends and AWS-derived rainfall intensity are the highest-weighted live signals feeding the model right now.`
  )
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const latParam = url.searchParams.get('lat')
    const lngParam = url.searchParams.get('lng')

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 },
      )
    }

    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng must be numeric' },
        { status: 400 },
      )
    }

    // Find the closest region label for the requested coords (best-effort).
    let currentLocationName: string | null = null
    const regions = await db.region.findMany({ where: { active: true } })
    let bestRegion: { name: string; dist: number } | null = null
    for (const r of regions) {
      const d = distanceKm(lat, lng, r.lat, r.lng)
      if (!bestRegion || d < bestRegion.dist) bestRegion = { name: r.canonicalName, dist: d }
    }
    if (bestRegion && bestRegion.dist <= 60) currentLocationName = bestRegion.name

    // Nearest RiskPrediction per hazard (within 80 km).
    const all = await db.riskPrediction.findMany({
      include: { region: true },
      orderBy: { generatedAt: 'desc' },
    })

    const NEAR_KM = 80
    const byHazard = new Map<
      string,
      (typeof all)[number] & { regionName: string; distKm: number }
    >()

    for (const p of all) {
      if (!(HAZARDS as readonly string[]).includes(p.hazardType)) continue
      const d = distanceKm(lat, lng, p.lat, p.lng)
      if (d > NEAR_KM) continue
      const existing = byHazard.get(p.hazardType)
      if (!existing || d < existing.distKm || (d === existing.distKm && p.riskScore > existing.riskScore)) {
        byHazard.set(p.hazardType, {
          ...p,
          regionName: p.region?.canonicalName ?? 'Unknown region',
          distKm: d,
        })
      }
    }

    const predictions = HAZARDS.map((hazardType) => {
      const p = byHazard.get(hazardType)
      if (!p) {
        return {
          id: null,
          hazardType,
          riskLevel: 'LOW',
          riskScore: 0,
          confidence: 0,
          dataCoveragePct: 0,
          horizonMinutes: 360,
          topFeatures: [] as TopFeature[],
          modelVersion: MODEL_INFO.version,
          generatedAt: null,
          expiresAt: null,
          simulationMode: true,
          regionName: null,
          note: 'No nearby prediction — insufficient data',
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

    // Anchor synthetic feature values to the top-risk prediction (if any) so the
    // surface feels consistent with the live model output.
    const topRisk = [...predictions].filter((p) => p.id).sort((a, b) => b.riskScore - a.riskScore)[0] ?? null
    const topFeatures = topRisk?.topFeatures ?? []
    const rainfall24h =
      Number(topFeatures.find((f) => f.feature.toLowerCase().includes('rainfall'))?.value?.replace(/[^0-9.]/g, '')) ||
      Math.round(20 + ((Math.abs(lat) + Math.abs(lng)) % 60))
    const slopeClass =
      topFeatures.find((f) => f.feature.toLowerCase().includes('slope'))?.value ?? '30-45° (steep)'
    const wetness =
      topFeatures.find((f) => f.feature.toLowerCase().includes('wetness'))?.value ?? 'high'

    const inputFeatures = generateInputFeatures(lat, lng, rainfall24h, slopeClass, wetness)
    const historicalAccuracy = generateHistoricalAccuracy(lat, lng)
    const disasterBehaviorAnalysis = buildBehaviorAnalysis(
      currentLocationName ?? topRisk?.regionName ?? null,
      rainfall24h,
      slopeClass,
      wetness,
      topRisk ? { hazardType: topRisk.hazardType, riskLevel: topRisk.riskLevel, riskScore: topRisk.riskScore } : null,
    )

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      simulationMode: true,
      currentLocation: { name: currentLocationName ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lng },
      predictions,
      modelInfo: MODEL_INFO,
      pipeline: PIPELINE,
      inputFeatures,
      featureImportance: FEATURE_IMPORTANCE,
      historicalAccuracy,
      disasterBehaviorAnalysis,
      note:
        'Live input features, historical accuracy series and behavior analysis are deterministic DEMO values anchored to the nearest DB prediction. ' +
        'No generated prediction is presented as an official warning.',
    })
  } catch (err: any) {
    console.error('[api/prediction] error', err)
    return NextResponse.json(
      { error: 'Failed to load prediction data', detail: String(err?.message ?? err) },
      { status: 500 },
    )
  }
}
