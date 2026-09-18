'use client'

import * as React from 'react'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatRelativeTime, type ModelRiskLevel, type HazardType } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ModelRiskBadge,
  HazardBadge,
  DemoBadge,
  SimulationBadge,
  StatusBadge,
  HazardIcon,
} from '@/components/shared/badges'
import {
  Siren, ShieldCheck, Megaphone, Newspaper, TrendingUp, TrendingDown, Minus,
  Clock, MapPin, ExternalLink, Droplets, Thermometer, Wind, Cloud, RefreshCw,
  AlertTriangle, CheckCircle2, ListChecks, ChevronRight, Wifi, WifiOff,
  Building2, Activity,
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

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2, VERY_HIGH: 3 }

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

// ── Main view ───────────────────────────────────────────────────────────
export default function HomeView() {
  const { location, setView, connectivity } = useApp()
  const [data, setData] = React.useState<HomePayload | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
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
  }, [location.lat, location.lng, location.name])

  React.useEffect(() => load(), [load])

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 md:space-y-6">
      {loading ? (
        <HomeSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data available.'} onRetry={load} />
      ) : (
        <HomeContent data={data} setView={setView} connectivity={connectivity} />
      )}
    </div>
  )
}

// ── Content ─────────────────────────────────────────────────────────────
function HomeContent({
  data,
  setView,
  connectivity,
}: {
  data: HomePayload
  setView: (v: any) => void
  connectivity: 'ONLINE' | 'WEAK' | 'OFFLINE'
}) {
  const overall = computeOverallRisk(data.riskSummary)
  const checklist = generateChecklist(data.riskSummary, data.weather)

  return (
    <>
      {/* 1. Hero strip */}
      <HeroStrip
        name={data.locationMeta.name}
        lat={data.locationMeta.lat}
        lng={data.locationMeta.lng}
        lastUpdated={data.locationMeta.lastUpdated}
        connectivity={connectivity}
        overallRisk={overall}
        activeAlertCount={data.activeAlerts.length}
        setView={setView}
      />

      {/* 2. Risk summary grid */}
      <section aria-label="Risk summary">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Risk summary — next 6 hours
          </h2>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('risk')}>
            Full forecast <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.riskSummary.map((r) => (
            <RiskCard key={r.hazard} item={r} />
          ))}
        </div>
      </section>

      {/* 3. Two-column: checklist + weather */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <ChecklistCard items={checklist} />
        <WeatherCard weather={data.weather} />
      </section>

      {/* 4. Nearby safe places */}
      <SafePlacesCard facilities={data.nearbyFacilities} setView={setView} />

      {/* 5. Latest news */}
      <NewsCard news={data.news} setView={setView} />

      {/* 6 + 7. Preparedness tip + district snapshot */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <PreparednessTipCard tip={data.preparednessTip} setView={setView} />
        <DistrictSnapshotCard
          alertCount={data.activeAlerts.length}
          riskSummary={data.riskSummary}
          weather={data.weather}
          setView={setView}
        />
      </section>
    </>
  )
}

// ── Hero strip ──────────────────────────────────────────────────────────
function HeroStrip({
  name,
  lat,
  lng,
  lastUpdated,
  connectivity,
  overallRisk,
  activeAlertCount,
  setView,
}: {
  name: string
  lat: number
  lng: number
  lastUpdated: string
  connectivity: 'ONLINE' | 'WEAK' | 'OFFLINE'
  overallRisk: RiskLevel
  activeAlertCount: number
  setView: (v: any) => void
}) {
  const connMeta = {
    ONLINE: { Icon: Wifi, label: 'Online', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    WEAK: { Icon: Wifi, label: 'Weak signal', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
    OFFLINE: { Icon: WifiOff, label: 'Offline', cls: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  }[connectivity]

  return (
    <Card className="p-4 md:p-6 gap-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{name}</h1>
            <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium', connMeta.cls)}>
              <connMeta.Icon className="h-3 w-3" />
              {connMeta.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatRelativeTime(lastUpdated)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {lat.toFixed(3)}, {lng.toFixed(3)}
            </span>
            {activeAlertCount > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {activeAlertCount} active {activeAlertCount === 1 ? 'alert' : 'alerts'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Overall risk
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <ModelRiskBadge level={overallRisk as ModelRiskLevel} />
            <SimulationBadge />
          </div>
        </div>
      </div>

      <Separator />

      {/* Primary action buttons row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => setView('map')}
        >
          <MapPin className="h-3.5 w-3.5" />
          Check my area
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
          className="gap-1.5 w-full"
          onClick={() => setView('safe-places')}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Find a safe place
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => setView('reports')}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Report a hazard
        </Button>
      </div>
    </Card>
  )
}

// ── Risk card ───────────────────────────────────────────────────────────
function RiskCard({ item }: { item: RiskSummaryItem }) {
  const TrendIcon = TREND_ICON[item.trend]
  const hazard = item.hazard as HazardType
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <HazardIcon type={hazard} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">
              {HAZARD_LABELS[item.hazard] ?? item.hazard}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {item.modelVersion.replace('purvaguard-', '').replace('-v1', '')}
            </div>
          </div>
        </div>
        <TrendIcon className={cn('h-4 w-4 shrink-0', TREND_TONE[item.trend])} aria-label={`trend ${item.trend}`} />
      </div>

      <div className="flex items-center justify-between">
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
    </Card>
  )
}

const HAZARD_LABELS: Record<string, string> = {
  LANDSLIDE: 'Landslide',
  FLASH_FLOOD: 'Flash Flood',
  HEAVY_RAIN: 'Heavy Rain',
  ROAD_BLOCK: 'Road Block',
  EARTHQUAKE: 'Earthquake',
  GENERAL: 'General',
}

// ── Checklist card ──────────────────────────────────────────────────────
function ChecklistCard({ items }: { items: { text: string; tone: 'critical' | 'caution' | 'info' }[] }) {
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
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">What should I do now?</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Personalized actions based on current risk levels near you.
      </p>
      <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
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
    </Card>
  )
}

// ── Weather card ────────────────────────────────────────────────────────
function WeatherCard({ weather }: { weather: WeatherData | null }) {
  if (!weather) {
    return (
      <Card className="p-4 md:p-6 gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Local weather</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No weather observation within 50 km. Showing fallback summary.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Droplets className="h-4 w-4" /> Rainfall (24h): —
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Thermometer className="h-4 w-4" /> Temperature: —
          </div>
        </div>
      </Card>
    )
  }
  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Local weather</h3>
        </div>
        {weather.demoLabel && <DemoBadge />}
      </div>
      <div className="text-xs text-muted-foreground">
        {weather.stationName ? `${weather.stationName} · ` : ''}{weather.distanceKm} km away · updated {formatRelativeTime(weather.observedAt)}
      </div>

      <div className="rounded-lg bg-muted/60 p-3 flex items-end gap-2">
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
    </Card>
  )
}

// ── Safe places card ────────────────────────────────────────────────────
function SafePlacesCard({
  facilities,
  setView,
}: {
  facilities: FacilityItem[]
  setView: (v: any) => void
}) {
  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Nearby safe places</h3>
          <Badge variant="secondary" className="text-[10px]">{facilities.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('safe-places')}>
          View all on map <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {facilities.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No shelters, hospitals, or relief centres within 30 km of this location.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
          {facilities.map((f) => (
            <div
              key={f.id}
              className="min-w-[220px] max-w-[260px] rounded-lg border bg-card p-3 flex flex-col gap-2 shrink-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold leading-tight truncate" title={f.name}>
                    {f.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {f.facilityType.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                <StatusBadge status={f.status} className="text-[10px]" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {f.distanceKm} km
                </span>
                {f.capacity != null && (
                  <span className="font-medium tabular-nums">
                    {f.availableUnits ?? 0}/{f.capacity} free
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── News card ───────────────────────────────────────────────────────────
function NewsCard({ news, setView }: { news: NewsItemData[]; setView: (v: any) => void }) {
  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Latest news &amp; updates</h3>
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
        <ul className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin -mx-1">
          {news.map((n) => (
            <li key={n.id} className="py-3 px-1">
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
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {n.publisher}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
  setView: (v: any) => void
}) {
  return (
    <Card className="p-4 md:p-6 gap-3 md:col-span-2">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Preparedness tip of the day</h3>
      </div>
      {!tip ? (
        <p className="text-xs text-muted-foreground py-2">No preparedness guide available.</p>
      ) : (
        <div className="space-y-2">
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
        </div>
      )}
    </Card>
  )
}

// ── District snapshot card ──────────────────────────────────────────────
function DistrictSnapshotCard({
  alertCount,
  riskSummary,
  weather,
  setView,
}: {
  alertCount: number
  riskSummary: RiskSummaryItem[]
  weather: WeatherData | null
  setView: (v: any) => void
}) {
  const highRisks = riskSummary.filter((r) => r.level === 'HIGH' || r.level === 'VERY_HIGH').length
  const staleSources = riskSummary.filter((r) => r.sourceFreshnessMinutes > 30).length
  return (
    <Card className="p-4 md:p-6 gap-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">District status</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active alerts</div>
          <div className="text-2xl font-bold tabular-nums">{alertCount}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">High-risk hazards</div>
          <div className="text-2xl font-bold tabular-nums">{highRisks}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rainfall 24h</div>
          <div className="text-2xl font-bold tabular-nums">
            {weather ? weather.rainfall24hMm.toFixed(0) : '—'}
            <span className="text-xs font-normal text-muted-foreground ml-1">mm</span>
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stale sources</div>
          <div className="text-2xl font-bold tabular-nums">{staleSources}</div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        All hazard predictions and weather data are <strong>simulation-mode</strong> for the demo build. In production, these would be sourced from IMD, GSI, CWC and verified district feeds.
      </p>
      <Button variant="ghost" size="sm" className="gap-1 text-xs w-fit" onClick={() => setView('operations')}>
        Operations dashboard <ChevronRight className="h-3 w-3" />
      </Button>
    </Card>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="p-4 md:p-6 gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="p-4 md:p-6 gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </Card>
        <Card className="p-4 md:p-6 gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-6 gap-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-60 rounded-lg shrink-0" />
          ))}
        </div>
      </Card>

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
