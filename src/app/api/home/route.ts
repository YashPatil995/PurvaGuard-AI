import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — page is location-aware and must never be cached at build time.
export const dynamic = 'force-dynamic'

const HAZARDS = ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN', 'ROAD_BLOCK', 'EARTHQUAKE'] as const

// Haversine distance in km (inline; not depending on shared client constants on server).
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function minutesAgo(date: Date): number {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
}

// Map a risk level to a directional trend hint (no historical series in schema).
function trendForLevel(level: string): 'up' | 'down' | 'steady' {
  if (level === 'HIGH' || level === 'VERY_HIGH') return 'up'
  if (level === 'LOW') return 'down'
  return 'steady'
}

interface RiskSummaryItem {
  hazard: string
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
  score: number
  confidence: number
  dataCoveragePct: number
  trend: 'up' | 'down' | 'steady'
  sourceFreshnessMinutes: number
  modelVersion: string
  simulationMode: boolean
  note?: string
}

interface HomePayload {
  riskSummary: RiskSummaryItem[]
  weather:
    | {
        stationName: string | null
        rainfall24hMm: number
        rainfall1hMm: number
        temperatureC: number
        humidityPct: number
        windKph: number
        observedAt: string
        demoLabel: boolean
        distanceKm: number
      }
    | null
  activeAlerts: Array<{
    id: string
    title: string
    severity: string
    alertType: string
    issuerName: string
    issuedAt: string
    expiresAt: string
    verificationStatus: string
    simulationMode: boolean
    lat: number | null
    lng: number | null
    distanceKm: number | null
  }>
  news: Array<{
    id: string
    title: string
    summary: string
    publisher: string
    sourceUrl: string
    publishedAt: string
    demoLabel: boolean
    pinned: boolean
  }>
  preparednessTip: {
    slug: string
    title: string
    excerpt: string
    hazardType: string | null
  } | null
  nearbyFacilities: Array<{
    id: string
    name: string
    facilityType: string
    lat: number
    lng: number
    status: string
    capacity: number | null
    availableUnits: number | null
    distanceKm: number
  }>
  locationMeta: {
    name: string
    lat: number
    lng: number
    lastUpdated: string
  }
}

// GET /api/home?lat=...&lng=...&name=...
// Returns the combined landing-page payload for the currently selected location.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const latRaw = parseFloat(searchParams.get('lat') ?? '')
    const lngRaw = parseFloat(searchParams.get('lng') ?? '')
    const name = searchParams.get('name') ?? 'Selected location'

    if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required and must be numeric' },
        { status: 400 }
      )
    }
    const lat = latRaw
    const lng = lngRaw

    // ── Risk predictions ───────────────────────────────────────────────
    // Fetch all predictions (small dataset) and pick nearest within ~50km per hazard.
    const predictions = await db.riskPrediction.findMany({
      where: { hazardType: { in: HAZARDS as unknown as string[] } },
      orderBy: { generatedAt: 'desc' },
    })

    const riskSummary: RiskSummaryItem[] = HAZARDS.map((hazard) => {
      const within = predictions
        .filter((p) => p.hazardType === hazard)
        .map((p) => ({ p, dist: haversineKm(lat, lng, p.lat, p.lng) }))
        .filter((x) => x.dist <= 50)
        .sort((a, b) => a.dist - b.dist)

      if (within.length === 0) {
        return {
          hazard,
          level: 'LOW' as const,
          score: 0,
          confidence: 0,
          dataCoveragePct: 0,
          trend: 'steady' as const,
          sourceFreshnessMinutes: 0,
          modelVersion: 'purvaguard-baseline-v1',
          simulationMode: true,
          note: 'No nearby prediction — defaulting to LOW. Monitor local conditions.',
        }
      }

      const p = within[0].p
      const level = (['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].includes(p.riskLevel)
        ? p.riskLevel
        : 'LOW') as RiskSummaryItem['level']

      return {
        hazard,
        level,
        score: Math.round(p.riskScore ?? 0),
        confidence: Math.round((p.confidence ?? 0) * 100) / 100,
        dataCoveragePct: Math.round(p.dataCoveragePct ?? 0),
        trend: trendForLevel(level),
        sourceFreshnessMinutes: minutesAgo(p.generatedAt),
        modelVersion: p.modelVersion ?? 'purvaguard-baseline-v1',
        simulationMode: p.simulationMode,
      }
    })

    // ── Weather observation (nearest within ~50km) ─────────────────────
    const weatherObs = await db.weatherObservation.findMany()
    const nearestWeather = weatherObs
      .filter((w) => w.lat != null && w.lng != null)
      .map((w) => ({ w, dist: haversineKm(lat, lng, w.lat as number, w.lng as number) }))
      .filter((x) => x.dist <= 50)
      .sort((a, b) => a.dist - b.dist)[0]

    const weather = nearestWeather
      ? {
          stationName: nearestWeather.w.stationName,
          rainfall24hMm: nearestWeather.w.rainfall24hMm ?? 0,
          rainfall1hMm: nearestWeather.w.rainfall1hMm ?? 0,
          temperatureC: nearestWeather.w.temperatureC ?? 0,
          humidityPct: nearestWeather.w.humidityPct ?? 0,
          windKph: nearestWeather.w.windKph ?? 0,
          observedAt: nearestWeather.w.observedAt.toISOString(),
          demoLabel: nearestWeather.w.demoLabel,
          distanceKm: Math.round(nearestWeather.dist * 10) / 10,
        }
      : null

    // ── Active alerts (status ACTIVE; nearest first within ~80km) ──────
    const activeAlertsRaw = await db.alert.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    })
    const activeAlerts = activeAlertsRaw
      .map((a) => ({
        a,
        dist:
          a.lat != null && a.lng != null
            ? haversineKm(lat, lng, a.lat, a.lng)
            : Number.POSITIVE_INFINITY,
      }))
      .filter((x) => x.dist <= 80)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map(({ a, dist }) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        alertType: a.alertType,
        issuerName: a.issuerName,
        issuedAt: a.issuedAt.toISOString(),
        expiresAt: a.expiresAt.toISOString(),
        verificationStatus: a.verificationStatus,
        simulationMode: a.simulationMode,
        lat: a.lat,
        lng: a.lng,
        distanceKm: Number.isFinite(dist) ? Math.round(dist * 10) / 10 : null,
      }))

    // ── Latest news (status PUBLISHED, pinned first) ───────────────────
    const newsRaw = await db.newsItem.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 4,
    })
    const news = newsRaw.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      publisher: n.publisher,
      sourceUrl: n.sourceUrl,
      publishedAt: n.publishedAt.toISOString(),
      demoLabel: n.demoLabel,
      pinned: n.pinned,
    }))

    // ── Preparedness tip of the day (landslide guide by default) ───────
    const tip = await db.contentPage.findFirst({
      where: {
        slug: { in: ['landslide-before-during-after', 'flash-flood-guide', 'earthquake-guide'] },
      },
      orderBy: { updatedAt: 'desc' },
    })
    const preparednessTip = tip
      ? {
          slug: tip.slug,
          title: tip.title,
          excerpt: tip.body.replace(/[#>*_`-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
          hazardType: tip.hazardType,
        }
      : null

    // ── Nearby facilities (5 nearest within ~30km) ─────────────────────
    const facilitiesRaw = await db.facility.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    const nearbyFacilities = facilitiesRaw
      .map((f) => ({ f, dist: haversineKm(lat, lng, f.lat, f.lng) }))
      .filter((x) => x.dist <= 30)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
      .map(({ f, dist }) => ({
        id: f.id,
        name: f.name,
        facilityType: f.facilityType,
        lat: f.lat,
        lng: f.lng,
        status: f.status,
        capacity: f.capacity,
        availableUnits: f.availableUnits,
        distanceKm: Math.round(dist * 10) / 10,
      }))

    // lastUpdated = most recent generator/observation timestamp we found.
    const candidateTimes: number[] = [Date.now()]
    for (const p of predictions) candidateTimes.push(p.generatedAt.getTime())
    if (nearestWeather) candidateTimes.push(nearestWeather.w.observedAt.getTime())
    const lastUpdated = new Date(Math.max(...candidateTimes)).toISOString()

    const payload: HomePayload = {
      riskSummary,
      weather,
      activeAlerts,
      news,
      preparednessTip,
      nearbyFacilities,
      locationMeta: { name, lat, lng, lastUpdated },
    }

    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('[api/home GET]', err)
    return NextResponse.json(
      { error: 'Failed to load home payload', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
