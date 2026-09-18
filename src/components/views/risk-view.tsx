'use client'

import * as React from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  HazardBadge, ModelRiskBadge, SimulationBadge, HazardIcon,
} from '@/components/shared/badges'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatRelativeTime, HAZARD_META, type HazardType, type ModelRiskLevel } from '@/lib/constants'
import {
  Activity, RefreshCw, AlertTriangle, Clock, Gauge, Database, Sparkles,
  TrendingUp, Info, ShieldAlert,
} from 'lucide-react'

interface TopFeature {
  feature: string
  contribution: number
  value: string
}

interface CurrentRisk {
  id?: string
  hazardType: HazardType
  riskLevel: ModelRiskLevel | 'LOW'
  riskScore: number
  confidence: number
  dataCoveragePct: number
  horizonMinutes: number
  topFeatures: TopFeature[]
  modelVersion: string
  generatedAt?: string | null
  expiresAt?: string | null
  simulationMode: boolean
  regionName?: string | null
  note?: string
}

interface TimeseriesPoint {
  hour: string
  rainfallMm: number
  riskScore: number
}

interface RankingRow {
  regionName: string
  maxScore: number
  hazardType: string
  riskLevel: string
}

interface BaselinePoint {
  month: string
  avgRiskScore: number
  isMonsoon?: boolean
}

interface ModelExplanation {
  hazardType: string | null
  riskLevel: string
  riskScore: number
  regionName: string | null
  topFeatures: TopFeature[]
  dataCoveragePct: number
  modelVersion: string
  dataFreshnessMinutes: number | null
  limitations: string
}

interface RiskResponse {
  simulationMode: boolean
  modelVersion: string
  generatedAt: string
  location: { lat: number; lng: number; regionId: string | null }
  current: CurrentRisk[]
  timeseries: TimeseriesPoint[]
  districtRanking: RankingRow[]
  modelExplanation: ModelExplanation
  baseline: BaselinePoint[]
  dataCoveragePct: number
  note?: string
}

function riskColor(level: string): string {
  switch (level) {
    case 'VERY_HIGH': return 'var(--chart-2)'
    case 'HIGH': return 'var(--chart-1)'
    case 'MODERATE': return 'var(--chart-5)'
    case 'LOW':
    default: return 'var(--chart-4)'
  }
}

function horizonLabel(mins: number): string {
  if (mins < 60) return `next ${mins}m`
  const h = Math.round(mins / 60)
  return `next ${h}h`
}

export default function RiskView() {
  const { location } = useApp()
  const [data, setData] = React.useState<RiskResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<RiskResponse>(`/api/risk?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e: any) => { if (!cancelled) setError(String(e?.message ?? e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [location.lat, location.lng, refreshKey])

  if (loading) return <RiskSkeleton />

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Unable to load risk forecast</span>
            </div>
            <p className="text-sm text-muted-foreground">{error ?? 'No data returned.'}</p>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topCurrent = [...data.current].sort((a, b) => b.riskScore - a.riskScore)[0]
  const generatedLabel = data.generatedAt ? formatRelativeTime(data.generatedAt) : '—'
  const overallCoverage = Math.round(data.dataCoveragePct ?? 0)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide font-semibold">Risk & Forecast</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Risk & Forecast — <span className="text-primary">{location.name}</span>
            </h1>
            {location.localName && (
              <p className="text-sm text-muted-foreground">
                {location.localName} · {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-[11px] font-mono">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                Model: {data.modelVersion}
              </Badge>
              <SimulationBadge />
            </div>
            <div className="text-[11px] text-muted-foreground">Last updated: {generatedLabel}</div>
            <Button size="sm" variant="ghost" onClick={() => setRefreshKey((k) => k + 1)} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Data coverage</span>
            <span className="font-semibold">{overallCoverage}%</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Top risk</span>
            {topCurrent ? (
              <span className="font-semibold" style={{ color: riskColor(topCurrent.riskLevel) }}>
                {topCurrent.hazardType.replace(/_/g, ' ')} · {Math.round(topCurrent.riskScore)}/100
              </span>
            ) : <span className="text-muted-foreground">—</span>}
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>DEMO synthetic output — not an official forecast.</span>
          </div>
        </div>
      </div>

      {/* Risk overview cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.current.map((c) => (
          <RiskOverviewCard key={c.hazardType} risk={c} />
        ))}
      </div>

      {/* Rainfall timeseries chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Rainfall &amp; Risk Forecast — Next 24h
              </CardTitle>
              <CardDescription className="mt-1">
                Hourly rainfall (mm, left axis) and model risk score (0–100, right axis).
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <SimulationBadge className="text-[10px]" />
              <span className="text-[11px] text-muted-foreground">DEMO synthetic</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={36} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="rainfallMm"
                  name="Rainfall (mm)"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  fill="url(#rainGradient)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="riskScore"
                  name="Risk score"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#riskGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Source: PurvaGuard baseline model · synthetic hourly series anchored to {location.name} · generated {generatedLabel}.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* District ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              District ranking — by current max risk score
            </CardTitle>
            <CardDescription>
              Sorted descending. Not a "safest district" claim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.districtRanking.length === 0 && (
              <p className="text-sm text-muted-foreground">No district-level predictions available.</p>
            )}
            {data.districtRanking.map((r, idx) => {
              const max = data.districtRanking[0]?.maxScore || 100
              const pct = Math.max(2, Math.round((r.maxScore / Math.max(1, max)) * 100))
              return (
                <div key={`${r.regionName}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[11px] font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate">{r.regionName}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{r.hazardType.replace(/_/g, ' ')}</Badge>
                    </div>
                    <span className="font-semibold tabular-nums shrink-0">{Math.round(r.maxScore)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: riskColor(r.riskLevel),
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                District ranking reflects current model output, not a "safest district" claim. See uncertainty and limitations below.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Model explanation */}
        <ModelExplanationCard explanation={data.modelExplanation} generatedLabel={generatedLabel} />
      </div>

      {/* Historical baseline */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Historical baseline (reference)
              </CardTitle>
              <CardDescription>
                Monthly average risk score by region. Monsoon months (Jun–Sep) shaded.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">Reference</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.baseline} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgRiskScore"
                  name="Avg risk score"
                  stroke="var(--chart-5)"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        key={`dot-${payload.month}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={payload?.isMonsoon ? 'var(--chart-2)' : 'var(--chart-5)'}
                        stroke="var(--card)"
                        strokeWidth={1}
                      />
                    )
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Deterministic historical reference series. DEMO data labeled as reference — not a climatology product.
          </p>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground pb-2">
        {data.note ?? 'All output is simulation-labeled for the PurvaGuard AI demo build.'}
      </p>
    </div>
  )
}

function RiskOverviewCard({ risk }: { risk: CurrentRisk }) {
  const meta = HAZARD_META[risk.hazardType] ?? HAZARD_META.GENERAL
  const hasData = !!risk.id
  const confidencePct = Math.round((risk.confidence ?? 0) * 100)
  const coveragePct = Math.round(risk.dataCoveragePct ?? 0)
  const score = Math.round(risk.riskScore ?? 0)
  const progressColor = riskColor(risk.riskLevel)

  return (
    <Card className={hasData ? '' : 'border-dashed border-amber-300'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <HazardIcon type={risk.hazardType} className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="text-xs">
                {risk.regionName ?? 'No nearby region data'}
                {' · '}
                {horizonLabel(risk.horizonMinutes)}
              </CardDescription>
            </div>
          </div>
          {hasData ? (
            <ModelRiskBadge level={risk.riskLevel as ModelRiskLevel} />
          ) : (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
              No reliable estimate
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Risk score</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums" style={{ color: progressColor }}>{score}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Confidence</div>
                <div className="text-lg font-semibold tabular-nums">{confidencePct}%</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Risk</span>
                  <span className="font-medium">{score}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: progressColor }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{confidencePct}%</span>
                </div>
                <Progress value={confidencePct} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Data coverage</span>
                  <span className="font-medium">{coveragePct}%</span>
                </div>
                <Progress value={coveragePct} className="h-2" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <Clock className="h-3 w-3" />
              <span>Generated {risk.generatedAt ? formatRelativeTime(risk.generatedAt) : '—'}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Expires {risk.expiresAt ? formatRelativeTime(risk.expiresAt) : '—'}</span>
              {risk.simulationMode && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <SimulationBadge className="text-[10px]" />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{risk.note ?? 'No reliable estimate — insufficient data.'}</span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Risk score</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: '2%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Data coverage</span>
                  <span className="font-medium">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              No nearby prediction within ~80 km. Move the location selector to a pilot locality to view live risk.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ModelExplanationCard({
  explanation,
  generatedLabel,
}: {
  explanation: ModelExplanation
  generatedLabel: string
}) {
  const lowConfidence =
    !explanation.hazardType ||
    explanation.dataCoveragePct < 30 ||
    explanation.topFeatures.length === 0

  const totalContribution = explanation.topFeatures.reduce((sum, f) => sum + f.contribution, 0) || 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Why is this area flagged?
            </CardTitle>
            <CardDescription>
              {explanation.hazardType
                ? `Top contributing features for ${explanation.hazardType.replace(/_/g, ' ')} risk in ${explanation.regionName ?? 'this region'}.`
                : 'No model output available for this area.'}
            </CardDescription>
          </div>
          {explanation.hazardType && (
            <ModelRiskBadge level={explanation.riskLevel as ModelRiskLevel} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowConfidence ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              No reliable estimate available. Confidence or data coverage is too low to display
              feature attributions. Defer to official authority bulletins.
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {explanation.topFeatures.map((f, i) => {
              const pct = Math.max(4, Math.round((f.contribution / totalContribution) * 100))
              return (
                <div key={`${f.feature}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{f.feature}</span>
                      <span className="text-muted-foreground text-[11px]">= {f.value}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{f.contribution}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: 'var(--chart-5)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1.5">
          <p><span className="font-semibold text-foreground">Limitations:</span> {explanation.limitations}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Metric label="Data coverage" value={lowConfidence ? '—' : `${Math.round(explanation.dataCoveragePct)}%`} />
          <Metric
            label="Data freshness"
            value={explanation.dataFreshnessMinutes !== null ? `${explanation.dataFreshnessMinutes} min ago` : '—'}
          />
          <Metric label="Model version" value={explanation.modelVersion} mono />
          <Metric label="Generated" value={generatedLabel} />
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className={`text-sm font-semibold truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  )
}

function RiskSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <Skeleton className="h-[320px] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  )
}
