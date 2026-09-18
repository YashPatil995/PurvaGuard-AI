'use client'

// PurvaGuard AI — Home view.
// Rich, image-heavy landing page for the selected NE India locality.
// Includes a small explorable NE India map with overlaid markers, hero with
// Himalayan background image, 5-card risk grid with hazard thumbnails,
// checklist + weather, nearby safe places, news, preparedness tip and
// district status snapshot. CRITICAL: refetches from /api/home whenever the
// selected location's lat/lng changes.

import * as React from 'react'
import Image from 'next/image'
import { useApp, type SelectedLocation } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { useT } from '@/lib/use-i18n'
import {
  formatRelativeTime,
  projectLatLng,
  MAP_BOUNDS,
  DEMO_REGIONS,
  HAZARD_META,
  SITE_IMAGES,
  type ModelRiskLevel,
  type HazardType,
  type ViewId,
} from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  ModelRiskBadge,
  HazardBadge,
  DemoBadge,
  SimulationBadge,
  VerificationBadge,
  SeverityBadge,
  StatusBadge,
  HazardIcon,
} from '@/components/shared/badges'
import {
  Siren,
  ShieldCheck,
  Megaphone,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MapPin,
  ExternalLink,
  Droplets,
  Thermometer,
  Wind,
  Cloud,
  CloudRain,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  ChevronRight,
  Wifi,
  WifiOff,
  Building2,
  Activity,
  Compass,
  Stethoscope,
  House,
  HeartPulse,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types (mirror /api/home response) ────────────────────────────────────
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
type Trend = 'up' | 'down' | 'steady'

interface RiskSummaryItem {
  hazard: string
  level: RiskLevel
  score: number
  confidence: number
  dataCoveragePct: number
  trend: Trend
  sourceFreshnessMinutes: number
  modelVersion: string
  simulationMode: boolean
  note?: string
}

interface WeatherData {
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

interface AlertItem {
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
}

interface NewsItemData {
  id: string
  title: string
  summary: string
  publisher: string
  sourceUrl: string
  publishedAt: string
  demoLabel: boolean
  pinned: boolean
}

interface FacilityItem {
  id: string
  name: string
  facilityType: string
  lat: number
  lng: number
  status: string
  capacity: number | null
  availableUnits: number | null
  distanceKm: number
}

interface PreparednessTipData {
  slug: string
  title: string
  excerpt: string
  hazardType: string | null
}

interface HomePayload {
  riskSummary: RiskSummaryItem[]
  weather: WeatherData | null
  activeAlerts: AlertItem[]
  news: NewsItemData[]
  preparednessTip: PreparednessTipData | null
  nearbyFacilities: FacilityItem[]
  locationMeta: {
    name: string
    lat: number
    lng: number
    lastUpdated: string
  }
}

const HAZARD_ORDER: string[] = ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN', 'ROAD_BLOCK', 'EARTHQUAKE']

const TREND_ICON: Record<Trend, React.ComponentType<{ className?: string }>> = {
  up: TrendingUp,
  down: TrendingDown,
  steady: Minus,
}

const TREND_TONE: Record<Trend, string> = {
  up: 'text-orange-500 dark:text-orange-400',
  down: 'text-emerald-500 dark:text-emerald-400',
  steady: 'text-muted-foreground',
}

const RISK_RANK: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  VERY_HIGH: 3,
}

function computeOverallRisk(summary: RiskSummaryItem[]): RiskLevel {
  let max: RiskLevel = 'LOW'
  for (const r of summary) {
    if (RISK_RANK[r.level] > RISK_RANK[max]) max = r.level
  }
  return max
}

// Personalized actionable checklist derived from current risk levels + weather.
function generateChecklist(
  summary: RiskSummaryItem[],
  weather: WeatherData | null
): { text: string; tone: 'critical' | 'caution' | 'info' }[] {
  const byHazard: Record<string, RiskSummaryItem | undefined> = {}
  for (const r of summary) byHazard[r.hazard] = r

  const items: { text: string; tone: 'critical' | 'caution' | 'info' }[] = []

  const landslide = byHazard['LANDSLIDE']
  if (landslide?.level === 'HIGH' || landslide?.level === 'VERY_HIGH') {
    items.push({ text: 'Move away from steep slopes and the base of hills; watch for new ground cracks.', tone: 'critical' })
  } else if (landslide?.level === 'MODERATE') {
    items.push({ text: 'Stay alert for landslide warning signs: cracks, tilting poles, muddy springs.', tone: 'caution' })
  }

  const flash = byHazard['FLASH_FLOOD']
  if (flash?.level === 'HIGH' || flash?.level === 'VERY_HIGH') {
    items.push({ text: 'Move to higher ground; avoid river crossings and low-lying areas.', tone: 'critical' })
  } else if (flash?.level === 'MODERATE') {
    items.push({ text: 'Avoid riverbanks and stream crossings until conditions improve.', tone: 'caution' })
  }

  const rain = byHazard['HEAVY_RAIN']
  if (rain?.level === 'HIGH' || rain?.level === 'VERY_HIGH') {
    items.push({ text: 'Avoid non-essential travel; secure household items and clear drains.', tone: 'critical' })
  } else if (weather && weather.rainfall24hMm > 50) {
    items.push({ text: 'Clear drains and avoid low-lying crossings — recent rainfall is elevated.', tone: 'caution' })
  }

  const road = byHazard['ROAD_BLOCK']
  if (road?.level === 'HIGH' || road?.level === 'VERY_HIGH') {
    items.push({ text: 'Confirm road status before travel; keep an alternate route in mind.', tone: 'caution' })
  }

  const quake = byHazard['EARTHQUAKE']
  if (quake?.level === 'HIGH' || quake?.level === 'VERY_HIGH') {
    items.push({ text: 'Review Drop–Cover–Hold On with your family; identify safe spots in each room.', tone: 'caution' })
  }

  // Always-on general preparedness items (keep this list useful even when low risk)
  items.push({ text: 'Keep your phone charged and a power bank ready.', tone: 'info' })
  items.push({ text: 'Review your family communication plan and emergency contacts.', tone: 'info' })
  items.push({ text: 'Keep your emergency go-bag updated (water, medicines, documents).', tone: 'info' })

  return items.slice(0, 6)
}

// Look up local name (Hindi / regional script) for the selected locality,
// falling back through the store-provided localName then DEMO_REGIONS match.
function findLocalName(loc: SelectedLocation): string {
  if (loc.localName) return loc.localName
  const match = DEMO_REGIONS.find(
    (r) =>
      r.name === loc.name ||
      (Math.abs(r.lat - loc.lat) < 0.01 && Math.abs(r.lng - loc.lng) < 0.01)
  )
  return match?.localName ?? ''
}

// ── Main view ───────────────────────────────────────────────────────────
export default function HomeView() {
  const { location, setLocation, setView, connectivity, language } = useApp()
  const { t } = useT()

  const [data, setData] = React.useState<HomePayload | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = React.useState(0)

  // CRITICAL FIX: refetch whenever the selected location's lat/lng changes.
  // Previously the effect captured stale data because the dependency array
  // did not include the actual coordinates. We now explicitly depend on
  // location.lat, location.lng and location.name so a new fetch fires every
  // time the user picks a different locality from the header dropdown.
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const url = `/api/home?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}&name=${encodeURIComponent(location.name)}`

    apiGet<HomePayload>(url)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load home data.'
        setError(msg)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [location.lat, location.lng, location.name, refreshNonce])

  const refresh = React.useCallback(() => setRefreshNonce((n) => n + 1), [])

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 md:space-y-6">
      {/* Top title strip */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            {t('nav.home', 'Home')}
            <span className="ml-2 text-muted-foreground font-normal text-sm">· Disaster intelligence for the Himalayan &amp; NE region</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('home.updatedJustNow', 'Updated just now')} · {language.toUpperCase()} · Pilot coverage: 20 NE India localities
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={refresh}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
        </Button>
      </div>

      {loading ? (
        <HomeSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data available.'} onRetry={refresh} />
      ) : (
        <HomeContent
          data={data}
          location={location}
          setLocation={setLocation}
          setView={setView}
          connectivity={connectivity}
          t={t}
        />
      )}
    </div>
  )
}

// ── Content ─────────────────────────────────────────────────────────────
function HomeContent({
  data,
  location,
  setLocation,
  setView,
  connectivity,
  t,
}: {
  data: HomePayload
  location: SelectedLocation
  setLocation: (l: SelectedLocation) => void
  setView: (v: ViewId) => void
  connectivity: 'ONLINE' | 'WEAK' | 'OFFLINE'
  t: (key: string, fallback?: string) => string
}) {
  const overall = computeOverallRisk(data.riskSummary)
  const checklist = generateChecklist(data.riskSummary, data.weather)
  const localName = findLocalName(location)

  return (
    <>
      {/* 1. Hero with Himalayan background image */}
      <HeroStrip
        name={data.locationMeta.name}
        localName={localName}
        lat={data.locationMeta.lat}
        lng={data.locationMeta.lng}
        lastUpdated={data.locationMeta.lastUpdated}
        connectivity={connectivity}
        overallRisk={overall}
        activeAlertCount={data.activeAlerts.length}
        setView={setView}
        t={t}
      />

      {/* 2. Small explorable NE India map */}
      <MiniMapCard
        location={location}
        locationName={data.locationMeta.name}
        alerts={data.activeAlerts}
        facilities={data.nearbyFacilities}
        setView={setView}
      />

      {/* 3. Risk summary grid */}
      <section aria-label={t('home.riskSummary', 'Risk summary — next 6 hours')}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('home.riskSummary', 'Risk summary — next 6 hours')}
          </h2>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('risk')}>
            Full forecast <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...data.riskSummary]
            .sort(
              (a, b) =>
                HAZARD_ORDER.indexOf(a.hazard) - HAZARD_ORDER.indexOf(b.hazard)
            )
            .map((r) => (
              <RiskCard key={r.hazard} item={r} setView={setView} />
            ))}
        </div>
      </section>

      {/* 4. Two-column: checklist + weather */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <ChecklistCard items={checklist} />
        <WeatherCard weather={data.weather} />
      </section>

      {/* 5. Nearby safe places */}
      <SafePlacesCard facilities={data.nearbyFacilities} setView={setView} />

      {/* 6. Latest news */}
      <NewsCard news={data.news} setView={setView} />

      {/* 7. Preparedness tip */}
      <PreparednessTipCard tip={data.preparednessTip} setView={setView} />

      {/* 8. District status snapshot */}
      <DistrictSnapshotCard
        alertCount={data.activeAlerts.length}
        criticalAlertCount={data.activeAlerts.filter(
          (a) => a.severity === 'WARNING' || a.severity === 'EMERGENCY'
        ).length}
        riskSummary={data.riskSummary}
        weather={data.weather}
        setView={setView}
      />
    </>
  )
}

// ── Hero strip (image background + dark overlay) ──────────────────────
function HeroStrip({
  name,
  localName,
  lat,
  lng,
  lastUpdated,
  connectivity,
  overallRisk,
  activeAlertCount,
  setView,
  t,
}: {
  name: string
  localName: string
  lat: number
  lng: number
  lastUpdated: string
  connectivity: 'ONLINE' | 'WEAK' | 'OFFLINE'
  overallRisk: RiskLevel
  activeAlertCount: number
  setView: (v: ViewId) => void
  t: (key: string, fallback?: string) => string
}) {
  const connMeta = {
    ONLINE: { Icon: Wifi, label: 'Online', cls: 'border-emerald-300/60 bg-emerald-500/15 text-emerald-100 backdrop-blur' },
    WEAK: { Icon: Wifi, label: 'Weak signal', cls: 'border-amber-300/60 bg-amber-500/15 text-amber-100 backdrop-blur' },
    OFFLINE: { Icon: WifiOff, label: 'Offline', cls: 'border-red-300/60 bg-red-500/15 text-red-100 backdrop-blur' },
  }[connectivity]

  return (
    <Card className="relative overflow-hidden border-0 p-0 text-white shadow-lg">
      {/* Hero background image */}
      <div className="absolute inset-0">
        <Image
          src={SITE_IMAGES.hero}
          alt="Himalayan landscape at dawn"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 100vw"
          className="object-cover"
        />
      </div>
      {/* Dark gradient overlay for legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-slate-900/30"
        aria-hidden
      />
      {/* Subtle navy tint */}
      <div className="absolute inset-0 bg-slate-950/20" aria-hidden />

      <div className="relative p-5 md:p-8 space-y-5">
        {/* Top row: location + connectivity */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="h-5 w-5 text-cyan-300 shrink-0" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate drop-shadow">
                {name}
              </h1>
              <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium', connMeta.cls)}>
                <connMeta.Icon className="h-3 w-3" />
                {connMeta.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200/90 flex-wrap">
              {localName && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Compass className="h-3 w-3" />
                  {localName}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatRelativeTime(lastUpdated)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MapPin className="h-3 w-3" />
                {lat.toFixed(3)}°N, {lng.toFixed(3)}°E
              </span>
              {activeAlertCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {activeAlertCount} active {activeAlertCount === 1 ? 'alert' : 'alerts'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/90">
              Overall risk
            </div>
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              <ModelRiskBadge level={overallRisk as ModelRiskLevel} />
              <SimulationBadge />
            </div>
          </div>
        </div>

        <Separator className="bg-white/15" />

        {/* Action buttons row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={() => setView('map')}
          >
            <MapPin className="h-3.5 w-3.5" />
            {t('home.checkArea', 'Check my area')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => setView('sos')}
          >
            <Siren className="h-3.5 w-3.5" />
            SOS / Get Help
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setView('safe-places')}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('home.findSafePlace', 'Find a safe place')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setView('reports')}
          >
            <Megaphone className="h-3.5 w-3.5" />
            {t('home.reportHazard', 'Report a hazard')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Mini explorable NE India map ────────────────────────────────────────
function MiniMapCard({
  location,
  locationName,
  alerts,
  facilities,
  setView,
}: {
  location: SelectedLocation
  locationName: string
  alerts: AlertItem[]
  facilities: FacilityItem[]
  setView: (v: ViewId) => void
}) {
  const [selected, setSelected] = React.useState<{
    kind: 'loc' | 'alert' | 'facility'
    id: string
    label: string
    detail?: string
  } | null>(null)

  const sel = projectLatLng(location.lat, location.lng)

  // Filter markers to those within map bounds; clamp defensively.
  const inBounds = (x: number, y: number) =>
    x >= -2 && x <= 102 && y >= -2 && y <= 102

  const alertMarkers = alerts
    .map((a) => ({
      a,
      p: a.lat != null && a.lng != null ? projectLatLng(a.lat, a.lng) : null,
    }))
    .filter((x) => x.p && inBounds(x.p!.x, x.p!.y)) as {
    a: AlertItem
    p: { x: number; y: number }
  }[]

  const facilityMarkers = facilities
    .map((f) => ({
      f,
      p: projectLatLng(f.lat, f.lng),
    }))
    .filter((x) => inBounds(x.p.x, x.p.y))

  return (
    <Card className="overflow-hidden p-0 gap-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">
              North East India — pilot coverage
            </h3>
            <p className="text-[11px] text-muted-foreground">
              20 seeded localities · click markers for details
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setView('map')}>
          <MapPin className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open full map</span>
          <span className="sm:hidden">Map</span>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Map area */}
      <div className="relative w-full h-[280px] sm:h-[300px] bg-slate-200 dark:bg-slate-800">
        {/* Background map image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${SITE_IMAGES.mapBg}')` }}
          aria-hidden
        />
        {/* Dark overlay for marker legibility */}
        <div className="absolute inset-0 bg-slate-950/30 dark:bg-slate-950/45" aria-hidden />

        {/* North arrow */}
        <div className="pointer-events-none absolute top-2 right-2 z-20 flex flex-col items-center gap-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/80">
          <Compass className="h-3 w-3" />
          N
        </div>

        {/* Extent label */}
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-[9px] font-medium text-white/70 tabular-nums">
          {MAP_BOUNDS.minLat}–{MAP_BOUNDS.maxLat}°N · {MAP_BOUNDS.minLng}–{MAP_BOUNDS.maxLng}°E
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1 rounded-md border border-white/20 bg-slate-900/60 backdrop-blur px-2 py-1.5 text-[10px] text-white">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-cyan-300/50" />
            Your location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Active alert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Safe place
          </span>
        </div>

        {/* Markers layer */}
        <div className="absolute inset-0">
          {/* Selected location pulsing marker */}
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 outline-none"
                  style={{ left: `${sel.x}%`, top: `${sel.y}%` }}
                  onClick={() =>
                    setSelected({
                      kind: 'loc',
                      id: 'selected',
                      label: locationName,
                      detail: `Your selected locality · ${location.lat.toFixed(3)}°N, ${location.lng.toFixed(3)}°E`,
                    })
                  }
                  aria-label={`Your location: ${locationName}`}
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-cyan-500 ring-2 ring-white shadow-md" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                <strong>{locationName}</strong> — your location
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Facility markers (green) */}
          <TooltipProvider delayDuration={120}>
            {facilityMarkers.map(({ f, p }) => (
              <Tooltip key={`fac-${f.id}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 outline-none"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={() =>
                      setSelected({
                        kind: 'facility',
                        id: f.id,
                        label: f.name,
                        detail: `${f.facilityType.replace(/_/g, ' ').toLowerCase()} · ${f.distanceKm} km · ${f.status.replace(/_/g, ' ').toLowerCase()}`,
                      })
                    }
                    aria-label={`Safe place: ${f.name}`}
                  >
                    <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white/80 shadow" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  <strong>{f.name}</strong> · {f.distanceKm} km
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {/* Alert markers (red) */}
          <TooltipProvider delayDuration={120}>
            {alertMarkers.map(({ a, p }) => (
              <Tooltip key={`alert-${a.id}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 outline-none"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={() =>
                      setSelected({
                        kind: 'alert',
                        id: a.id,
                        label: a.title,
                        detail: `${a.alertType.replace(/_/g, ' ').toLowerCase()} · ${a.severity.toLowerCase()} · ${a.distanceKm ?? '?'} km`,
                      })
                    }
                    aria-label={`Alert: ${a.title}`}
                  >
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white/80 shadow" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  <strong>{a.title}</strong> · {a.severity}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Selected marker info card (bottom-center overlay) */}
        {selected && (
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-40 w-[260px] sm:w-[320px] rounded-md border border-white/20 bg-slate-900/85 backdrop-blur text-white p-2.5 shadow-lg">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                  selected.kind === 'loc'
                    ? 'bg-cyan-400'
                    : selected.kind === 'alert'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-slate-300">
                  {selected.kind === 'loc'
                    ? 'Your location'
                    : selected.kind === 'alert'
                    ? 'Active alert'
                    : 'Safe place'}
                </div>
                <div className="text-[12px] font-semibold leading-tight">
                  {selected.label}
                </div>
                {selected.detail && (
                  <div className="text-[10.5px] text-slate-300 mt-0.5 leading-snug">
                    {selected.detail}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-slate-300 hover:text-white"
                onClick={() => setSelected(null)}
                aria-label="Close marker info"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {selected.kind === 'alert' && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 w-full gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setView('alerts')}
              >
                View alert <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            {selected.kind === 'facility' && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 w-full gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setView('safe-places')}
              >
                Open safe places <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Risk card with hazard image thumbnail ──────────────────────────────
function RiskCard({ item, setView }: { item: RiskSummaryItem; setView: (v: ViewId) => void }) {
  const TrendIcon = TREND_ICON[item.trend]
  const hazard = item.hazard as HazardType
  const meta = HAZARD_META[hazard] ?? HAZARD_META.GENERAL

  return (
    <Card className="overflow-hidden p-0 gap-0 group">
      {/* Thumbnail image */}
      <button
        type="button"
        onClick={() => setView('risk')}
        className="relative block w-full h-20 overflow-hidden"
        aria-label={`Open ${meta.label} risk forecast`}
      >
        <Image
          src={meta.image}
          alt={`${meta.label} hazard illustration`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent" aria-hidden />
        {/* Title + trend on image */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15 backdrop-blur text-white">
              <HazardIcon type={hazard} className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold leading-tight text-white truncate">
                {meta.label}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-white/70">
                {item.modelVersion.replace('purvaguard-', '').replace('-v1', '')}
              </div>
            </div>
          </div>
          <TrendIcon
            className={cn('h-4 w-4 shrink-0', TREND_TONE[item.trend])}
            aria-label={`trend ${item.trend}`}
          />
        </div>
      </button>

      {/* Card body */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <ModelRiskBadge level={item.level as ModelRiskLevel} />
          {item.simulationMode && <DemoBadge className="text-[9px] px-1.5 py-0" />}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Risk score</span>
            <span className="font-semibold tabular-nums">{item.score}/100</span>
          </div>
          <Progress value={item.score} className="h-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-semibold tabular-nums">{Math.round(item.confidence * 100)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Data coverage</span>
            <span className="font-semibold tabular-nums">{item.dataCoveragePct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Source {item.sourceFreshnessMinutes === 0 ? '—' : `${item.sourceFreshnessMinutes}m ago`}
        </div>

        {item.note && (
          <p className="text-[10px] text-muted-foreground italic leading-snug">{item.note}</p>
        )}
      </div>
    </Card>
  )
}

// ── Checklist card ──────────────────────────────────────────────────────
function ChecklistCard({
  items,
}: {
  items: { text: string; tone: 'critical' | 'caution' | 'info' }[]
}) {
  const toneCls = {
    critical: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    caution: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    info: 'border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
  }
  const toneIcon = {
    critical: AlertTriangle,
    caution: AlertTriangle,
    info: CheckCircle2,
  }
  return (
    <Card className="overflow-hidden p-0 gap-0">
      {/* Header image strip */}
      <div className="relative h-24 w-full overflow-hidden">
        <Image
          src={SITE_IMAGES.emergencyKit}
          alt="Emergency preparedness kit"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-transparent" aria-hidden />
        <div className="absolute inset-0 p-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-cyan-300" />
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              What should I do now?
            </h3>
            <p className="text-[11px] text-white/80">Personalized actions for your area</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-2">
        <ScrollArea className="max-h-80 pr-3">
          <ul className="space-y-2">
            {items.map((it, i) => {
              const Icon = toneIcon[it.tone]
              return (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] leading-snug',
                    toneCls[it.tone]
                  )}
                >
                  <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{it.text}</span>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </div>
    </Card>
  )
}

// ── Weather card ────────────────────────────────────────────────────────
function WeatherCard({ weather }: { weather: WeatherData | null }) {
  return (
    <Card className="overflow-hidden p-0 gap-0">
      {/* Header with weather imagery */}
      <div className="relative h-24 w-full overflow-hidden bg-slate-900">
        <Image
          src={HAZARD_META.HEAVY_RAIN.image}
          alt="Heavy rain weather backdrop"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent" aria-hidden />
        <div className="absolute inset-0 p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-cyan-300" />
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Local weather</h3>
              <p className="text-[11px] text-white/80">
                {weather?.stationName ? `${weather.stationName} · ` : ''}
                {weather ? `${weather.distanceKm} km away` : 'No nearby station'}
              </p>
            </div>
          </div>
          {weather?.demoLabel && <DemoBadge />}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3">
        {!weather ? (
          <p className="text-xs text-muted-foreground">
            No weather observation within 50 km of this locality. Showing fallback summary.
          </p>
        ) : (
          <>
            {/* Big rainfall number */}
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-200/50 dark:border-cyan-900/50 p-3 flex items-end gap-2">
              <Droplets className="h-7 w-7 text-cyan-600 dark:text-cyan-400 self-center" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rainfall 24h</div>
                <div className="text-2xl font-bold tabular-nums leading-none">
                  {weather.rainfall24hMm.toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">mm</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="flex items-center gap-2">
                <Droplets className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Last 1h</div>
                  <div className="font-semibold tabular-nums">{weather.rainfall1hMm.toFixed(1)} mm</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Temperature</div>
                  <div className="font-semibold tabular-nums">{weather.temperatureC.toFixed(1)}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Humidity</div>
                  <div className="font-semibold tabular-nums">{Math.round(weather.humidityPct)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Wind</div>
                  <div className="font-semibold tabular-nums">{Math.round(weather.windKph)} km/h</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(weather.observedAt)}
              </span>
              <span>{weather.stationName ?? 'Nearest station'}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

// ── Safe places card with horizontal scroll ─────────────────────────────
function SafePlacesCard({
  facilities,
  setView,
}: {
  facilities: FacilityItem[]
  setView: (v: ViewId) => void
}) {
  return (
    <Card className="overflow-hidden p-0 gap-0">
      {/* Header with rescue image */}
      <div className="relative h-28 w-full overflow-hidden">
        <Image
          src={SITE_IMAGES.rescue}
          alt="Rescue shelter illustration"
          fill
          sizes="(max-width: 768px) 100vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent" aria-hidden />
        <div className="absolute inset-0 p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Nearby safe places
              </h3>
              <p className="text-[11px] text-white/80">
                {facilities.length === 0
                  ? 'None within 30 km'
                  : `${facilities.length} within 30 km of your location`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setView('safe-places')}
          >
            View all on map <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {facilities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No shelters, hospitals, or relief centres within 30 km of this location.
          </p>
        ) : (
          <ScrollArea className="w-full pb-2">
            <div className="flex gap-3 pb-2">
              {facilities.map((f) => {
                const occPct =
                  f.capacity != null && f.capacity > 0
                    ? Math.min(
                        100,
                        Math.round(
                          ((f.capacity - (f.availableUnits ?? 0)) / f.capacity) * 100
                        )
                      )
                    : null
                const FacIcon = facilityIcon(f.facilityType)
                return (
                  <div
                    key={f.id}
                    className="min-w-[210px] max-w-[240px] rounded-lg border bg-card p-3 flex flex-col gap-2 shrink-0"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <FacIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight truncate" title={f.name}>
                          {f.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {f.facilityType.replace(/_/g, ' ').toLowerCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {f.facilityType.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                      <StatusBadge status={f.status} className="text-[10px]" />
                    </div>
                    {occPct != null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Occupancy</span>
                          <span className="font-medium tabular-nums">
                            {f.availableUnits ?? 0}/{f.capacity} free
                          </span>
                        </div>
                        <Progress value={occPct} className="h-1.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {f.distanceKm} km
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  )
}

function facilityIcon(type: string): React.ComponentType<{ className?: string }> {
  switch (type) {
    case 'HOSPITAL':
    case 'PHC':
    case 'CHC':
      return Stethoscope
    case 'RELIEF_CAMP':
    case 'SHELTER':
      return House
    case 'FIRE_STATION':
      return HeartPulse
    case 'POLICE_STATION':
      return ShieldCheck
    default:
      return Building2
  }
}

// ── News card ───────────────────────────────────────────────────────────
function NewsCard({ news, setView }: { news: NewsItemData[]; setView: (v: ViewId) => void }) {
  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white shrink-0">
            <Newspaper className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Latest news &amp; updates</h3>
            <p className="text-[11px] text-muted-foreground">Curated disaster &amp; weather headlines</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('news')}>
          View all <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {news.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No published news for this region yet.
        </p>
      ) : (
        <ScrollArea className="max-h-96">
          <ul className="divide-y divide-border">
            {news.map((n) => (
              <li key={n.id} className="py-3 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {n.pinned && (
                        <Badge variant="outline" className="text-[9px] uppercase border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                          Pinned
                        </Badge>
                      )}
                      {n.demoLabel && <DemoBadge className="text-[9px] px-1.5 py-0" />}
                      <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.publishedAt)}</span>
                    </div>
                    <a
                      href={n.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold leading-snug hover:underline inline-flex items-start gap-1"
                    >
                      <span className="flex-1">{n.title}</span>
                      <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    </a>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {n.summary}
                    </p>
                    <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                      {n.publisher}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  )
}

// ── Preparedness tip card ────────────────────────────────────────────────
function PreparednessTipCard({
  tip,
  setView,
}: {
  tip: PreparednessTipData | null
  setView: (v: ViewId) => void
}) {
  return (
    <Card className="overflow-hidden p-0 gap-0">
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        {/* Thumbnail */}
        <div className="relative h-32 sm:h-auto sm:min-h-[160px] w-full overflow-hidden bg-muted">
          <Image
            src={SITE_IMAGES.emergencyKit}
            alt="Emergency preparedness kit"
            fill
            sizes="(max-width: 640px) 100vw, 200px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent sm:bg-gradient-to-r" aria-hidden />
        </div>
        {/* Body */}
        <div className="p-4 md:p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Preparedness tip of the day</h3>
          </div>
          {!tip ? (
            <p className="text-xs text-muted-foreground py-2">No preparedness guide available.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {tip.hazardType && <HazardBadge type={tip.hazardType} className="text-[10px]" />}
                <h4 className="text-base font-semibold">{tip.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {tip.excerpt}
                {tip.excerpt.length >= 160 ? '…' : ''}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5 w-fit" onClick={() => setView('preparedness')}>
                Read guide <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── District snapshot card ──────────────────────────────────────────────
function DistrictSnapshotCard({
  alertCount,
  criticalAlertCount,
  riskSummary,
  weather,
  setView,
}: {
  alertCount: number
  criticalAlertCount: number
  riskSummary: RiskSummaryItem[]
  weather: WeatherData | null
  setView: (v: ViewId) => void
}) {
  const highRisks = riskSummary.filter(
    (r) => r.level === 'HIGH' || r.level === 'VERY_HIGH'
  ).length
  const staleSources = riskSummary.filter((r) => r.sourceFreshnessMinutes > 30).length
  const avgCoverage = riskSummary.length
    ? Math.round(
        riskSummary.reduce((s, r) => s + r.dataCoveragePct, 0) / riskSummary.length
      )
    : 0
  const healthLabel =
    staleSources >= 3
      ? { label: 'Degraded', tone: 'text-amber-600 dark:text-amber-400' }
      : staleSources >= 1
      ? { label: 'Mostly healthy', tone: 'text-emerald-600 dark:text-emerald-400' }
      : { label: 'Healthy', tone: 'text-emerald-600 dark:text-emerald-400' }

  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">District status snapshot</h3>
        </div>
        <Badge variant="outline" className={cn('text-[10px] font-semibold', healthLabel.tone)}>
          {healthLabel.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active alerts</div>
          <div className="text-2xl font-bold tabular-nums">{alertCount}</div>
          <div className="text-[10px] text-muted-foreground">within 80 km</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Critical alerts</div>
          <div className="text-2xl font-bold tabular-nums">{criticalAlertCount}</div>
          <div className="text-[10px] text-muted-foreground">warning / emergency</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">High-risk hazards</div>
          <div className="text-2xl font-bold tabular-nums">{highRisks}</div>
          <div className="text-[10px] text-muted-foreground">HIGH or higher</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-muted-foreground">Avg data coverage</span>
          <span className="font-semibold tabular-nums">{avgCoverage}%</span>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-muted-foreground">Stale sources</span>
          <span className="font-semibold tabular-nums">{staleSources}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        All hazard predictions and weather data are <strong>simulation-mode</strong> for the
        demo build. In production, these would be sourced from IMD, GSI, CWC and verified
        district feeds. Source health reflects {riskSummary.length} hazard models near this locality.
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setView('alerts')}>
          <AlertTriangle className="h-3.5 w-3.5" /> View alerts
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setView('risk')}>
          <Activity className="h-3.5 w-3.5" /> Risk forecast
        </Button>
      </div>
    </Card>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero skeleton */}
      <Card className="relative overflow-hidden border-0 p-0 h-44">
        <Skeleton className="absolute inset-0 h-full w-full" />
        <div className="relative p-6 space-y-3">
          <Skeleton className="h-7 w-56 bg-white/15" />
          <Skeleton className="h-3 w-72 bg-white/15" />
          <Skeleton className="h-px w-full bg-white/10" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full bg-white/15" />
            ))}
          </div>
        </div>
      </Card>

      {/* Map skeleton */}
      <Card className="overflow-hidden p-0 gap-0">
        <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </Card>

      {/* Risk grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden p-0 gap-0">
            <Skeleton className="h-20 w-full" />
            <div className="p-3 space-y-2.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="overflow-hidden p-0 gap-0">
          <Skeleton className="h-24 w-full" />
          <div className="p-4 md:p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden p-0 gap-0">
          <Skeleton className="h-24 w-full" />
          <div className="p-4 md:p-6 space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Safe places skeleton */}
      <Card className="overflow-hidden p-0 gap-0">
        <Skeleton className="h-28 w-full" />
        <div className="p-4 md:p-6">
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-56 rounded-lg shrink-0" />
            ))}
          </div>
        </div>
      </Card>

      {/* News skeleton */}
      <Card className="p-4 md:p-6 gap-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </Card>
    </div>
  )
}

// ── Error state ─────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-6 gap-3 border-destructive/40">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-semibold">Could not load home data</h3>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="gap-1.5 w-fit" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </Button>
    </Card>
  )
}
