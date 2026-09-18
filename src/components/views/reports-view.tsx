'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Megaphone, MapPin, Loader2, ChevronRight, Filter, RefreshCw, Trash2,
  Crosshair, CloudOff, ShieldAlert, Clock, Eye, FileText,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import { formatRelativeTime, distanceKm } from '@/lib/constants'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  SimulationBadge, StatusBadge, VerificationBadge, SeverityBadge,
} from '@/components/shared/badges'
import type { Severity } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────
interface CommunityReportRow {
  id: string
  category: string
  description: string
  lat: number
  lng: number
  severity: string
  status: string
  verificationStatus: string
  simulationMode: boolean
  observedAt: string
  createdAt: string
  updatedAt: string
}

interface ReportDetail {
  report: CommunityReportRow
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'LANDSLIDE', label: 'Landslide' },
  { value: 'CRACK', label: 'Ground crack' },
  { value: 'FLOOD', label: 'Flood / waterlogging' },
  { value: 'ROAD_BLOCK', label: 'Road block' },
  { value: 'BRIDGE_DAMAGE', label: 'Bridge damage' },
  { value: 'FALLEN_TREE', label: 'Fallen tree' },
  { value: 'BUILDING_DAMAGE', label: 'Building damage' },
  { value: 'MISSING_PERSON', label: 'Missing person' },
  { value: 'FIRE', label: 'Fire' },
  { value: 'OTHER', label: 'Other' },
]

const STATUSES: { value: string; label: string }[] = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESOLVED', label: 'Resolved' },
]

const SEVERITIES: { value: string; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const QUEUE_KEY = 'purvaguard-report-queue'

function loadQueue(): any[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as any[]) : []
  } catch {
    return []
  }
}

function saveQueue(q: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

function captureGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Use manual location.'))
        } else {
          reject(new Error('Could not capture location.'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

// ── Main view ────────────────────────────────────────────────────────────
export default function ReportsView() {
  const { location, connectivity, language } = useApp()

  // Form state
  const [category, setCategory] = React.useState('LANDSLIDE')
  const [description, setDescription] = React.useState('')
  const [severity, setSeverity] = React.useState<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>('MODERATE')
  const [lat, setLat] = React.useState(String(location.lat))
  const [lng, setLng] = React.useState(String(location.lng))
  const [observedAt, setObservedAt] = React.useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [submitting, setSubmitting] = React.useState(false)

  // Feed state
  const [reports, setReports] = React.useState<CommunityReportRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterCat, setFilterCat] = React.useState<string>('ALL')
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL')

  // Queue (offline)
  const [queue, setQueue] = React.useState<any[]>([])

  // Detail sheet
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<CommunityReportRow | null>(null)

  React.useEffect(() => {
    setLat(String(location.lat))
    setLng(String(location.lng))
  }, [location.lat, location.lng])

  React.useEffect(() => {
    setQueue(loadQueue())
    refreshReports()
  }, [])

  const refreshReports = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: CommunityReportRow[] }>('/api/reports?limit=50')
      setReports(res.items ?? [])
    } catch (err: any) {
      console.warn('Failed to load reports', err)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleUseMyLocation() {
    try {
      const pos = await captureGeolocation()
      setLat(String(pos.lat))
      setLng(String(pos.lng))
      toast.success('Location captured.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not capture location.')
    }
  }

  function checkDuplicate(): CommunityReportRow | null {
    const latN = Number(lat)
    const lngN = Number(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null
    return (
      reports.find((r) => {
        if (r.category !== category) return false
        const d = distanceKm(latN, lngN, r.lat, r.lng)
        return d <= 1.0
      }) ?? null
    )
  }

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error('Please add a short description.')
      return
    }
    const latN = Number(lat)
    const lngN = Number(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      toast.error('Valid latitude and longitude are required.')
      return
    }
    setSubmitting(true)
    const payload = {
      category,
      description: description.trim(),
      lat: latN,
      lng: lngN,
      severity,
      observedAt: new Date(observedAt).toISOString(),
    }

    // Offline path: queue locally.
    if (connectivity === 'OFFLINE') {
      const next = [...queue, { queuedAt: new Date().toISOString(), payload }]
      setQueue(next)
      saveQueue(next)
      setSubmitting(false)
      toast.info('Offline — report queued locally.', {
        description: 'Tap Sync now when back online.',
      })
      setDescription('')
      return
    }

    try {
      const res = await apiPost<{ report: CommunityReportRow }>('/api/reports', payload)
      setReports((cur) => [res.report, ...cur])
      toast.success('Report received — status: RECEIVED')
      setDescription('')

      // Trigger AI disaster verification pipeline automatically.
      // The AI analyzes the report, verifies it, and if it's a HIGH/CRITICAL
      // disaster, auto-creates an alert + sends SMS to all recipients.
      try {
        toast.info('AI is analyzing your report…', {
          description: 'Verifying disaster signal and notifying authorities if needed.',
        })
        const verifyRes = await apiPost<{ analysis: any; alertCreated: any; smsResult: any; autoActionTaken: boolean }>('/api/disaster-verify', {
          text: `${category}: ${description.trim()}`,
          language,
          reportId: res.report.id,
          lat: latN,
          lng: lngN,
        })
        if (verifyRes.autoActionTaken) {
          const a = verifyRes.analysis
          const sms = verifyRes.smsResult
          toast.success('⚠️ Disaster verified by AI!', {
            description: `${a.disasterType} (${a.severity}) detected near ${a.affectedArea}. Alert created & SMS sent to ${sms?.sent ?? 0}/${sms?.total ?? 6} recipients.`,
            duration: 8000,
          })
        } else if (verifyRes.analysis?.isRealDisaster) {
          toast.info('AI flagged this report for review', {
            description: `Severity: ${verifyRes.analysis.severity}. An operator will verify shortly.`,
            duration: 6000,
          })
        } else {
          toast.info('AI analysis complete', {
            description: 'No immediate disaster signal detected. Report logged for monitoring.',
            duration: 5000,
          })
        }
      } catch (verifyErr) {
        // Verification pipeline failure should not block the report.
        console.error('Verification failed:', verifyErr)
      }
    } catch (err: any) {
      // Fallback to queue on error.
      const next = [...queue, { queuedAt: new Date().toISOString(), payload }]
      setQueue(next)
      saveQueue(next)
      toast.error('Failed to submit — queued locally.', { description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSyncQueue() {
    if (queue.length === 0) {
      toast.info('Nothing to sync.')
      return
    }
    let ok = 0
    let failed = 0
    for (const item of queue) {
      try {
        const res = await apiPost<{ report: CommunityReportRow }>('/api/reports', item.payload)
        setReports((cur) => [res.report, ...cur])
        ok++
      } catch {
        failed++
      }
    }
    if (failed === 0) {
      setQueue([])
      saveQueue([])
      toast.success(`Synced ${ok} queued report(s).`)
    } else {
      // Keep failed ones in queue
      const remaining = queue.slice(queue.length - failed)
      setQueue(remaining)
      saveQueue(remaining)
      toast.warning(`Synced ${ok}, ${failed} failed.`)
    }
  }

  function handleClearQueue() {
    setQueue([])
    saveQueue([])
    toast.info('Local queue cleared.')
  }

  function handleWithdraw(r: CommunityReportRow) {
    toast.info('Withdrawal requested', {
      description: `${r.id.slice(0, 8)}… — for MVP this is a toast only.`,
    })
  }

  function openDetail(r: CommunityReportRow) {
    setSelected(r)
    setSheetOpen(true)
  }

  const duplicate = checkDuplicate()

  const filteredReports = reports.filter((r) => {
    if (filterCat !== 'ALL' && r.category !== filterCat) return false
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false
    return true
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Community Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Report what you observe. Reports are visible to district operators. The public map shows only
            moderated / generalized reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulationBadge />
          {connectivity === 'OFFLINE' && (
            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <CloudOff className="h-3 w-3" /> Offline
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Left: form ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Submit a report
            </CardTitle>
            <CardDescription>Tell us what you saw. Be specific and stay safe while reporting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severity (self-assessed)</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-desc" className="text-xs">Description</Label>
              <Textarea
                id="rep-desc"
                rows={3}
                maxLength={1000}
                placeholder="What did you see? When? Is anyone in danger?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
                <Input type="number" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
              </div>
              <Button size="sm" variant="outline" onClick={handleUseMyLocation} className="gap-1.5">
                <Crosshair className="h-3.5 w-3.5" /> Use my location
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Defaults to <span className="font-medium text-foreground">{location.name}</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observed-at" className="text-xs">Time observed</Label>
              <Input
                id="observed-at"
                type="datetime-local"
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
              />
            </div>

            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
              <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">Privacy warning</AlertTitle>
              <AlertDescription className="text-xs">
                Avoid uploading faces, vehicle plates, or identifiable people. Reports are reviewed by
                district operators before being shared publicly.
              </AlertDescription>
            </Alert>

            {duplicate && (
              <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
                <AlertTitle className="text-blue-800 dark:text-blue-300 text-sm">
                  A similar report exists nearby
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Within ~1km: <span className="font-medium">{duplicate.id.slice(0, 8)}…</span> · {duplicate.category} · {formatRelativeTime(duplicate.createdAt)}. Please confirm this is a new report.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Submit report
            </Button>

            {queue.length > 0 && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-semibold">{queue.length}</span> queued offline
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={handleSyncQueue} className="gap-1.5">
                      <RefreshCw className="h-3 w-3" /> Sync now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleClearQueue} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {queue.map((q, i) => (
                    <li key={i}>
                      {q.payload.category} · {q.payload.description?.slice(0, 40) || '(no description)'}…
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right: feed ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" /> Reports feed
                </CardTitle>
                <CardDescription>Public map displays only moderated / generalized reports.</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={refreshReports} aria-label="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-2 pt-1">
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="h-8 w-full text-xs" size="sm">
                  <Filter className="h-3 w-3" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-full text-xs" size="sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6">No reports match your filters.</div>
            ) : (
              <ul className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                {filteredReports.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border bg-card px-3 py-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {r.category.replace(/_/g, ' ')}
                      </Badge>
                      <SeverityBadge severity={r.severity as Severity} />
                      <StatusBadge status={r.status} />
                      <VerificationBadge status={r.verificationStatus} />
                      <SimulationBadge />
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2">{r.description}</p>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{formatRelativeTime(r.observedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => openDetail(r)}>
                          Track <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => handleWithdraw(r)}>
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Track sheet ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Report tracking
            </SheetTitle>
            <SheetDescription>
              {selected ? selected.id.slice(0, 12) + '…' : 'Loading…'}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="p-4 space-y-4">
              <div className="rounded-md border p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    {selected.category.replace(/_/g, ' ')}
                  </Badge>
                  <SeverityBadge severity={selected.severity as Severity} />
                  <StatusBadge status={selected.status} />
                  <VerificationBadge status={selected.verificationStatus} />
                  <SimulationBadge />
                </div>
                <div className="text-foreground pt-1">{selected.description}</div>
                <div className="text-muted-foreground pt-1">
                  <MapPin className="inline h-3 w-3" /> {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                </div>
                <div className="text-muted-foreground">
                  <Clock className="inline h-3 w-3" /> Observed {formatRelativeTime(selected.observedAt)} · reported {formatRelativeTime(selected.createdAt)}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Status timeline
                </h4>
                <ReportTimeline report={selected} />
              </div>

              <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
                <AlertDescription className="text-xs">
                  Reports move through: RECEIVED → UNDER_REVIEW → VERIFIED (or REJECTED) → RESOLVED. Updates
                  are made by district operators during review.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Report timeline component ───────────────────────────────────────────
function ReportTimeline({ report }: { report: CommunityReportRow }) {
  const STAGES = ['RECEIVED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED']
  const ORDER: Record<string, number> = {
    RECEIVED: 0,
    UNDER_REVIEW: 1,
    VERIFIED: 2,
    REJECTED: 2,
    RESOLVED: 3,
  }
  const cur = ORDER[report.status] ?? 0
  const rejected = report.status === 'REJECTED'

  return (
    <ol className="space-y-3 border-l pl-4 ml-1">
      {STAGES.map((s, idx) => {
        const reached = idx <= cur && !rejected
        const current = idx === cur
        return (
          <li key={s} className="relative">
            <span
              className={cn(
                'absolute -left-[21px] top-1 h-2 w-2 rounded-full',
                reached ? 'bg-emerald-500' : 'bg-muted border',
                current && !rejected && 'ring-2 ring-emerald-400 ring-offset-1'
              )}
            />
            <div className={cn('text-xs font-semibold', reached ? 'text-foreground' : 'text-muted-foreground')}>
              {s.replace(/_/g, ' ')}
            </div>
            {current && (
              <div className="text-[11px] text-muted-foreground">
                {rejected ? 'Report rejected during review.' : 'Current stage.'}
              </div>
            )}
          </li>
        )
      })}
      {rejected && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-red-500" />
          <div className="text-xs font-semibold text-red-600 dark:text-red-400">Rejected</div>
          <div className="text-[11px] text-muted-foreground">Report was rejected during review.</div>
        </li>
      )}
    </ol>
  )
}
