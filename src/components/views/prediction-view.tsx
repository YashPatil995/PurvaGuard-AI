'use client'

import * as React from 'react'
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  HazardBadge, ModelRiskBadge, SimulationBadge, HazardIcon, DemoBadge,
} from '@/components/shared/badges'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import {
  formatRelativeTime, HAZARD_META,
  type HazardType, type ModelRiskLevel,
} from '@/lib/constants'
import {
  BrainCircuit, RefreshCw, AlertTriangle, Gauge, Database, Sparkles,
  Activity, ShieldAlert, TrendingUp, Info, Cpu, Layers, Workflow, ArrowRight,
  CircleDot, Radio, ListChecks, ChevronRight, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopFeature {
  feature: string
  contribution: number
  value: string
}

interface PredictionRow {
  id: string | null
  hazardType: HazardType
  riskLevel: ModelRiskLevel
  riskScore: number
  confidence: number
  dataCoveragePct: number
  horizonMinutes: number
  topFeatures: TopFeature[]
  modelVersion: string
  generatedAt: string | null
  expiresAt: string | null
  simulationMode: boolean
  regionName: string | null
  note?: string
}

interface ModelInfo {
  version: string
  type: string
  trainingData: string
  supportedHazards: string[]
  supportedRegions: string
  lastEvaluated: string
  metrics: {
    precision: number
    recall: number
    falseAlarmRate: number
    leadTimeMinutes: number
    calibration: number
  }
  limitations: string
}

interface PipelineStep {
  step: number
  name: string
  desc: string
  status: 'active' | 'skipped'
}

interface InputFeature {
  feature: string
  value: string
  source: string
  freshness: string
}

interface FeatureImportance {
  feature: string
  avgContribution: number
  description: string
}

interface AccuracyPoint {
  month: string
  accuracy: number
  falseAlarms: number
}

interface PredictionResponse {
  generatedAt: string
  simulationMode: boolean
  currentLocation: { name: string; lat: number; lng: number }
  predictions: PredictionRow[]
  modelInfo: ModelInfo
  pipeline: PipelineStep[]
  inputFeatures: InputFeature[]
  featureImportance: FeatureImportance[]
  historicalAccuracy: AccuracyPoint[]
  disasterBehaviorAnalysis: string
  note: string
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

// ── Component ───────────────────────────────────────────────────────────
export default function PredictionView() {
  const { location, setView, language } = useApp()
  const [data, setData] = React.useState<PredictionResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Live "behavior monitor" animation tick (text feed rotation)
  const [monitorIdx, setMonitorIdx] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setMonitorIdx((i) => (i + 1) % 4), 2600)
    return () => clearInterval(t)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<PredictionResponse>(
      `/api/prediction?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}`
    )
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e: any) => { if (!cancelled) setError(String(e?.message ?? e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [location.lat, location.lng, refreshKey])

  if (loading) return <PredictionSkeleton />

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Unable to load prediction data</span>
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

  const generatedLabel = formatRelativeTime(data.generatedAt)
  const topRisk = [...data.predictions].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null
  const overallCoverage = Math.round(
    data.predictions.reduce((s, p) => s + (p.dataCoveragePct || 0), 0) /
      Math.max(1, data.predictions.length),
  )

  const behaviorFeed = [
    { icon: TrendingUp, label: 'Teesta basin rainfall', status: 'rising', tone: 'amber' },
    { icon: Layers, label: 'Slope stability indicators', status: 'stable', tone: 'emerald' },
    { icon: AlertTriangle, label: 'Incident report clusters', status: '2 new near Mangan', tone: 'red' },
    { icon: Activity, label: 'River gauge trend', status: 'above normal', tone: 'red' },
  ] as const

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <BrainCircuit className="h-3.5 w-3.5 text-primary" />
              <span className="uppercase tracking-wide font-semibold">AI Prediction Engine</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              AI Disaster Prediction Engine
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              This is how PurvaGuard AI predicts landslide, flash flood, and heavy rain risk —
              transparently, with full explainability.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-[11px] font-mono">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                {data.modelInfo.version}
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
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Monitoring</span>
            <span className="font-semibold">
              {data.currentLocation.name} · {data.currentLocation.lat.toFixed(3)}, {data.currentLocation.lng.toFixed(3)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Coverage</span>
            <span className="font-semibold">{overallCoverage}%</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Top risk</span>
            {topRisk && topRisk.id ? (
              <span className="font-semibold" style={{ color: riskColor(topRisk.riskLevel) }}>
                {topRisk.hazardType.replace(/_/g, ' ')} · {Math.round(topRisk.riskScore)}/100
              </span>
            ) : <span className="text-muted-foreground">—</span>}
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>DEMO model output — not an official warning.</span>
          </div>
        </div>
      </div>

      {/* ─── Current predictions (top) ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Current predictions — {location.name}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Horizon: {horizonLabel(topRisk?.horizonMinutes ?? 360)}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.predictions.map((p) => (
            <RiskPredictionCard key={p.hazardType} risk={p} />
          ))}
        </div>
      </section>

      {/* ─── Pipeline: "How does the AI predict?" ─── */}
      <section id="model-explanation" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              How does the AI predict?
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              A 10-step pipeline runs every prediction cycle (PRD §6.3).
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <CircleDot className="h-3 w-3 text-emerald-500" />
            All 10 steps active
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Horizontal flow */}
            <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-3">
              {data.pipeline.map((step, i) => (
                <React.Fragment key={step.step}>
                  <div className="flex flex-col items-center min-w-[68px] gap-1.5 shrink-0">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold',
                        step.status === 'active'
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-muted bg-muted text-muted-foreground',
                      )}
                    >
                      {step.step}
                    </div>
                    <span className="text-[10px] text-center leading-tight font-medium">
                      {step.name}
                    </span>
                  </div>
                  {i < data.pipeline.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 self-start mt-2.5 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Detailed cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.pipeline.map((step) => (
                <div
                  key={step.step}
                  className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {step.step}
                      </span>
                      <span className="text-sm font-semibold">{step.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] uppercase tracking-wide',
                        step.status === 'active'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                          : 'border-slate-300 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                      )}
                    >
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Input features ─── */}
        <section id="input-features" className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              What data does the AI use?
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live input features feeding the model for {data.currentLocation.name}.
            </p>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live input features</CardTitle>
                <DemoBadge />
              </div>
              <CardDescription>Source + freshness per feature.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-[11px]">Feature</TableHead>
                      <TableHead className="h-8 text-[11px]">Value</TableHead>
                      <TableHead className="h-8 text-[11px]">Source</TableHead>
                      <TableHead className="h-8 text-[11px] text-right">Fresh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inputFeatures.map((f) => (
                      <TableRow key={f.feature}>
                        <TableCell className="py-2 text-xs font-medium">{f.feature}</TableCell>
                        <TableCell className="py-2 text-xs">{f.value}</TableCell>
                        <TableCell className="py-2 text-[11px] text-muted-foreground">{f.source}</TableCell>
                        <TableCell className="py-2 text-[11px] text-right tabular-nums text-muted-foreground">{f.freshness}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Sources are illustrative (IMD / GSI / Bhuvan / OSM / NGRI) for the demo. Real connectors land post-hackathon.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ─── Feature importance ─── */}
        <section id="feature-importance" className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              What drives the prediction?
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Average contribution of each feature to the live risk score.
            </p>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Feature importance (avg %)</CardTitle>
              <CardDescription>Aggregated across all hazards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.featureImportance}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 35]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} unit="%" />
                    <YAxis type="category" dataKey="feature" width={140} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v: any) => [`${v}%`, 'Avg contribution']}
                    />
                    <Bar dataKey="avgContribution" radius={[0, 4, 4, 0]} barSize={14}>
                      {data.featureImportance.map((entry, idx) => (
                        <Cell key={idx} fill={riskColor(entry.avgContribution > 20 ? 'HIGH' : entry.avgContribution > 12 ? 'MODERATE' : 'LOW')} />
                      ))}
                      <Label position="insideRight" fill="var(--card-foreground)" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-7 text-[11px]">Feature</TableHead>
                    <TableHead className="h-7 text-[11px] text-right">%</TableHead>
                    <TableHead className="h-7 text-[11px]">Why it matters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.featureImportance.map((f) => (
                    <TableRow key={f.feature}>
                      <TableCell className="py-1.5 text-xs font-medium">{f.feature}</TableCell>
                      <TableCell className="py-1.5 text-xs text-right tabular-nums">{f.avgContribution}%</TableCell>
                      <TableCell className="py-1.5 text-[11px] text-muted-foreground leading-snug">{f.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ─── Why is this area flagged? ─── */}
      <section id="why-flagged" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Why is this area flagged?
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plain-language explanation of the dominant contributing factors.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Disaster behavior analysis</CardTitle>
              {topRisk && topRisk.id && <ModelRiskBadge level={topRisk.riskLevel} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground/90">
              {data.disasterBehaviorAnalysis}
            </p>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                Top 3 contributing factors
              </p>
              <div className="flex flex-wrap gap-2">
                {topRisk && topRisk.topFeatures.length > 0 ? (
                  topRisk.topFeatures.slice(0, 3).map((f, i) => (
                    <div
                      key={f.feature + i}
                      className="inline-flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-semibold">{f.feature}</span>
                        <span className="text-muted-foreground"> · {f.value}</span>
                        <span className="text-muted-foreground"> · {f.contribution}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No contributing features available (insufficient model output).</p>
                )}
              </div>
            </div>

            {topRisk && topRisk.riskScore >= 55 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Plain language:</span>{' '}
                Your area is flagged <span className="font-bold">{topRisk.riskLevel.replace(/_/g, ' ')}</span> for{' '}
                <span className="font-bold">{topRisk.hazardType.replace(/_/g, ' ').toLowerCase()}</span> because
                {' '}
                {topRisk.topFeatures.slice(0, 3).map((f, i) => (
                  <React.Fragment key={f.feature + i}>
                    {i > 0 && i === topRisk.topFeatures.slice(0, 3).length - 1 ? ', and ' : i > 0 ? ', ' : ''}
                    <span className="font-medium">{f.feature.toLowerCase()}</span> is <span className="font-medium">{f.value}</span>
                  </React.Fragment>
                ))}
                .
              </div>
            )}

            <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Disclaimer:</span> No generated prediction is presented as an official warning. Defer to authority bulletins for life-safety decisions.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Metrics, limitations & accuracy chart ─── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Model metrics &amp; limitations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            How well the baseline model performs — and where it falls short.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <MetricCard label="Precision" value={`${(data.modelInfo.metrics.precision * 100).toFixed(0)}%`} hint="Of predicted events, the share that actually occurred." />
          <MetricCard label="Recall" value={`${(data.modelInfo.metrics.recall * 100).toFixed(0)}%`} hint="Of actual events, the share the model predicted." />
          <MetricCard label="False-alarm rate" value={`${(data.modelInfo.metrics.falseAlarmRate * 100).toFixed(0)}%`} hint="Predictions that did not materialize." tone="amber" />
          <MetricCard label="Lead time" value={`${(data.modelInfo.metrics.leadTimeMinutes / 60).toFixed(1)}h`} hint="Average pre-event warning window." />
          <MetricCard label="Calibration" value={data.modelInfo.metrics.calibration.toFixed(2)} hint="1.0 = perfectly calibrated probabilities." />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Monthly accuracy (last 12 months)
                  </CardTitle>
                  <CardDescription>Deterministic DEMO series.</CardDescription>
                </div>
                <DemoBadge />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.historicalAccuracy} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0.5, 1]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v: any, n: any) => [`${(Number(v) * 100).toFixed(0)}%`, n === 'accuracy' ? 'Accuracy' : 'False alarms']}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 3 }} name="accuracy" />
                    <Line type="monotone" dataKey="falseAlarms" stroke="var(--chart-2)" strokeWidth={1.8} strokeDasharray="5 3" dot={{ r: 2 }} name="falseAlarms" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Monsoon months (Jun-Sep) show higher recall but more false alarms — expected for active hazard periods.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] leading-relaxed text-foreground/90">{data.modelInfo.limitations}</p>
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                No generated prediction is presented as an official warning.
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Trained on</div>
                  <div className="font-medium">{data.modelInfo.trainingData}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Last evaluated</div>
                  <div className="font-medium">{data.modelInfo.lastEvaluated}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Model type</div>
                  <div className="font-medium">{data.modelInfo.type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Regions</div>
                  <div className="font-medium">{data.modelInfo.supportedRegions}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── AI Disaster Behavior Monitor ─── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary animate-soft-pulse" />
            AI Disaster Behavior Monitor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            What the engine is actively tracking right now.
          </p>
        </div>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Analyzing live signals…</span>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" style={{ animationDelay: '600ms' }} />
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {behaviorFeed.map((b, i) => {
                    const Icon = b.icon
                    const isActive = monitorIdx === i
                    const toneCls = b.tone === 'red'
                      ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                      : b.tone === 'amber'
                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                    return (
                      <div
                        key={b.label}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs transition-all',
                          toneCls,
                          isActive ? 'ring-2 ring-primary/30 scale-[1.01]' : 'opacity-80',
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive && 'animate-soft-pulse')} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{b.label}</div>
                          <div className="text-[10px] opacity-80 truncate">{b.status}</div>
                        </div>
                        {isActive && (
                          <span className="text-[9px] uppercase font-bold tracking-wide animate-soft-pulse">● live</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Behavior feed refreshes every few seconds. Source signals are DEMO-simulated.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Footer / quick links ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Prediction for <span className="font-semibold text-foreground">{data.currentLocation.name}</span>
            {' · '}model <span className="font-mono">{data.modelInfo.version}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setView('risk')}>
            <ChevronRight className="h-3 w-3" /> Risk & Forecast
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setView('alerts')}>
            <ChevronRight className="h-3 w-3" /> Active alerts
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Language: {language.toUpperCase()} · DEMO build · No output is an official warning.
      </p>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────

function RiskPredictionCard({ risk }: { risk: PredictionRow }) {
  const meta = HAZARD_META[risk.hazardType] ?? HAZARD_META.GENERAL
  const score = Math.round(risk.riskScore)
  const data = [{ name: risk.hazardType, value: score, fill: riskColor(risk.riskLevel) }]
  const noData = !risk.id

  const handleWhy = () => {
    const el = document.getElementById('why-flagged')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Card className={cn('relative overflow-hidden', noData && 'opacity-70')}>
      {/* Hazard image background with overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url('${meta.image}')` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />

      <CardContent className="relative pt-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HazardIcon type={risk.hazardType} className="h-4 w-4" />
            </div>
            <div>
              <HazardBadge type={risk.hazardType} />
              <div className="text-[10px] text-muted-foreground mt-1">
                {risk.regionName ?? 'No nearby region'}
              </div>
            </div>
          </div>
          {!noData && <ModelRiskBadge level={risk.riskLevel} />}
        </div>

        {/* Risk gauge */}
        <div className="relative h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={data}
              startAngle={220}
              endAngle={-40}
              innerRadius="70%"
              outerRadius="100%"
              barSize={12}
            >
              <PolarBackground />
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--muted)' }}>
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <g>
                          <text
                            x={(viewBox as any).cx}
                            y={(viewBox as any).cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize: 28, fontWeight: 700, fill: riskColor(risk.riskLevel) }}
                          >
                            {score}
                          </text>
                          <text
                            x={(viewBox as any).cx}
                            y={(viewBox as any).cy + 22}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                          >
                            / 100
                          </text>
                        </g>
                      )
                    }
                    return null
                  }}
                />
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Conf." value={noData ? '—' : `${Math.round(risk.confidence * 100)}%`} />
          <Stat label="Coverage" value={noData ? '—' : `${Math.round(risk.dataCoveragePct)}%`} />
          <Stat label="Horizon" value={horizonLabel(risk.horizonMinutes)} />
        </div>

        {/* Top features mini list */}
        {!noData && risk.topFeatures.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Top drivers
            </div>
            <div className="space-y-1">
              {risk.topFeatures.slice(0, 3).map((f, i) => {
                const pct = Math.max(4, Math.round((f.contribution / 100) * 100))
                return (
                  <div key={f.feature + i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{f.feature}</span>
                      <span className="text-muted-foreground tabular-nums">{f.contribution}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: riskColor(risk.riskLevel) }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {noData && (
          <p className="text-[11px] text-muted-foreground italic">{risk.note}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            {risk.generatedAt ? formatRelativeTime(risk.generatedAt) : '—'} · v{risk.modelVersion.slice(-2)}
          </span>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleWhy} disabled={noData}>
            <Sparkles className="h-3 w-3" /> WHY?
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Recharts doesn't export PolarBackground; we use a transparent component to fill the slot.
function PolarBackground() {
  return null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/60 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  )
}

function MetricCard({
  label, value, hint, tone = 'default',
}: { label: string; value: string; hint: string; tone?: 'default' | 'amber' }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-1">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</div>
        <div
          className={cn(
            'text-2xl font-bold tabular-nums',
            tone === 'amber' && 'text-amber-600 dark:text-amber-400',
          )}
        >
          {value}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
      </CardContent>
    </Card>
  )
}

function PredictionSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[340px] w-full rounded-xl" />
        <Skeleton className="h-[340px] w-full rounded-xl" />
        <Skeleton className="h-[340px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
