'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  HazardBadge, SeverityBadge, ModelRiskBadge, VerificationBadge, SimulationBadge,
} from '@/components/shared/badges'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import {
  formatRelativeTime,
  type Severity, type ModelRiskLevel,
} from '@/lib/constants'
import {
  BellRing, RefreshCw, Search, ExternalLink, Share2, Printer, Bookmark,
  Volume2, MapPin, AlertTriangle, Clock, Radio, ChevronRight, Inbox,
  CheckCircle2, XCircle, Languages,
} from 'lucide-react'

type AlertRow = {
  id: string
  title: string
  body: string
  alertType: string
  severity: string
  modelRiskLevel: string | null
  confidence: number | null
  issuerType: string
  issuerName: string
  sourceUrl: string | null
  lat: number | null
  lng: number | null
  radiusKm: number
  issuedAt: string
  validFrom: string
  expiresAt: string
  status: string
  verificationStatus: string
  languages: string[]
  simulationMode: boolean
  authorName: string | null
  regions: Array<{ id: string; canonicalName: string; localName: string | null }>
}

interface AlertsResponse {
  items: AlertRow[]
  total: number
  limit: number
  offset: number
}

interface AlertDetail {
  id: string
  title: string
  body: string
  alertType: string
  severity: string
  modelRiskLevel: string | null
  confidence: number | null
  issuerType: string
  issuerName: string
  sourceUrl: string | null
  lat: number | null
  lng: number | null
  radiusKm: number
  issuedAt: string
  validFrom: string
  expiresAt: string
  status: string
  verificationStatus: string
  languages: string[]
  simulationMode: boolean
  version: number
  authorName: string | null
  regions: Array<{ id: string; canonicalName: string; localName: string | null; regionType: string | null }>
  deliveries: Array<{
    id: string
    channel: string
    provider: string | null
    status: string
    recipient: string
    queuedAt: string
    sentAt: string | null
    deliveredAt: string | null
    attempts: number
    simulationMode: boolean
  }>
  deliveryCount: number
}

const HAZARD_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All hazards' },
  { value: 'LANDSLIDE', label: 'Landslide' },
  { value: 'FLASH_FLOOD', label: 'Flash Flood' },
  { value: 'HEAVY_RAIN', label: 'Heavy Rain' },
  { value: 'EARTHQUAKE', label: 'Earthquake' },
  { value: 'ROAD_BLOCK', label: 'Road Block' },
  { value: 'GENERAL', label: 'General' },
]

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All severities' },
  { value: 'INFORMATIONAL', label: 'Informational' },
  { value: 'ADVISORY', label: 'Advisory' },
  { value: 'WATCH', label: 'Watch' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'EMERGENCY', label: 'Emergency' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
]

const PAGE_SIZE = 20

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AlertsView() {
  const { setView, selectedAlertId, setSelectedAlertId } = useApp()

  const [hazard, setHazard] = React.useState('ALL')
  const [severity, setSeverity] = React.useState('ALL')
  const [status, setStatus] = React.useState('ALL')
  const [search, setSearch] = React.useState('')
  const [items, setItems] = React.useState<AlertRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [offset, setOffset] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)

  // Filter-only query (excludes offset). Refetch when this changes.
  const filterQuery = React.useMemo(() => {
    const params = new URLSearchParams()
    if (hazard && hazard !== 'ALL') params.set('hazard', hazard)
    if (severity && severity !== 'ALL') params.set('severity', severity)
    if (status && status !== 'ALL') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [hazard, severity, status, search])

  // Reset offset and trigger first-page load whenever filters change.
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<AlertsResponse>(`/api/alerts?${filterQuery}&offset=0`)
      .then((res) => {
        if (cancelled) return
        setItems(res.items)
        setTotal(res.total)
        setOffset(0)
        setLastChecked(new Date())
      })
      .catch((e: any) => { if (!cancelled) setError(String(e?.message ?? e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterQuery])

  // Manual refresh of the first page (keeps current filters).
  const refresh = React.useCallback(() => {
    setLoading(true)
    setError(null)
    apiGet<AlertsResponse>(`/api/alerts?${filterQuery}&offset=0`)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
        setOffset(0)
        setLastChecked(new Date())
      })
      .catch((e: any) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [filterQuery])

  const loadMore = () => {
    const nextOffset = offset + PAGE_SIZE
    setLoadingMore(true)
    apiGet<AlertsResponse>(`/api/alerts?${filterQuery}&offset=${nextOffset}`)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items])
        setOffset(nextOffset)
        setTotal(res.total)
      })
      .catch((e: any) => toast.error('Failed to load more alerts', { description: String(e?.message ?? e) }))
      .finally(() => setLoadingMore(false))
  }

  const hasMore = items.length < total

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <BellRing className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wide font-semibold">Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Active &amp; recent alerts</h1>
          <p className="text-sm text-muted-foreground">
            Hazard alerts, advisories, and watches. Active alerts shown first; expired entries remain visible for context.
          </p>
        </div>
        {lastChecked && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last checked {formatRelativeTime(lastChecked)}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={refresh}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="py-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Hazard</label>
              <Select value={hazard} onValueChange={setHazard}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All hazards" />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8"
                  placeholder="Title, body, issuer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{items.length}</span> of <span className="font-semibold text-foreground">{total}</span> alerts
        </span>
        {(hazard !== 'ALL' || severity !== 'ALL' || status !== 'ALL' || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setHazard('ALL'); setSeverity('ALL'); setStatus('ALL'); setSearch('') }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* List / states */}
      {loading ? (
        <AlertListSkeleton />
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Unable to load alerts</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No alerts match your filters.</p>
              <p className="text-sm text-muted-foreground mt-1">Try clearing filters or refreshing.</p>
            </div>
            <Button size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin pr-1 space-y-3">
            {items.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onOpen={() => setSelectedAlertId(a.id)}
                onViewMap={() => setView('map')}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  <>Load more ({total - items.length} remaining)</>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail drawer */}
      <AlertDetailSheet
        alertId={selectedAlertId}
        onClose={() => setSelectedAlertId(null)}
        onViewMap={() => { setSelectedAlertId(null); setView('map') }}
      />
    </div>
  )
}

function AlertCard({
  alert,
  onOpen,
  onViewMap,
}: {
  alert: AlertRow
  onOpen: () => void
  onViewMap: () => void
}) {
  const expired = alert.status === 'EXPIRED'
  const [expanded, setExpanded] = React.useState(false)
  const bodyRef = React.useRef<HTMLParagraphElement>(null)
  const [bodyOverflowing, setBodyOverflowing] = React.useState(false)

  React.useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    setBodyOverflowing(el.scrollHeight > 96)
  }, [alert.body])

  const handleShare = () => {
    const url = `${window.location.origin}/?alert=${alert.id}`
    navigator.clipboard?.writeText(url).then(
      () => toast.success('Link copied', { description: 'Alert link copied to clipboard.' }),
      () => toast.success('Link copied', { description: url })
    )
  }

  const handleSave = () => toast.success('Saved to your library', { description: alert.title })
  const handleReadAloud = () => toast('Read-aloud playback (demo)', { description: 'Audio narration is a planned feature.' })

  return (
    <Card
      className={expired ? 'opacity-80 border-dashed' : ''}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <HazardBadge type={alert.alertType} />
              <SeverityBadge severity={alert.severity as Severity} />
              {alert.modelRiskLevel && (
                <ModelRiskBadge level={alert.modelRiskLevel as ModelRiskLevel} />
              )}
              <VerificationBadge status={alert.verificationStatus} />
              {alert.simulationMode && <SimulationBadge className="text-[10px]" />}
              {expired && (
                <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[10px] font-bold">
                  EXPIRED
                </Badge>
              )}
            </div>
            <CardTitle className={`text-base leading-tight ${expired ? 'line-through text-muted-foreground' : ''}`}>
              {alert.title}
            </CardTitle>
            <CardDescription className="text-xs flex flex-wrap items-center gap-1.5">
              <Radio className="h-3 w-3" />
              <span className="font-medium text-foreground/80">{alert.issuerName}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{alert.issuerType}</span>
              {alert.authorName && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span>by {alert.authorName}</span>
                </>
              )}
            </CardDescription>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p
            ref={bodyRef}
            className={`text-sm text-foreground/90 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
          >
            {alert.body}
          </p>
          {bodyOverflowing && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
              className="text-xs text-primary hover:underline mt-1"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Issued {formatRelativeTime(alert.issuedAt)}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>Valid {fmtDateTime(alert.validFrom)} → {fmtDateTime(alert.expiresAt)}</span>
          {(alert.lat !== null && alert.lng !== null) && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <MapPin className="h-3 w-3" />
              <span>
                {alert.lat.toFixed(3)}, {alert.lng.toFixed(3)} · r={alert.radiusKm}km
              </span>
            </>
          )}
        </div>

        {alert.regions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-muted-foreground">Regions:</span>
            {alert.regions.slice(0, 4).map((r) => (
              <Badge key={r.id} variant="outline" className="text-[10px] py-0 px-1.5">
                {r.canonicalName}
              </Badge>
            ))}
            {alert.regions.length > 4 && (
              <span className="text-muted-foreground">+{alert.regions.length - 4} more</span>
            )}
          </div>
        )}

        {alert.sourceUrl && (
          <a
            href={alert.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Source
          </a>
        )}

        <Separator />

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSave}>
            <Bookmark className="h-3.5 w-3.5" /> Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleReadAloud}>
            <Volume2 className="h-3.5 w-3.5" /> Read aloud
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={onViewMap}>
            <MapPin className="h-3.5 w-3.5" /> View on map
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertDetailSheet({
  alertId,
  onClose,
  onViewMap,
}: {
  alertId: string | null
  onClose: () => void
  onViewMap: () => void
}) {
  const open = !!alertId
  const [detail, setDetail] = React.useState<AlertDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!alertId) {
      setDetail(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setDetail(null)
    apiGet<AlertDetail>(`/api/alerts/${encodeURIComponent(alertId)}`)
      .then((d) => setDetail(d))
      .catch((e: any) => {
        if (String(e?.message ?? e).includes('404')) {
          setError('Alert not found. It may have been retracted.')
        } else {
          setError(String(e?.message ?? e))
        }
      })
      .finally(() => setLoading(false))
  }, [alertId])

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto scrollbar-thin">
        <SheetHeader>
          <SheetTitle className="text-left text-base">Alert detail</SheetTitle>
          <SheetDescription className="text-left">
            Full body, languages, delivery receipts, and regions.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="px-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="px-4">
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex flex-col items-start gap-3 py-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold text-sm">{error}</span>
                </div>
                <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {detail && !loading && (
          <div className="px-4 pb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <HazardBadge type={detail.alertType} />
              <SeverityBadge severity={detail.severity as Severity} />
              {detail.modelRiskLevel && <ModelRiskBadge level={detail.modelRiskLevel as ModelRiskLevel} />}
              <VerificationBadge status={detail.verificationStatus} />
              {detail.simulationMode && <SimulationBadge className="text-[10px]" />}
              {detail.status === 'EXPIRED' && (
                <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[10px] font-bold">
                  EXPIRED
                </Badge>
              )}
            </div>

            <div>
              <h3 className={`text-lg font-bold leading-tight ${detail.status === 'EXPIRED' ? 'line-through text-muted-foreground' : ''}`}>
                {detail.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {detail.issuerName} · {detail.issuerType}
                {detail.authorName ? ` · by ${detail.authorName}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Issued</div>
                <div className="font-medium">{formatRelativeTime(detail.issuedAt)}</div>
              </div>
              <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Expires</div>
                <div className="font-medium">{fmtDateTime(detail.expiresAt)}</div>
              </div>
              {detail.confidence !== null && (
                <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Confidence</div>
                  <div className="font-medium">{Math.round(detail.confidence * 100)}%</div>
                </div>
              )}
              <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Radius</div>
                <div className="font-medium">{detail.radiusKm} km</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Full body</h4>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{detail.body}</p>
            </div>

            {detail.sourceUrl && (
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {detail.sourceUrl}
              </a>
            )}

            {detail.lat !== null && detail.lng !== null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Center: {detail.lat.toFixed(3)}, {detail.lng.toFixed(3)} · radius {detail.radiusKm} km</span>
              </div>
            )}

            {detail.languages.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Languages className="h-3 w-3" /> Languages
                </h4>
                <div className="flex flex-wrap gap-1">
                  {detail.languages.map((l) => (
                    <Badge key={l} variant="outline" className="text-[10px] uppercase">{l}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Affected regions</h4>
              {detail.regions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No regions linked.</p>
              ) : (
                <ul className="space-y-1">
                  {detail.regions.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{r.canonicalName}</span>
                      {r.localName && <span className="text-xs text-muted-foreground">({r.localName})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Delivery receipts ({detail.deliveryCount})
              </h4>
              {detail.deliveries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No delivery receipts recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.deliveries.map((d) => {
                    const ok = d.status === 'DELIVERED' || d.status === 'ACKNOWLEDGED' || d.status === 'SENT'
                    return (
                      <li key={d.id} className="flex items-start gap-2 text-xs rounded-md border bg-muted/30 px-2.5 py-1.5">
                        {ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">{d.channel}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{d.status}</Badge>
                            {d.simulationMode && <SimulationBadge className="text-[10px] py-0" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            to {d.recipient}
                            {d.provider ? ` · ${d.provider}` : ''}
                            {' · queued '}
                            {formatRelativeTime(d.queuedAt)}
                            {d.deliveredAt ? ` · delivered ${formatRelativeTime(d.deliveredAt)}` : ''}
                            {d.attempts > 1 ? ` · ${d.attempts} attempts` : ''}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onViewMap}>
                <MapPin className="h-3.5 w-3.5" /> View on map
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function AlertListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
