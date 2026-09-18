'use client'

import * as React from 'react'
import {
  LayoutDashboard, Lock, RefreshCw, Activity, AlertTriangle, Siren, BellRing,
  Users, Clock, CheckCircle2, MapPin, Search, ExternalLink, Save, Eye, Send,
  FileText, Ban, AlertOctagon, PlayCircle, ShieldQuestion, Inbox,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { formatRelativeTime } from '@/lib/constants'
import { toast } from 'sonner'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge, VerificationBadge, SimulationBadge, SeverityBadge,
} from '@/components/shared/badges'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────
type OpsOverview = {
  activeAlertsByHazard: Record<string, number>
  activeAlertsByVerification: Record<string, number>
  activeAlertsTotal: number
  incidentsToday: number
  incidentsByStatus: Record<string, number>
  incidentsTotal: number
  pendingVerification: any[]
  highPriorityQueue: any[]
  sosQueue: any[]
  sourceHealth: any[]
  volunteerAvailability: { availableVolunteers: number; openTasks: any[] }
  recentAudit: { note: string; items: any[] }
  generatedAt: string
}

type IncidentListItem = {
  id: string
  incidentCode: string
  incidentType: string
  priority: string
  status: string
  description: string
  lat: number
  lng: number
  createdAt: string
  eventsCount: number
  assignmentsCount: number
}

type IncidentDetail = {
  id: string
  incidentCode: string
  incidentType: string
  priority: string
  status: string
  description: string
  lat: number
  lng: number
  locationKind: string
  locationAccuracyM: number | null
  locationCapturedAt: string
  createdAt: string
  closedAt: string | null
  assignedTeamId: string | null
  verificationStatus: string
  simulationMode: boolean
  events: any[]
  assignments: any[]
  attachments: any[]
  deliveries: any[]
}

type AlertListItem = {
  id: string
  alertType: string
  severity: string
  title: string
  body: string
  status: string
  verificationStatus: string
  simulationMode: boolean
  expiresAt: string
  validFrom: string
  publishedAt: string | null
  createdAt: string
  radiusKm: number
  lat: number | null
  lng: number | null
  languages: string
  regions?: any[]
  deliveries?: any[]
}

const HAZARD_COLORS: Record<string, string> = {
  LANDSLIDE: '#f59e0b',
  FLASH_FLOOD: '#06b6d4',
  HEAVY_RAIN: '#0ea5e9',
  EARTHQUAKE: '#8b5cf6',
  ROAD_BLOCK: '#f97316',
  GENERAL: '#64748b',
}

const STATUS_COLORS = [
  '#3b82f6', '#06b6d4', '#14b8a6', '#8b5cf6', '#f97316', '#10b981',
  '#ef4444', '#64748b',
]

const INCIDENT_STATUSES = [
  'NEW', 'TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED',
  'DUPLICATE', 'UNVERIFIED_CLOSED', 'CANCELLED',
]
const INCIDENT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
const INCIDENT_TYPES = [
  'SOS', 'LANDSLIDE', 'CRACK', 'FLOOD', 'ROAD_BLOCK', 'BRIDGE_DAMAGE',
  'FALLEN_TREE', 'BUILDING_DAMAGE', 'MISSING_PERSON', 'FIRE', 'OTHER',
]
const ALERT_TYPES = ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN', 'EARTHQUAKE', 'ROAD_BLOCK', 'GENERAL']
const SEVERITY_LEVELS = ['INFORMATIONAL', 'ADVISORY', 'WATCH', 'WARNING', 'EMERGENCY']

// ─── Locked card (role gate) ─────────────────────────────────────────
function LockedCard() {
  const { role, setRole } = useApp()
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Operations Dashboard</CardTitle>
              <CardDescription>Restricted to authorized operators</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Operations Dashboard is restricted to authorized operators. Switch your demo role
            (top-right) to <strong>District Operator</strong> or <strong>State Operator</strong>{' '}
            (or Admin) to access this view.
          </p>
          <p className="text-xs text-muted-foreground">
            Current role: <Badge variant="outline" className="font-mono">{role}</Badge>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setRole('DISTRICT_OPERATOR')}>
              Switch to District Operator
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRole('ADMIN')}>
              Switch to Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, hint, tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'warning' | 'critical' | 'info'
}) {
  const toneCls = {
    default: 'text-foreground',
    warning: 'text-amber-600 dark:text-amber-300',
    critical: 'text-red-600 dark:text-red-300',
    info: 'text-blue-600 dark:text-blue-300',
  }[tone]
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-muted', toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-none">
          <span className={cn('text-2xl font-bold tabular-nums', toneCls)}>{value}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">{label}</span>
          {hint && <span className="text-[11px] text-muted-foreground mt-0.5">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ─── Overview tab ────────────────────────────────────────────────────
function OverviewTab({ data, onOpenIncident }: {
  data: OpsOverview
  onOpenIncident: (id: string) => void
}) {
  const hazardBars = Object.entries(data.activeAlertsByHazard).map(([k, v]) => ({
    name: k, count: v, fill: HAZARD_COLORS[k] ?? '#64748b',
  }))
  const verificationBars = Object.entries(data.activeAlertsByVerification).map(([k, v]) => ({
    name: k, count: v,
  }))
  const statusPie = Object.entries(data.incidentsByStatus).map(([k, v], i) => ({
    name: k, value: v, fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
            <Activity className="h-3 w-3" /> DEMO data
          </Badge>
          <span className="text-xs text-muted-foreground">
            Generated {formatRelativeTime(data.generatedAt)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Audit logging active · Simulation mode on
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={BellRing} label="Active alerts" value={data.activeAlertsTotal} tone="critical" />
        <KpiCard icon={Activity} label="Incidents today" value={data.incidentsToday} tone="info" />
        <KpiCard icon={ShieldQuestion} label="Pending verification" value={data.pendingVerification.length} tone="warning" />
        <KpiCard icon={Siren} label="SOS queue" value={data.sosQueue.length} tone="critical" />
        <KpiCard icon={Users} label="Available volunteers" value={data.volunteerAvailability.availableVolunteers} tone="default" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3Mini /> Active alerts by hazard
            </CardTitle>
            <CardDescription className="text-xs">Counts of ACTIVE alerts grouped by alertType</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {hazardBars.length === 0 ? (
                <EmptyChart label="No active alerts" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hazardBars} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {hazardBars.map((b, i) => (
                        <Cell key={i} fill={b.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart3Mini /> Incidents by status
            </CardTitle>
            <CardDescription className="text-xs">All incidents grouped by lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {statusPie.length === 0 ? (
                <EmptyChart label="No incidents yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {statusPie.map((s, i) => (
                        <Cell key={i} fill={s.fill} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3Mini /> Active alerts by verification
            </CardTitle>
            <CardDescription className="text-xs">Verification tier of active alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {verificationBars.length === 0 ? (
                <EmptyChart label="No active alerts" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={verificationBars} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                    <RTooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {verificationBars.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOS queue + Source health */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-500" /> SOS queue
            </CardTitle>
            <CardDescription className="text-xs">
              Open SOS incidents with age + location freshness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Age</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Assignment</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sosQueue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-6">
                        No open SOS incidents
                      </TableCell>
                    </TableRow>
                  )}
                  {data.sosQueue.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.incidentCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'text-[10px] font-semibold',
                          s.priority === 'CRITICAL'
                            ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            : s.priority === 'HIGH'
                            ? 'border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}>{s.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.ageMins}m</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {s.locationKind === 'GPS' ? 'GPS' : s.locationKind === 'LAST_KNOWN' ? `Last known · ${s.locationFreshnessMins}m` : 'Manual'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.assignment ? (
                          <span className="inline-flex flex-col">
                            <span className="font-medium">{s.assignment.volunteerName ?? 'Volunteer'}</span>
                            <span className="text-[10px] text-muted-foreground">{s.assignment.status}</span>
                          </span>
                        ) : s.assignedTeamId ? (
                          <span className="text-muted-foreground">{s.assignedTeamId}</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenIncident(s.id)}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Source health
            </CardTitle>
            <CardDescription className="text-xs">
              Data-source ingestion health (DEMO integrations)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Health</TableHead>
                    <TableHead className="text-xs">Last success</TableHead>
                    <TableHead className="text-xs">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sourceHealth.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-6">
                        No data sources configured
                      </TableCell>
                    </TableRow>
                  )}
                  {data.sourceHealth.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">{s.provider}</span>
                          {s.simulationMode && (
                            <Badge variant="outline" className="mt-0.5 w-fit text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">SIMULATED</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{s.sourceType}</TableCell>
                      <TableCell><StatusBadge status={s.healthStatus} /></TableCell>
                      <TableCell className="text-xs">
                        {s.lastSuccessAt ? formatRelativeTime(s.lastSuccessAt) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-red-600 dark:text-red-400 max-w-[200px]">
                        {s.lastErrorMessage ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  )
}

function BarChart3Mini() {
  return <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
}
function PieChart3Mini() {
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />
}

// ─── Incidents tab ──────────────────────────────────────────────────
function IncidentsTab({
  onOpenIncident, refreshKey,
}: {
  onOpenIncident: (id: string) => void
  refreshKey: number
}) {
  const [items, setItems] = React.useState<IncidentListItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [status, setStatus] = React.useState<string>('ALL')
  const [priority, setPriority] = React.useState<string>('ALL')
  const [type, setType] = React.useState<string>('ALL')
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'ALL') params.set('status', status)
      if (priority !== 'ALL') params.set('priority', priority)
      if (type !== 'ALL') params.set('type', type)
      params.set('limit', '200')
      const res = await apiGet<{ items: IncidentListItem[]; total: number }>(`/api/ops/incidents?${params.toString()}`)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      toast.error('Failed to load incidents', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [status, priority, type])

  React.useEffect(() => {
    load()
  }, [load, refreshKey])

  const filtered = React.useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((i) =>
      i.incidentCode.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.incidentType.toLowerCase().includes(q)
    )
  }, [items, search])

  return (
    <Card className="py-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Incident queue
              <Badge variant="outline" className="text-[10px]">{total}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Filter by status, priority, type or search by code/description</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {INCIDENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {INCIDENT_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {INCIDENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search code / description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Events</TableHead>
                <TableHead className="text-xs">Assign.</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-muted-foreground text-xs">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-muted-foreground text-xs">
                    No incidents match the current filters
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map((i) => (
                <TableRow key={i.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpenIncident(i.id)}>
                  <TableCell className="font-mono text-[11px]">{i.incidentCode}</TableCell>
                  <TableCell className="text-xs">{i.incidentType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      'text-[10px] font-semibold',
                      i.priority === 'CRITICAL'
                        ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : i.priority === 'HIGH'
                        ? 'border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                        : i.priority === 'NORMAL'
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}>{i.priority}</Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate">{i.description}</TableCell>
                  <TableCell className="text-xs tabular-nums">{i.eventsCount}</TableCell>
                  <TableCell className="text-xs tabular-nums">{i.assignmentsCount}</TableCell>
                  <TableCell className="text-xs">{formatRelativeTime(i.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onOpenIncident(i.id) }}>
                      Open <ExternalLink className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: row click opens the incident Sheet for full timeline + status controls.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Incident Sheet ─────────────────────────────────────────────────
function IncidentSheet({
  incidentId, open, onOpenChange, onChanged,
}: {
  incidentId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onChanged: () => void
}) {
  const [incident, setIncident] = React.useState<IncidentDetail | null>(null)
  const [volunteers, setVolunteers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<string>('')
  const [newPriority, setNewPriority] = React.useState<string>('')
  const [assignVolunteer, setAssignVolunteer] = React.useState<string>('')
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!incidentId) return
    setLoading(true)
    try {
      const [inc, vols] = await Promise.all([
        apiGet<{ incident: IncidentDetail }>(`/api/ops/incidents/${incidentId}`),
        apiGet<{ items: any[] }>(`/api/admin/volunteers`),
      ])
      setIncident(inc.incident)
      setVolunteers(vols.items ?? [])
      setNewStatus(inc.incident.status)
      setNewPriority(inc.incident.priority)
      setNote('')
    } catch (e) {
      toast.error('Failed to load incident', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  React.useEffect(() => {
    if (open && incidentId) load()
  }, [open, incidentId, load])

  async function handleUpdate() {
    if (!incident) return
    setSaving(true)
    try {
      const body: any = {}
      if (newStatus && newStatus !== incident.status) body.status = newStatus
      if (newPriority && newPriority !== incident.priority) body.priority = newPriority
      if (note) body.note = note
      if (Object.keys(body).length === 0) {
        toast.info('No changes to apply')
        return
      }
      const res = await apiPatch<{ incident: IncidentDetail }>(`/api/ops/incidents/${incident.id}`, body)
      setIncident(res.incident)
      toast.success('Incident updated', { description: 'Status change + note written to timeline. Action logged.' })
      setNote('')
      onChanged()
    } catch (e) {
      toast.error('Update failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign() {
    if (!incident || !assignVolunteer) return
    setSaving(true)
    try {
      const v = volunteers.find((x) => x.id === assignVolunteer)
      const teamId = v?.user?.name ? `volunteer:${v.user.name}` : `volunteer:${assignVolunteer}`
      const res = await apiPatch<{ incident: IncidentDetail }>(`/api/ops/incidents/${incident.id}`, {
        assignedTeamId: teamId,
        note: `Assigned to volunteer: ${v?.user?.name ?? assignVolunteer}`,
      })
      setIncident(res.incident)
      setAssignVolunteer('')
      toast.success('Volunteer assigned', { description: 'Assignment recorded. Action logged.' })
      onChanged()
    } catch (e) {
      toast.error('Assignment failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Siren className="h-4 w-4" />
            {incident?.incidentCode ?? 'Incident'}
            {incident?.simulationMode && <SimulationBadge className="ml-2" />}
          </SheetTitle>
          <SheetDescription>
            Full incident timeline, assignments and delivery receipts.
          </SheetDescription>
        </SheetHeader>
        {loading && (
          <div className="px-4 py-6 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {!loading && incident && (
          <div className="px-4 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Type</span>
                <div className="font-medium">{incident.incidentType}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <div><Badge variant="outline" className="text-[10px]">{incident.priority}</Badge></div>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div><StatusBadge status={incident.status} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">Verification</span>
                <div><VerificationBadge status={incident.verificationStatus} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <div className="font-mono">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</div>
                <div className="text-[10px] text-muted-foreground">{incident.locationKind} · {incident.locationAccuracyM ?? '—'}m</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <div>{formatRelativeTime(incident.createdAt)}</div>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium">Description</span>
              <p className="text-sm mt-1">{incident.description}</p>
            </div>

            {/* Status update controls */}
            <Card className="py-3">
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-xs">Update status / priority</CardTitle>
              </CardHeader>
              <CardContent className="px-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INCIDENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INCIDENT_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Note (added to timeline)</Label>
                  <Textarea
                    className="text-xs min-h-12"
                    placeholder="Optional note for the audit trail…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <Button size="sm" className="h-8 w-full" onClick={handleUpdate} disabled={saving}>
                  <Save className="h-3.5 w-3.5" /> Update incident
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Audit note: status transitions are validated against the incident lifecycle.
                  Each update writes an IncidentEvent and an AuditLog entry.
                </p>
              </CardContent>
            </Card>

            {/* Assign to volunteer */}
            <Card className="py-3">
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-xs">Assign to volunteer</CardTitle>
              </CardHeader>
              <CardContent className="px-4 space-y-2">
                <div className="flex gap-2">
                  <Select value={assignVolunteer} onValueChange={setAssignVolunteer}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select a verified volunteer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {volunteers.filter((v) => v.verificationStatus === 'VERIFIED').map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.user?.name ?? 'Volunteer'} · {v.skills?.split(',')[0] ?? 'general'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleAssign} disabled={saving || !assignVolunteer}>
                    Assign
                  </Button>
                </div>
                {incident.assignments.length > 0 && (
                  <div className="text-xs space-y-1">
                    {incident.assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between border rounded px-2 py-1">
                        <span>{a.volunteer?.name ?? 'Volunteer'}</span>
                        <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="py-3">
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-xs">Timeline ({incident.events.length})</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                  {incident.events.length === 0 && (
                    <p className="text-xs text-muted-foreground">No events recorded yet.</p>
                  )}
                  {incident.events.map((ev) => (
                    <div key={ev.id} className="border-l-2 border-primary/30 pl-2 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{ev.eventType}</Badge>
                        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(ev.createdAt)}</span>
                      </div>
                      {ev.fromStatus && ev.toStatus && (
                        <p className="text-xs mt-0.5">
                          <span className="font-mono">{ev.fromStatus}</span> → <span className="font-mono">{ev.toStatus}</span>
                        </p>
                      )}
                      {ev.note && <p className="text-xs text-muted-foreground mt-0.5">{ev.note}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deliveries */}
            {incident.deliveries.length > 0 && (
              <Card className="py-3">
                <CardHeader className="pb-2 px-4">
                  <CardTitle className="text-xs">Notification deliveries ({incident.deliveries.length})</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="space-y-1">
                    {incident.deliveries.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                        <span className="font-mono text-[11px]">{d.recipient}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{d.channel}</Badge>
                          <StatusBadge status={d.status} />
                          {d.simulationMode && <SimulationBadge className="text-[9px]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Alert Authoring tab ────────────────────────────────────────────
function AlertAuthoringTab({
  location, refreshKey, onRefresh,
}: {
  location: { lat: number; lng: number; name: string }
  refreshKey: number
  onRefresh: () => void
}) {
  const [alerts, setAlerts] = React.useState<AlertListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [draft, setDraft] = React.useState({
    alertType: 'LANDSLIDE',
    severity: 'ADVISORY',
    title: '',
    body: '',
    lat: location.lat,
    lng: location.lng,
    radiusKm: 10,
    validFrom: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 16),
    languages: 'en,hi,ne,as',
    simulationMode: true,
  })
  const [saving, setSaving] = React.useState(false)
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const previewAlert = alerts.find((a) => a.id === previewId) ?? null

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: AlertListItem[] }>(`/api/ops/alerts`)
      setAlerts(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load alerts', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load, refreshKey])

  async function saveDraft() {
    if (!draft.title || !draft.body) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...draft,
        lat: Number(draft.lat),
        lng: Number(draft.lng),
        radiusKm: Number(draft.radiusKm),
        validFrom: new Date(draft.validFrom).toISOString(),
        expiresAt: new Date(draft.expiresAt).toISOString(),
      }
      await apiPost<{ alert: AlertListItem }>(`/api/ops/alerts`, payload)
      toast.success('Draft saved', { description: 'Status: DRAFT · verification: PLATFORM. Action logged.' })
      setDraft((d) => ({ ...d, title: '', body: '' }))
      await load()
      onRefresh()
    } catch (e) {
      toast.error('Failed to save draft', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function doAction(id: string, action: 'approve' | 'publish' | 'expire' | 'retract') {
    try {
      const res = await apiPatch<{ alert: AlertListItem; delivery: any }>(`/api/ops/alerts/${id}`, { action })
      const label = action === 'publish'
        ? `Status: ACTIVE · verification: ${res.alert.verificationStatus}. SIMULATED delivery receipts created.`
        : `Status: ${res.alert.status}. Action logged.`
      toast.success(`Alert ${action} applied`, { description: label })
      await load()
      onRefresh()
    } catch (e) {
      toast.error(`Failed to ${action} alert`, { description: String(e) })
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Left: draft form */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Draft alert
          </CardTitle>
          <CardDescription className="text-xs">
            Drafts start in DRAFT / PLATFORM verification. Two-person approval recommended for EMERGENCY severity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Alert type</Label>
              <Select value={draft.alertType} onValueChange={(v) => setDraft((d) => ({ ...d, alertType: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={draft.severity} onValueChange={(v) => setDraft((d) => ({ ...d, severity: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="h-8 text-xs" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="e.g. Landslide Watch — North Sikkim" />
          </div>
          <div>
            <Label className="text-xs">Body / advisory text</Label>
            <Textarea className="text-xs min-h-20" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} placeholder="Plain-language advisory. Mention hazard, area, recommended action, validity." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Lat</Label>
              <Input className="h-8 text-xs" type="number" step="0.0001" value={draft.lat} onChange={(e) => setDraft((d) => ({ ...d, lat: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Lng</Label>
              <Input className="h-8 text-xs" type="number" step="0.0001" value={draft.lng} onChange={(e) => setDraft((d) => ({ ...d, lng: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Radius (km)</Label>
              <Input className="h-8 text-xs" type="number" step="1" value={draft.radiusKm} onChange={(e) => setDraft((d) => ({ ...d, radiusKm: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Valid from</Label>
              <Input className="h-8 text-xs" type="datetime-local" value={draft.validFrom} onChange={(e) => setDraft((d) => ({ ...d, validFrom: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Expires at</Label>
              <Input className="h-8 text-xs" type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Languages (comma-separated codes)</Label>
            <Input className="h-8 text-xs" value={draft.languages} onChange={(e) => setDraft((d) => ({ ...d, languages: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Simulation mode: {draft.simulationMode ? 'ON' : 'OFF'}
            </Badge>
            <Button size="sm" onClick={saveDraft} disabled={saving}>
              <Save className="h-3.5 w-3.5" /> Save draft
            </Button>
          </div>
          <Alert className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            <AlertTitle className="text-xs">Public advisories vs. authority-issued alerts</AlertTitle>
            <AlertDescription className="text-xs">
              Public advisories are distinguished from authority-issued alerts.
              Two-person approval recommended for highest severity (EMERGENCY / WARNING).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Right: list */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <BellRing className="h-4 w-4" /> Drafts & active alerts
              </CardTitle>
              <CardDescription className="text-xs">Approve → Publish → Expire / Retract lifecycle</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin space-y-2">
            {alerts.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-6">No alerts yet — draft one to begin.</p>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="border rounded-md p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{a.alertType}</Badge>
                    <SeverityBadge severity={a.severity as any} />
                    <StatusBadge status={a.status} />
                    <VerificationBadge status={a.verificationStatus} />
                    {a.simulationMode && <SimulationBadge className="text-[9px]" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Expires {formatRelativeTime(a.expiresAt)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium">{a.title}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreviewId(a.id)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                  {a.status === 'DRAFT' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction(a.id, 'approve')}>
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  {(a.status === 'DRAFT' || a.status === 'ACTIVE') && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => doAction(a.id, 'publish')}>
                      <Send className="h-3 w-3" /> Publish
                    </Button>
                  )}
                  {a.status === 'ACTIVE' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction(a.id, 'expire')}>
                        <Clock className="h-3 w-3" /> Expire
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => doAction(a.id, 'retract')}>
                        <Ban className="h-3 w-3" /> Retract
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Sheet */}
      <Sheet open={!!previewId} onOpenChange={(v) => !v && setPreviewId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto scrollbar-thin">
          <SheetHeader>
            <SheetTitle>Alert preview</SheetTitle>
            <SheetDescription>Map scope + recipient estimate (simulated)</SheetDescription>
          </SheetHeader>
          {previewAlert && (
            <div className="px-4 pb-6 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{previewAlert.alertType}</Badge>
                <SeverityBadge severity={previewAlert.severity as any} />
                <StatusBadge status={previewAlert.status} />
                <VerificationBadge status={previewAlert.verificationStatus} />
              </div>
              <div>
                <div className="font-medium text-sm">{previewAlert.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{previewAlert.body}</p>
              </div>
              <div className="border rounded-md p-3 bg-muted/30 text-xs space-y-1">
                <div className="font-medium">Map scope (simulated)</div>
                <div>Center: <span className="font-mono">{previewAlert.lat?.toFixed(4) ?? '—'}, {previewAlert.lng?.toFixed(4) ?? '—'}</span></div>
                <div>Radius: <span className="font-mono">{previewAlert.radiusKm} km</span></div>
                <div>Regions tagged: <span className="font-mono">{previewAlert.regions?.length ?? 0}</span></div>
                <div>Recipient estimate (simulated): <span className="font-mono">{Math.max(0, Math.round((previewAlert.radiusKm ?? 0) * 320))}</span> residents</div>
                <div>Languages: <span className="font-mono">{previewAlert.languages}</span></div>
              </div>
              {previewAlert.deliveries && previewAlert.deliveries.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium mb-1">Delivery receipts</div>
                  <div className="space-y-1">
                    {previewAlert.deliveries.slice(0, 6).map((d) => (
                      <div key={d.id} className="flex items-center justify-between border rounded px-2 py-1">
                        <span className="font-mono text-[11px]">{d.recipient}</span>
                        <StatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Alert className="text-xs">
                <AlertOctagon className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  Publishing creates a simulated IN_APP delivery record to the geofence recipient.
                  Real SMS / Web Push integration requires a verified authority workflow.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Data Health tab ────────────────────────────────────────────────
function DataHealthTab() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<any>(`/api/ops/data-health`)
      setData(res)
    } catch (e) {
      toast.error('Failed to load data health', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function runScenario() {
    setRunning(true)
    toast.info('Scenario mode', { description: 'Simulating intense rainfall over selected catchment — synthetic data injected.' })
    setTimeout(() => {
      setRunning(false)
      load()
    }, 1200)
  }

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Data source health
              </CardTitle>
              <CardDescription className="text-xs">Ingestion freshness, error messages and simulation flags</CardDescription>
            </div>
            <Button size="sm" onClick={runScenario} disabled={running}>
              <PlayCircle className={cn('h-4 w-4', running && 'animate-pulse')} /> Run scenario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-xs">
                <MetricPill label="Total sources" value={data.freshnessSummary.total} />
                <MetricPill label="Healthy" value={data.freshnessSummary.healthy} tone="good" />
                <MetricPill label="Degraded" value={data.freshnessSummary.degraded} tone="warn" />
                <MetricPill label="Errored" value={data.freshnessSummary.errored} tone="bad" />
                <MetricPill label="Stale (>2x refresh)" value={data.freshnessSummary.staleCount} tone="warn" />
              </div>
              <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Health</TableHead>
                      <TableHead className="text-xs">Last success</TableHead>
                      <TableHead className="text-xs">Freshness</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sources.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground">{s.provider}</span>
                            {s.simulationMode && (
                              <Badge variant="outline" className="mt-0.5 w-fit text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">SIMULATED</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{s.sourceType}</TableCell>
                        <TableCell><StatusBadge status={s.healthStatus} /></TableCell>
                        <TableCell className="text-xs">{s.lastSuccessAt ? formatRelativeTime(s.lastSuccessAt) : '—'}</TableCell>
                        <TableCell className="text-xs">
                          {s.freshnessMinutes === null ? '—' : (
                            <span className={cn(s.stale ? 'text-amber-600 dark:text-amber-300 font-medium' : '')}>
                              {s.freshnessMinutes}m {s.stale && '(stale)'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-red-600 dark:text-red-400 max-w-[200px]">{s.lastErrorMessage ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No data available.</p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ingestion freshness summary</CardTitle>
          <CardDescription className="text-xs">
            The “Run scenario” button simulates an intense-rainfall event over a selected catchment.
            For the MVP it triggers a toast + refresh of the health panel — no real data sources are mutated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            <AlertTitle className="text-xs">Simulation labels are shown everywhere</AlertTitle>
            <AlertDescription className="text-xs">
              Every simulated source and delivery is marked with a SIMULATED badge so demo audiences can clearly distinguish synthetic from live data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricPill({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneCls = {
    default: 'border-border bg-muted/40',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    bad: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  }[tone]
  return (
    <div className={cn('rounded-md border px-2.5 py-1.5', toneCls)}>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
    </div>
  )
}

// ─── Top-level view ─────────────────────────────────────────────────
export default function OperationsView() {
  const { role, setView, location } = useApp()
  const [tab, setTab] = React.useState('overview')
  const [overview, setOverview] = React.useState<OpsOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [incidentId, setIncidentId] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const allowed = role === 'DISTRICT_OPERATOR' || role === 'STATE_OPERATOR' || role === 'ADMIN'

  const loadOverview = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<OpsOverview>(`/api/ops`)
      setOverview(data)
    } catch (e) {
      toast.error('Failed to load operations overview', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (allowed) loadOverview()
  }, [allowed, loadOverview, refreshKey])

  function openIncident(id: string) {
    setIncidentId(id)
    setSheetOpen(true)
    setTab('incidents')
  }

  if (!allowed) return <LockedCard />

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Operations Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              District / State operator console — incidents, alerts, data health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">Role: {role}</Badge>
          <Button size="sm" variant="outline" onClick={() => setView('home')}>
            <LayoutDashboard className="h-3.5 w-3.5" /> Exit
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-thin">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs">Incidents</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alert Authoring</TabsTrigger>
          <TabsTrigger value="data-health" className="text-xs">Data Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {loading || !overview ? <LoadingState /> : (
            <OverviewTab data={overview} onOpenIncident={openIncident} />
          )}
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          <IncidentsTab onOpenIncident={openIncident} refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertAuthoringTab
            location={{ lat: location.lat, lng: location.lng, name: location.name }}
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </TabsContent>

        <TabsContent value="data-health" className="mt-4">
          <DataHealthTab />
        </TabsContent>
      </Tabs>

      <IncidentSheet
        incidentId={incidentId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
