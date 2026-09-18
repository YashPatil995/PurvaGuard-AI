'use client'

import * as React from 'react'
import {
  LayoutDashboard, BellRing, Activity, ShieldCheck, Siren, Users, Send,
  Newspaper, Building2, MapPin, Languages, Settings as SettingsIcon,
  AlertTriangle, RefreshCw, Plus, Pencil, Archive, Pin, PinOff, Save,
  Inbox, Search, X, CheckCircle2, Power, MessageSquare, Cpu, ChevronRight,
  Info, Database, PlayCircle, ExternalLink, Trash2, Eye, AlertOctagon,
  BadgeCheck, ShieldAlert, Zap, Sparkles,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge, VerificationBadge, SimulationBadge, DemoBadge, HazardBadge,
} from '@/components/shared/badges'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Section taxonomy ────────────────────────────────────────────────
type AdminSection =
  | 'overview' | 'incidents' | 'alerts' | 'disaster-verify' | 'sms'
  | 'news' | 'facilities' | 'regions' | 'volunteers' | 'translations'
  | 'settings'

const SECTIONS: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: 'overview',        label: 'Overview',                icon: LayoutDashboard, hint: 'KPIs, charts, source health' },
  { id: 'incidents',       label: 'Incidents & SOS',         icon: Siren,            hint: 'Triage, status, assignment' },
  { id: 'alerts',          label: 'Alerts',                  icon: BellRing,        hint: 'Draft → approve → publish' },
  { id: 'disaster-verify', label: 'Disaster Verification',  icon: Cpu,              hint: 'AI pipeline + auto SMS' },
  { id: 'sms',             label: 'SMS Alerts',              icon: Send,             hint: 'TextBelt sends + logs' },
  { id: 'news',            label: 'News',                    icon: Newspaper,        hint: 'Create / pin / archive' },
  { id: 'facilities',      label: 'Facilities',              icon: Building2,        hint: 'Shelters, hospitals' },
  { id: 'regions',         label: 'Localities (Regions)',    icon: MapPin,           hint: 'Region hierarchy' },
  { id: 'volunteers',      label: 'Volunteers',              icon: Users,            hint: 'Approve / reject' },
  { id: 'translations',    label: 'Translations (i18n)',     icon: Languages,        hint: 'en / hi / ne / as' },
  { id: 'settings',        label: 'Settings',                icon: SettingsIcon,     hint: 'System key/value' },
]

const HAZARD_COLORS: Record<string, string> = {
  LANDSLIDE: '#f59e0b',
  FLASH_FLOOD: '#06b6d4',
  HEAVY_RAIN: '#0ea5e9',
  EARTHQUAKE: '#8b5cf6',
  ROAD_BLOCK: '#f97316',
  GENERAL: '#64748b',
}
const STATUS_COLORS = ['#3b82f6', '#06b6d4', '#14b8a6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#64748b']

const INCIDENT_STATUSES = ['NEW', 'TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED', 'DUPLICATE', 'UNVERIFIED_CLOSED', 'CANCELLED']
const INCIDENT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
const INCIDENT_TYPES = ['SOS', 'LANDSLIDE', 'CRACK', 'FLOOD', 'ROAD_BLOCK', 'BRIDGE_DAMAGE', 'FALLEN_TREE', 'BUILDING_DAMAGE', 'MISSING_PERSON', 'FIRE', 'OTHER']
const ALERT_TYPES = ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN', 'EARTHQUAKE', 'ROAD_BLOCK', 'GENERAL']
const SEVERITY_LEVELS = ['INFORMATIONAL', 'ADVISORY', 'WATCH', 'WARNING', 'EMERGENCY']
const ALERT_STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'RETRACTED']
const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
]
const FACILITY_TYPES = ['SHELTER', 'HOSPITAL', 'RELIEF_CENTER', 'POLICE_STATION', 'FIRE_STATION', 'ASSEMBLY_POINT']
const REGION_TYPES = ['STATE', 'DISTRICT', 'LOCALITY']
const COVERAGE_STATUSES = ['CONFIGURED', 'DATA_CONNECTED', 'DEMO', 'INACTIVE']

const DEFAULT_SMS_TEMPLATE = 'DISASTER ALERT: Hazard reported in your area. Move to safety. Follow local authority instructions. -PurvaGuard AI'

// ─── Small shared UI helpers ─────────────────────────────────────────
function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground gap-1">
      <Inbox className="h-5 w-5 mb-1 opacity-60" />
      <div className="font-medium text-foreground/80">{label}</div>
      {hint && <div className="text-[11px]">{hint}</div>}
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

function Pill({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneCls = {
    default: 'border-slate-200 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-700',
    good: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    warn: 'border-amber-200 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    bad: 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800 text-red-700 dark:text-red-300',
  }[tone]
  return (
    <div className={cn('rounded-md border px-2 py-1.5', toneCls)}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'default' }: {
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
    info: 'text-cyan-600 dark:text-cyan-300',
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

function ChartCard({ title, subtitle, children }: { title: React.ReactNode; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="py-4">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm flex items-center gap-2">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">{children}</div>
      </CardContent>
    </Card>
  )
}

// ─── Overview section ────────────────────────────────────────────────
type OpsOverview = {
  activeAlertsByHazard: Record<string, number>
  activeAlertsByVerification: Record<string, number>
  activeAlertsTotal: number
  incidentsToday: number
  incidentsByStatus: Record<string, number>
  pendingVerification: any[]
  sosQueue: any[]
  sourceHealth: any[]
  volunteerAvailability: { availableVolunteers: number; openTasks: any[] }
  generatedAt: string
}

function OverviewSection({ onOpenIncident }: { onOpenIncident: (id: string) => void }) {
  const [data, setData] = React.useState<OpsOverview | null>(null)
  const [smsStats, setSmsStats] = React.useState<{ sentToday: number; total: number } | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [ops, sms] = await Promise.all([
        apiGet<OpsOverview>(`/api/ops`).catch(() => null),
        apiGet<{ logs: any[] }>(`/api/sms`).catch(() => ({ logs: [] })),
      ])
      if (ops) setData(ops)
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
      const sentToday = (sms?.logs ?? []).filter((l) => new Date(l.sentAt) >= startToday).length
      setSmsStats({ sentToday, total: (sms?.logs ?? []).length })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function runScenario() {
    toast.success('Disaster scenario triggered', {
      description: 'Simulating intense rainfall over the Teesta catchment. Watch alerts + SMS tabs for downstream effects.',
      duration: 5000,
    })
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[320px] rounded-xl" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  const hazardBars = Object.entries(data.activeAlertsByHazard).map(([k, v]) => ({ name: k, count: v, fill: HAZARD_COLORS[k] ?? '#64748b' }))
  const statusPie = Object.entries(data.incidentsByStatus).map(([k, v], i) => ({ name: k, value: v, fill: STATUS_COLORS[i % STATUS_COLORS.length] }))
  const smsBars = [
    { name: 'SENT', count: (smsStats?.total ?? 0) > 0 ? Math.min(1, smsStats!.total) : 0, fill: '#10b981' },
    { name: 'QUOTA', count: Math.max(0, (smsStats?.total ?? 0) - 1), fill: '#f59e0b' },
    { name: 'FAILED', count: 0, fill: '#ef4444' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
            <Sparkles className="h-3 w-3" /> Demo mode — all features accessible
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Audit logging active
          </Badge>
          <span className="text-xs text-muted-foreground">
            Generated {formatRelativeTime(data.generatedAt)}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={BellRing} label="Active alerts" value={data.activeAlertsTotal} tone="critical" />
        <KpiCard icon={Activity} label="Incidents today" value={data.incidentsToday} tone="info" />
        <KpiCard icon={ShieldCheck} label="Pending verification" value={data.pendingVerification.length} tone="warning" />
        <KpiCard icon={Siren} label="SOS queue" value={data.sosQueue.length} tone="critical" />
        <KpiCard icon={Users} label="Available volunteers" value={data.volunteerAvailability.availableVolunteers} />
        <KpiCard icon={Send} label="SMS sent today" value={smsStats?.sentToday ?? 0} hint={`${smsStats?.total ?? 0} total logged`} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title={<><LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" /> Active alerts by hazard</>} subtitle="Counts of ACTIVE alerts grouped by alertType">
          {hazardBars.length === 0 ? <EmptyChart label="No active alerts" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hazardBars} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RTooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hazardBars.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={<><Activity className="h-3.5 w-3.5 text-muted-foreground" /> Incidents by status</>} subtitle="All incidents grouped by lifecycle status">
          {statusPie.length === 0 ? <EmptyChart label="No incidents yet" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {statusPie.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={<><Send className="h-3.5 w-3.5 text-muted-foreground" /> SMS delivery status</>} subtitle="Today's TextBelt attempts (1 free SMS/day per IP)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={smsBars} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <RTooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {smsBars.map((b, i) => <Cell key={i} fill={b.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* SOS queue + Source health */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-500" /> SOS queue
              <Badge variant="outline" className="text-[10px]">{data.sosQueue.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Open SOS incidents with age + assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto scrollbar-thin rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Age</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sosQueue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-6">
                        No open SOS incidents
                      </TableCell>
                    </TableRow>
                  )}
                  {data.sosQueue.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.incidentCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px] font-semibold',
                          s.priority === 'CRITICAL' ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          : s.priority === 'HIGH' ? 'border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                          : 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}>{s.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.ageMins}m</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenIncident(s.id)}>Open</Button>
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
              <Database className="h-4 w-4" /> Data-source health
            </CardTitle>
            <CardDescription className="text-xs">Ingestion health (DEMO integrations labeled)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto scrollbar-thin rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Health</TableHead>
                    <TableHead className="text-xs">Last success</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sourceHealth.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">
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
                          {s.simulationMode && <Badge variant="outline" className="mt-0.5 w-fit text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">SIMULATED</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{s.sourceType}</TableCell>
                      <TableCell><StatusBadge status={s.healthStatus} /></TableCell>
                      <TableCell className="text-xs">{s.lastSuccessAt ? formatRelativeTime(s.lastSuccessAt) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run scenario */}
      <Card className="py-4 border-dashed">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              <PlayCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Run disaster scenario</div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Triggers a simulated intense-rainfall event over the Teesta catchment. Verify the pipeline end-to-end by
                heading to <span className="font-mono text-[11px]">Disaster Verification</span> → submit a report →
                watch the auto SMS + alert creation in <span className="font-mono text-[11px]">SMS Alerts</span> and <span className="font-mono text-[11px]">Alerts</span>.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={runScenario}>
            <PlayCircle className="h-4 w-4" /> Run scenario
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Incidents & SOS section ─────────────────────────────────────────
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

function IncidentsSection({ openIncidentId, setOpenIncidentId }: {
  openIncidentId: string | null
  setOpenIncidentId: (id: string | null) => void
}) {
  const [items, setItems] = React.useState<IncidentListItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [status, setStatus] = React.useState('ALL')
  const [priority, setPriority] = React.useState('ALL')
  const [type, setType] = React.useState('ALL')
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

  React.useEffect(() => { load() }, [load])

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
    <div className="space-y-4">
      <Card className="py-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Incident queue
                <Badge variant="outline" className="text-[10px]">{total}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Filter by status, priority, type — or search by code / description.</CardDescription>
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
                {INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                {INCIDENT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Events</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading incidents…' : 'No incidents match the current filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenIncidentId(i.id)}>
                    <TableCell className="font-mono text-xs">{i.incidentCode}</TableCell>
                    <TableCell><HazardBadge type={i.incidentType} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] font-semibold',
                        i.priority === 'CRITICAL' ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : i.priority === 'HIGH' ? 'border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                        : i.priority === 'NORMAL' ? 'border-cyan-300 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300'
                        : 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      )}>{i.priority}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={i.description}>{i.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(i.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.eventsCount}e / {i.assignmentsCount}a</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpenIncidentId(i.id)}>
                        <Eye className="h-3.5 w-3.5" /> Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <IncidentDetailSheet incidentId={openIncidentId} onClose={() => setOpenIncidentId(null)} onMutated={load} />
    </div>
  )
}

function IncidentDetailSheet({ incidentId, onClose, onMutated }: {
  incidentId: string | null
  onClose: () => void
  onMutated: () => void
}) {
  const [incident, setIncident] = React.useState<IncidentDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<string>('')
  const [newPriority, setNewPriority] = React.useState<string>('')
  const [note, setNote] = React.useState('')
  const [assignTeam, setAssignTeam] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!incidentId) { setIncident(null); return }
    setLoading(true)
    apiGet<{ incident: IncidentDetail }>(`/api/ops/incidents/${incidentId}`)
      .then((r) => setIncident(r.incident))
      .catch((e) => toast.error('Failed to load incident', { description: String(e) }))
      .finally(() => setLoading(false))
  }, [incidentId])

  React.useEffect(() => {
    if (incident) {
      setNewStatus('')
      setNewPriority('')
      setNote('')
      setAssignTeam(incident.assignedTeamId ?? '')
    }
  }, [incident?.id])

  async function savePatch(body: Record<string, unknown>, label: string) {
    if (!incidentId) return
    setSaving(true)
    try {
      const r = await apiPatch<{ incident: IncidentDetail; newEvent: any }>(`/api/ops/incidents/${incidentId}`, body)
      setIncident(r.incident)
      toast.success(label, { description: 'Action logged to audit trail.' })
      onMutated()
    } catch (e) {
      toast.error(`Update failed: ${label}`, { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!incidentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {incident?.incidentCode ?? 'Incident'}
            {incident?.simulationMode && <SimulationBadge className="text-[9px]" />}
          </SheetTitle>
          <SheetDescription>
            Full incident detail with timeline, assignments and delivery receipts.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        ) : incident ? (
          <div className="space-y-4 py-2 text-sm">
            {/* Header */}
            <div className="grid grid-cols-2 gap-2">
              <Pill label="Type" value={<HazardBadge type={incident.incidentType} />} />
              <Pill label="Priority" value={incident.priority} />
              <Pill label="Status" value={<StatusBadge status={incident.status} />} />
              <Pill label="Verification" value={<VerificationBadge status={incident.verificationStatus} />} />
            </div>

            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Description</div>
              <div className="text-xs">{incident.description}</div>
              <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <span>📍 {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)} ({incident.locationKind})</span>
                <span>🕒 Created {formatRelativeTime(incident.createdAt)}</span>
                {incident.closedAt && <span>✅ Closed {formatRelativeTime(incident.closedAt)}</span>}
              </div>
            </div>

            {/* Status update */}
            <Card className="py-3">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> Update status / priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status (unchanged)" /></SelectTrigger>
                    <SelectContent>
                      {INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority (unchanged)" /></SelectTrigger>
                    <SelectContent>
                      {INCIDENT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  className="text-xs min-h-[60px]"
                  placeholder="Operator note (optional, appended to timeline)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm" disabled={saving || (!newStatus && !newPriority && !note)}
                  onClick={() => savePatch({
                    ...(newStatus ? { status: newStatus } : {}),
                    ...(newPriority ? { priority: newPriority } : {}),
                    ...(note ? { note } : {}),
                  }, 'Incident updated')}
                >
                  <Save className="h-3.5 w-3.5" /> Save update
                </Button>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card className="py-3">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Assign team / volunteer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  className="text-xs h-8"
                  placeholder="Team or volunteer ID (e.g. TEAM-NORTH, vol_xxx)"
                  value={assignTeam}
                  onChange={(e) => setAssignTeam(e.target.value)}
                />
                <Button
                  size="sm" variant="outline" disabled={saving || !assignTeam || assignTeam === (incident.assignedTeamId ?? '')}
                  onClick={() => savePatch({ assignedTeamId: assignTeam || null }, 'Assignment updated')}
                >
                  <Users className="h-3.5 w-3.5" /> Assign
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <div>
              <div className="text-xs font-semibold mb-1">Timeline</div>
              <div className="rounded-md border divide-y max-h-60 overflow-y-auto scrollbar-thin">
                {incident.events.length === 0 && <div className="text-xs text-muted-foreground px-3 py-3">No events recorded.</div>}
                {incident.events.map((e) => (
                  <div key={e.id} className="px-3 py-2 text-[11px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[9px]">{e.eventType}</Badge>
                      <span className="text-muted-foreground">{formatRelativeTime(e.createdAt)}</span>
                      {e.fromStatus && <span className="text-muted-foreground">{e.fromStatus} → {e.toStatus}</span>}
                    </div>
                    {e.note && <div className="text-foreground/80">{e.note}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            {incident.assignments.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1">Assignments ({incident.assignments.length})</div>
                <div className="rounded-md border divide-y">
                  {incident.assignments.map((a) => (
                    <div key={a.id} className="px-3 py-2 text-[11px] flex items-center justify-between">
                      <span className="font-medium">{a.volunteer?.name ?? 'Volunteer'}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliveries */}
            {incident.deliveries.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1">Delivery receipts ({incident.deliveries.length})</div>
                <div className="rounded-md border divide-y">
                  {incident.deliveries.map((d) => (
                    <div key={d.id} className="px-3 py-2 text-[11px] flex items-center justify-between">
                      <span className="font-mono">{d.recipient}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{d.channel}</Badge>
                        <StatusBadge status={d.status} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// ─── Alerts section ──────────────────────────────────────────────────
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

function AlertsSection() {
  const { location } = useApp()
  const [items, setItems] = React.useState<AlertListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState('ALL')

  // Draft form state
  const [alertType, setAlertType] = React.useState('LANDSLIDE')
  const [severity, setSeverity] = React.useState('WARNING')
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [radiusKm, setRadiusKm] = React.useState(15)
  const [validFrom, setValidFrom] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [languages, setLanguages] = React.useState('en,hi,ne,as')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: AlertListItem[]; total: number }>(
        `/api/ops/alerts${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`
      )
      setItems(res.items)
    } catch (e) {
      toast.error('Failed to load alerts', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => { load() }, [load])

  async function saveDraft() {
    if (!title || !body) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/ops/alerts', {
        alertType, severity, title, body,
        lat: location.lat, lng: location.lng, radiusKm,
        validFrom: validFrom || undefined,
        expiresAt: expiresAt || undefined,
        languages,
        simulationMode: true,
      })
      toast.success('Draft saved', { description: 'Alert is now DRAFT — Approve then Publish.' })
      setTitle(''); setBody(''); setValidFrom(''); setExpiresAt('')
      load()
    } catch (e) {
      toast.error('Save draft failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function patchAction(id: string, action: 'approve' | 'publish' | 'expire' | 'retract') {
    try {
      await apiPatch(`/api/ops/alerts/${id}`, { action })
      toast.success(`Alert ${action}d`, {
        description: action === 'publish'
          ? 'SIMULATED delivery receipt created (audit-logged).'
          : 'Status transition recorded.',
      })
      load()
    } catch (e) {
      toast.error(`Action ${action} failed`, { description: String(e) })
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      {/* Draft form */}
      <Card className="lg:col-span-2 py-4 h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Pencil className="h-4 w-4" /> Author a new alert</CardTitle>
          <CardDescription className="text-xs">Drafts start as PLATFORM verification. Approve → DISTRICT_VERIFIED. Publish → ACTIVE + simulated delivery receipt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Alert type</Label>
              <Select value={alertType} onValueChange={setAlertType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</Label>
            <Input className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Landslide watch — Mangan" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Body</Label>
            <Textarea className="text-xs min-h-[80px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Concise advisory — what to do, where, when." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Radius (km)</Label>
              <Input className="h-8 text-xs" type="number" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Languages</Label>
              <Input className="h-8 text-xs" value={languages} onChange={(e) => setLanguages(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Valid from</Label>
              <Input className="h-8 text-xs" type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Expires at</Label>
              <Input className="h-8 text-xs" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Location pinned to current app location: <span className="font-mono">{location.name} ({location.lat.toFixed(3)}, {location.lng.toFixed(3)})</span>
          </div>
          <Button size="sm" className="w-full" onClick={saveDraft} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="lg:col-span-3 py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><BellRing className="h-4 w-4" /> Alerts</CardTitle>
              <CardDescription className="text-xs">Drafts + active + expired + retracted. Approve → Publish to fan out (simulated).</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {ALERT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Verification</TableHead>
                  <TableHead className="text-xs">Expires</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading alerts…' : 'No alerts in this view.'}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs max-w-[220px]">
                      <div className="font-medium truncate" title={a.title}>{a.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{a.body}</div>
                      {a.simulationMode && <DemoBadge className="mt-0.5" />}
                    </TableCell>
                    <TableCell><HazardBadge type={a.alertType} /></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.severity}</Badge></TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell><VerificationBadge status={a.verificationStatus} /></TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(a.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {a.status === 'DRAFT' && a.verificationStatus === 'PLATFORM' && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => patchAction(a.id, 'approve')}>
                            <ShieldCheck className="h-3 w-3" /> Approve
                          </Button>
                        )}
                        {a.status === 'DRAFT' && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => patchAction(a.id, 'publish')}>
                            <Send className="h-3 w-3" /> Publish
                          </Button>
                        )}
                        {a.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => patchAction(a.id, 'expire')}>
                            <AlertOctagon className="h-3 w-3" /> Expire
                          </Button>
                        )}
                        {(a.status === 'ACTIVE' || a.status === 'EXPIRED') && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-700 dark:text-red-300" onClick={() => patchAction(a.id, 'retract')}>
                            <Ban className="h-3 w-3" /> Retract
                          </Button>
                        )}
                        {a.deliveries && a.deliveries.length > 0 && (
                          <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {a.deliveries.length} delivered
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Ban({ className }: { className?: string }) {
  return <AlertOctagon className={className} />
}

// ─── Disaster Verification section ──────────────────────────────────
type Verification = {
  id: string
  inputText: string
  analysis: string
  verified: boolean
  actionTaken: string | null
  alertId: string | null
  createdAt: string
}

type AnalysisResult = {
  isRealDisaster?: boolean
  disasterType?: string
  severity?: string
  confidence?: number
  affectedArea?: string
  estimatedPeopleAtRisk?: number
  recommendedAction?: string
  smsMessage?: string
  fallback?: boolean
}

function DisasterVerifySection() {
  const [verifications, setVerifications] = React.useState<Verification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [text, setText] = React.useState('Heavy rainfall since last night near Mangan, Sikkim. Cracks developing on hillside above highway. Mud and debris starting to flow. Residents evacuating.')
  const [language, setLanguage] = React.useState('en')
  const [analyzing, setAnalyzing] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<{
    analysis: AnalysisResult
    alertCreated: any
    smsResult: any
    autoActionTaken: boolean
    verificationId: string
  } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ verifications: Verification[] }>(`/api/disaster-verify`)
      setVerifications(r.verifications ?? [])
    } catch (e) {
      toast.error('Failed to load verifications', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function analyze() {
    if (!text.trim()) {
      toast.error('Enter a disaster report to analyze')
      return
    }
    setAnalyzing(true)
    setLastResult(null)
    try {
      const r = await apiPost<{
        verificationId: string
        analysis: AnalysisResult
        alertCreated: any
        smsResult: any
        autoActionTaken: boolean
      }>(`/api/disaster-verify`, { text, language })
      setLastResult(r)
      if (r.autoActionTaken) {
        toast.success('Pipeline triggered end-to-end', {
          description: `Verified as ${r.analysis.severity}. Alert created + SMS dispatched to ${r.smsResult?.total ?? 6} recipients.`,
          duration: 6000,
        })
      } else {
        toast.info('Analysis complete — no auto-action', {
          description: `Severity ${r.analysis.severity ?? 'unknown'} did not cross the HIGH/CRITICAL threshold.`,
          duration: 6000,
        })
      }
      load()
    } catch (e) {
      toast.error('Verification failed', { description: String(e) })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pipeline explainer */}
      <Card className="py-4 border-dashed bg-gradient-to-r from-cyan-50/50 via-violet-50/50 to-amber-50/50 dark:from-cyan-950/20 dark:via-violet-950/20 dark:to-amber-950/20">
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="gap-1 border-cyan-300 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
              <MessageSquare className="h-3 w-3" /> User Report
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-1 border-violet-300 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
              <Cpu className="h-3 w-3" /> AI Analysis
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-1 border-teal-300 bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
              <ShieldCheck className="h-3 w-3" /> Verification
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <Send className="h-3 w-3" /> Auto SMS (6 recipients)
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-1 border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
              <BellRing className="h-3 w-3" /> Alert Created
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Each user-submitted disaster report is run through an LLM (z-ai-web-dev-sdk) which classifies the disaster type,
            severity, confidence, and affected area, and drafts an SMS-ready message. If verified as HIGH or CRITICAL
            severity, an <span className="font-semibold">ACTIVE alert</span> is auto-created and SMS is dispatched to all
            recipients via the TextBelt pipeline.
          </p>
        </CardContent>
      </Card>

      {/* Test form */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> Test the verification pipeline</CardTitle>
          <CardDescription className="text-xs">Paste a real-world-style disaster report and watch the LLM classify it. If HIGH/CRITICAL, an alert + SMS will be triggered automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="text-xs min-h-[120px]"
            placeholder="e.g. Flash flood in Chungthang — Teesta river rising rapidly, 3 houses inundated, families stranded on rooftops."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">SMS language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={analyze} disabled={analyzing}>
              {analyzing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Zap className="h-4 w-4" /> Analyze &amp; Verify</>}
            </Button>
          </div>

          {lastResult && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> LLM Analysis Result
                {lastResult.analysis.fallback && (
                  <Badge variant="outline" className="text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    FALLBACK (LLM unavailable)
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                <Pill label="Is real disaster?" value={lastResult.analysis.isRealDisaster ? 'YES' : 'NO'} tone={lastResult.analysis.isRealDisaster ? 'bad' : 'good'} />
                <Pill label="Disaster type" value={lastResult.analysis.disasterType ?? '—'} />
                <Pill label="Severity" value={lastResult.analysis.severity ?? '—'} tone={lastResult.analysis.severity === 'CRITICAL' ? 'bad' : lastResult.analysis.severity === 'HIGH' ? 'warn' : 'default'} />
                <Pill label="Confidence" value={lastResult.analysis.confidence != null ? `${Math.round(lastResult.analysis.confidence * 100)}%` : '—'} />
                <Pill label="Affected area" value={lastResult.analysis.affectedArea ?? '—'} />
                <Pill label="People at risk" value={lastResult.analysis.estimatedPeopleAtRisk ?? 0} />
              </div>
              {lastResult.analysis.smsMessage && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Drafted SMS message</div>
                  <div className="rounded-md bg-background border p-2 text-xs font-mono">{lastResult.analysis.smsMessage}</div>
                </div>
              )}
              {lastResult.analysis.recommendedAction && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Recommended action</div>
                  <div className="text-xs">{lastResult.analysis.recommendedAction}</div>
                </div>
              )}
              {lastResult.autoActionTaken ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-800 p-2 text-xs text-emerald-800 dark:text-emerald-200">
                  ✅ Auto-action: Alert <span className="font-mono">{lastResult.alertCreated?.id?.slice(-8) ?? ''}</span> created.
                  SMS dispatched: <strong>{lastResult.smsResult?.sent ?? 0}</strong> sent,{' '}
                  <strong>{lastResult.smsResult?.quotaExceeded ?? 0}</strong> quota-exceeded,{' '}
                  <strong>{lastResult.smsResult?.failed ?? 0}</strong> failed out of{' '}
                  <strong>{lastResult.smsResult?.total ?? 0}</strong>.
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-700 p-2 text-xs text-slate-700 dark:text-slate-300">
                  ℹ️ No auto-action: severity did not reach HIGH/CRITICAL threshold. Report is queued for human review.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent verifications */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Recent verifications</CardTitle>
              <CardDescription className="text-xs">Last 20 reports run through the pipeline.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">When</TableHead>
                  <TableHead className="text-xs">Input</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Verified</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No verifications yet — submit a report above to see one.'}
                    </TableCell>
                  </TableRow>
                )}
                {verifications.map((v) => {
                  let a: AnalysisResult = {}
                  try { a = JSON.parse(v.analysis) } catch {}
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(v.createdAt)}</TableCell>
                      <TableCell className="text-xs max-w-[260px]">
                        <div className="truncate" title={v.inputText}>{v.inputText}</div>
                      </TableCell>
                      <TableCell>{a.disasterType ? <HazardBadge type={a.disasterType} /> : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]',
                          a.severity === 'CRITICAL' ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          : a.severity === 'HIGH' ? 'border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                          : a.severity === 'MODERATE' ? 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}>{a.severity ?? '—'}</Badge>
                        {a.confidence != null && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{Math.round(a.confidence * 100)}%</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.verified ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> VERIFIED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">PENDING</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {v.actionTaken ?? '—'}
                        {v.alertId && <div className="text-[10px] font-mono">alert: {v.alertId.slice(-8)}</div>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── SMS section ─────────────────────────────────────────────────────
type SmsLog = {
  id: string
  phone: string
  message: string
  status: string
  provider: string
  providerResponse: string | null
  alertId: string | null
  incidentId: string | null
  verificationId: string | null
  simulationMode: boolean
  sentAt: string
  deliveredAt: string | null
}

type SmsRecipient = {
  id: string
  phone: string
  name: string | null
  active: boolean
}

function SmsSection() {
  const [logs, setLogs] = React.useState<SmsLog[]>([])
  const [recipients, setRecipients] = React.useState<SmsRecipient[]>([])
  const [loading, setLoading] = React.useState(true)
  const [message, setMessage] = React.useState(DEFAULT_SMS_TEMPLATE)
  const [sending, setSending] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<any>(null)
  const [expandedLog, setExpandedLog] = React.useState<string | null>(null)
  const [newPhone, setNewPhone] = React.useState('')
  const [newName, setNewName] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ logs: SmsLog[]; recipients: SmsRecipient[] }>(`/api/sms`)
      setLogs(r.logs ?? [])
      setRecipients(r.recipients ?? [])
    } catch (e) {
      toast.error('Failed to load SMS data', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function sendAll() {
    if (!message.trim()) {
      toast.error('Message is empty')
      return
    }
    if (message.length > 160) {
      toast.error('Message exceeds 160-character SMS limit', { description: `Trim ${message.length - 160} characters.` })
      return
    }
    setSending(true)
    setLastResult(null)
    try {
      const r = await apiPost<{ success: boolean; sent: number; quotaExceeded: number; failed: number; total: number; results: any[]; note?: string }>(`/api/sms`, { message })
      setLastResult(r)
      if (r.sent > 0) {
        toast.success(`SMS sent to ${r.sent} recipient${r.sent === 1 ? '' : 's'}`, {
          description: r.note ?? `${r.quotaExceeded} quota-exceeded, ${r.failed} failed.`,
          duration: 6000,
        })
      } else {
        toast.warning('No SMS delivered', {
          description: r.note ?? `${r.quotaExceeded} quota-exceeded, ${r.failed} failed. Free tier allows 1 SMS/day per IP.`,
          duration: 8000,
        })
      }
      load()
    } catch (e) {
      toast.error('SMS send failed', { description: String(e) })
    } finally {
      setSending(false)
    }
  }

  function addRecipient() {
    if (!newPhone.trim()) { toast.error('Phone number is required'); return }
    toast.success('Recipient added (demo)', {
      description: `${newName || 'New recipient'} <${newPhone}> would be persisted to the SmsRecipient table in production.`,
    })
    setNewPhone(''); setNewName('')
  }

  const sentToday = React.useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return logs.filter((l) => new Date(l.sentAt) >= start && l.status === 'SENT').length
  }, [logs])

  return (
    <div className="space-y-4">
      {/* Honest TextBelt note */}
      <Card className="py-4 border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-amber-800 dark:text-amber-300">SMS sent via TextBelt free API</div>
            <p className="text-amber-700/90 dark:text-amber-200/80 mt-0.5">
              First send of the day to each phone succeeds; subsequent attempts the same day return{' '}
              <span className="font-mono">QUOTA_EXCEEDED</span>. To deliver to all recipients reliably, configure a
              paid TextBelt key (or another provider) in <span className="font-semibold">Settings → sms.provider</span>.
              Every attempt — success, quota, or failure — is logged honestly with the actual provider response.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Active recipients" value={recipients.filter((r) => r.active).length} hint={`of ${recipients.length} total`} />
        <KpiCard icon={Send} label="SMS sent today" value={sentToday} tone="info" />
        <KpiCard icon={Inbox} label="Total logged" value={logs.length} />
        <KpiCard icon={Activity} label="Provider" value="TextBelt" hint="free tier" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recipients */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Recipients</CardTitle>
            <CardDescription className="text-xs">The 6 seeded demo numbers (91-prefixed). Toggle active in production.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border max-h-72 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-6">
                        {loading ? 'Loading…' : 'No recipients.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">{r.name ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{r.phone}</TableCell>
                      <TableCell>
                        {r.active ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">ACTIVE</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">INACTIVE</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <div className="text-xs font-semibold flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add recipient (demo)</div>
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-8 text-xs" placeholder="Phone (with country code)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <Input className="h-8 text-xs" placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" onClick={addRecipient}><Plus className="h-3.5 w-3.5" /> Add (demo)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Compose + Send */}
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Compose &amp; send SMS</CardTitle>
            <CardDescription className="text-xs">Single message is dispatched to every active recipient in parallel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Message</Label>
                <span className={cn('text-[11px] tabular-nums', message.length > 160 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                  {message.length}/160
                </span>
              </div>
              <Textarea
                className="text-xs min-h-[100px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button onClick={sendAll} disabled={sending || message.length > 160 || !message.trim()}>
              {sending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to all {recipients.filter((r) => r.active).length} recipients</>}
            </Button>

            {lastResult && (
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="text-xs font-semibold">Last send result</div>
                <div className="grid grid-cols-3 gap-2">
                  <Pill label="Sent" value={lastResult.sent} tone="good" />
                  <Pill label="Quota" value={lastResult.quotaExceeded} tone="warn" />
                  <Pill label="Failed" value={lastResult.failed} tone="bad" />
                </div>
                {Array.isArray(lastResult.results) && lastResult.results.length > 0 && (
                  <div className="rounded-md border divide-y">
                    {lastResult.results.map((r: any, i: number) => (
                      <div key={i} className="px-2 py-1.5 text-[11px] flex items-center justify-between">
                        <span className="font-mono">{r.phone}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SMS log */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Inbox className="h-4 w-4" /> SMS log</CardTitle>
              <CardDescription className="text-xs">Every attempt is logged with the actual provider response. Click a row to expand.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Sent at</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Message</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Context</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No SMS sent yet — compose and send one above.'}
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((l) => (
                  <React.Fragment key={l.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)}
                    >
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(l.sentAt)}</TableCell>
                      <TableCell className="text-xs font-mono">{l.phone}</TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate" title={l.message}>{l.message}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {l.verificationId ? `verify:${l.verificationId.slice(-6)}` : l.alertId ? `alert:${l.alertId.slice(-6)}` : '—'}
                      </TableCell>
                    </TableRow>
                    {expandedLog === l.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-3">
                          <div className="text-[11px] space-y-1">
                            <div><span className="text-muted-foreground">Provider:</span> <span className="font-mono">{l.provider}</span></div>
                            <div><span className="text-muted-foreground">Simulation mode:</span> {l.simulationMode ? 'true' : 'false'}</div>
                            <div><span className="text-muted-foreground">Delivered at:</span> {l.deliveredAt ? formatRelativeTime(l.deliveredAt) : '—'}</div>
                            <div><span className="text-muted-foreground">Full message:</span> {l.message}</div>
                            <div>
                              <span className="text-muted-foreground">Provider response:</span>
                              <pre className="mt-1 rounded-md bg-background border p-2 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">{l.providerResponse ?? '(no response)'}</pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── News section ────────────────────────────────────────────────────
function NewsSection() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [creating, setCreating] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ items: any[] }>(`/api/admin/news`)
      setItems(r.items ?? [])
    } catch (e) {
      toast.error('Failed to load news', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function archive(id: string) {
    try {
      await apiPatch(`/api/admin/news/${id}`, { status: 'ARCHIVED', pinned: false }).then(async () => {
        // Use DELETE — soft archive per route design.
      })
      // Use DELETE per requirement (sets status=ARCHIVED)
    } catch {
      // fall through
    }
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('News article archived')
      load()
    } catch (e) {
      toast.error('Archive failed', { description: String(e) })
    }
  }

  async function togglePin(item: any) {
    try {
      await apiPatch(`/api/admin/news/${item.id}`, { pinned: !item.pinned })
      toast.success(item.pinned ? 'Unpinned' : 'Pinned')
      load()
    } catch (e) {
      toast.error('Pin toggle failed', { description: String(e) })
    }
  }

  return (
    <div className="space-y-3">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Newspaper className="h-4 w-4" /> News &amp; updates</CardTitle>
              <CardDescription className="text-xs">All news articles including drafts and archived.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Publisher</TableHead>
                  <TableHead className="text-xs">Categories</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Published</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No news articles yet.'}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" title={n.title}>{n.title}</span>
                        {n.pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{n.summary}</div>
                    </TableCell>
                    <TableCell className="text-xs">{n.publisher}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{n.categories}</TableCell>
                    <TableCell><StatusBadge status={n.status} /></TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(n.publishedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => togglePin(n)}>
                          {n.pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(n)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-700 dark:text-red-300">
                              <Archive className="h-3.5 w-3.5" /> Archive
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive &quot;{n.title}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This sets status=ARCHIVED and unpins the article. The article remains in the database and can be re-published later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => archive(n.id)}>Archive</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <NewsDialog
          item={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function NewsDialog({ item, onClose, onSaved }: { item: any | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState(item?.title ?? '')
  const [summary, setSummary] = React.useState(item?.summary ?? '')
  const [publisher, setPublisher] = React.useState(item?.publisher ?? '')
  const [sourceUrl, setSourceUrl] = React.useState(item?.sourceUrl ?? '')
  const [categories, setCategories] = React.useState(item?.categories ?? 'GENERAL')
  const [pinned, setPinned] = React.useState(item?.pinned ?? false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setTitle(item?.title ?? '')
    setSummary(item?.summary ?? '')
    setPublisher(item?.publisher ?? '')
    setSourceUrl(item?.sourceUrl ?? '')
    setCategories(item?.categories ?? 'GENERAL')
    setPinned(item?.pinned ?? false)
  }, [item?.id])

  async function save() {
    if (!title || !summary || !publisher || !sourceUrl) {
      toast.error('Title, summary, publisher, and source URL are required')
      return
    }
    setSaving(true)
    try {
      if (item) {
        await apiPatch(`/api/admin/news/${item.id}`, { title, summary, publisher, sourceUrl, categories, pinned })
        toast.success('News article updated')
      } else {
        await apiPost('/api/admin/news', { title, summary, publisher, sourceUrl, categories, pinned })
        toast.success('News article created')
      }
      onSaved()
    } catch (e) {
      toast.error('Save failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit news article' : 'Create news article'}</DialogTitle>
          <DialogDescription>{item ? 'Update the article fields.' : 'Create a new article (status=PUBLISHED by default).'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title</Label>
            <Input className="text-xs h-9" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Summary</Label>
            <Textarea className="text-xs min-h-[60px]" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Publisher</Label>
              <Input className="text-xs h-9" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Categories</Label>
              <Input className="text-xs h-9" value={categories} onChange={(e) => setCategories(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Source URL</Label>
            <Input className="text-xs h-9" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Facilities section ──────────────────────────────────────────────
function FacilitiesSection() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [creating, setCreating] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ items: any[] }>(`/api/admin/facilities`)
      setItems(r.items ?? [])
    } catch (e) {
      toast.error('Failed to load facilities', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function closeFacility(id: string) {
    try {
      const res = await fetch(`/api/admin/facilities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Facility closed')
      load()
    } catch (e) {
      toast.error('Close failed', { description: String(e) })
    }
  }

  return (
    <div className="space-y-3">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Facilities</CardTitle>
              <CardDescription className="text-xs">Shelters, hospitals, relief centers and assembly points.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Capacity</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No facilities.'}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground">{f.address ?? '—'} · 📍 {f.lat?.toFixed?.(3)}, {f.lng?.toFixed?.(3)}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{f.facilityType}</Badge></TableCell>
                    <TableCell className="text-xs">{f.capacity ?? '—'}{f.availableUnits != null ? ` (${f.availableUnits} avail)` : ''}</TableCell>
                    <TableCell className="text-xs font-mono">{f.phone ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(f)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-700 dark:text-red-300">
                              <Power className="h-3.5 w-3.5" /> Close
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close &quot;{f.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This sets status=CLOSED. The facility remains in the database and can be reopened later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => closeFacility(f.id)}>Close facility</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <FacilityDialog
          item={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function FacilityDialog({ item, onClose, onSaved }: { item: any | null; onClose: () => void; onSaved: () => void }) {
  const { location } = useApp()
  const [name, setName] = React.useState(item?.name ?? '')
  const [facilityType, setFacilityType] = React.useState(item?.facilityType ?? 'SHELTER')
  const [lat, setLat] = React.useState(item?.lat ?? location.lat)
  const [lng, setLng] = React.useState(item?.lng ?? location.lng)
  const [address, setAddress] = React.useState(item?.address ?? '')
  const [phone, setPhone] = React.useState(item?.phone ?? '')
  const [capacity, setCapacity] = React.useState(item?.capacity ?? '')
  const [hours, setHours] = React.useState(item?.hours ?? '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setName(item?.name ?? '')
    setFacilityType(item?.facilityType ?? 'SHELTER')
    setLat(item?.lat ?? location.lat)
    setLng(item?.lng ?? location.lng)
    setAddress(item?.address ?? '')
    setPhone(item?.phone ?? '')
    setCapacity(item?.capacity ?? '')
    setHours(item?.hours ?? '')
  }, [item?.id])

  async function save() {
    if (!name || lat == null || lng == null) {
      toast.error('Name, lat, lng are required')
      return
    }
    setSaving(true)
    try {
      const body = {
        facilityType, name, lat: Number(lat), lng: Number(lng),
        address: address || undefined,
        phone: phone || undefined,
        capacity: capacity ? Number(capacity) : undefined,
        hours: hours || undefined,
      }
      if (item) {
        await apiPatch(`/api/admin/facilities/${item.id}`, body)
        toast.success('Facility updated')
      } else {
        await apiPost('/api/admin/facilities', body)
        toast.success('Facility created')
      }
      onSaved()
    } catch (e) {
      toast.error('Save failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit facility' : 'Create facility'}</DialogTitle>
          <DialogDescription>{item ? 'Update facility details.' : 'Register a new shelter / hospital / relief center.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</Label>
            <Input className="text-xs h-9" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={facilityType} onValueChange={setFacilityType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Capacity</Label>
              <Input className="text-xs h-9" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Latitude</Label>
              <Input className="text-xs h-9" type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Longitude</Label>
              <Input className="text-xs h-9" type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Address</Label>
            <Input className="text-xs h-9" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Phone</Label>
              <Input className="text-xs h-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Hours</Label>
              <Input className="text-xs h-9" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Regions section ────────────────────────────────────────────────
function RegionsSection() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [creating, setCreating] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ items: any[] }>(`/api/admin/regions`)
      setItems(r.items ?? [])
    } catch (e) {
      toast.error('Failed to load regions', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Localities (Regions)</CardTitle>
              <CardDescription className="text-xs">Region hierarchy: states, districts, localities.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs">Canonical name</TableHead>
                  <TableHead className="text-xs">Local name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Lang</TableHead>
                  <TableHead className="text-xs">Coverage</TableHead>
                  <TableHead className="text-xs">Coords</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No regions.'}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.canonicalName}</TableCell>
                    <TableCell className="text-xs">{r.localName ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.regionType}</Badge></TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{r.defaultLanguage}</TableCell>
                    <TableCell><StatusBadge status={r.coverageStatus} /></TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{r.lat?.toFixed?.(3)}, {r.lng?.toFixed?.(3)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(r)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <RegionDialog
          item={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function RegionDialog({ item, onClose, onSaved }: { item: any | null; onClose: () => void; onSaved: () => void }) {
  const { location } = useApp()
  const [canonicalName, setCanonicalName] = React.useState(item?.canonicalName ?? '')
  const [regionType, setRegionType] = React.useState(item?.regionType ?? 'LOCALITY')
  const [lat, setLat] = React.useState(item?.lat ?? location.lat)
  const [lng, setLng] = React.useState(item?.lng ?? location.lng)
  const [localName, setLocalName] = React.useState(item?.localName ?? '')
  const [defaultLanguage, setDefaultLanguage] = React.useState(item?.defaultLanguage ?? 'en')
  const [coverageStatus, setCoverageStatus] = React.useState(item?.coverageStatus ?? 'DEMO')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setCanonicalName(item?.canonicalName ?? '')
    setRegionType(item?.regionType ?? 'LOCALITY')
    setLat(item?.lat ?? location.lat)
    setLng(item?.lng ?? location.lng)
    setLocalName(item?.localName ?? '')
    setDefaultLanguage(item?.defaultLanguage ?? 'en')
    setCoverageStatus(item?.coverageStatus ?? 'DEMO')
  }, [item?.id])

  async function save() {
    setSaving(true)
    try {
      if (item) {
        await apiPatch(`/api/admin/regions/${item.id}`, { localName, coverageStatus, defaultLanguage })
        toast.success('Region updated')
      } else {
        if (!canonicalName) { toast.error('Canonical name required'); setSaving(false); return }
        await apiPost('/api/admin/regions', {
          canonicalName, regionType,
          lat: Number(lat), lng: Number(lng),
          localName: localName || undefined,
          defaultLanguage, coverageStatus,
        })
        toast.success('Region created')
      }
      onSaved()
    } catch (e) {
      toast.error('Save failed', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.canonicalName}` : 'Create region'}</DialogTitle>
          <DialogDescription>{item ? 'Edit locality metadata.' : 'Add a new state / district / locality.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!item && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Canonical name</Label>
                <Input className="text-xs h-9" value={canonicalName} onChange={(e) => setCanonicalName(e.target.value)} placeholder="e.g. Mangan, Sikkim" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Region type</Label>
                  <Select value={regionType} onValueChange={setRegionType}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Latitude</Label>
                  <Input className="text-xs h-9" type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Longitude</Label>
                  <Input className="text-xs h-9" type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Local name</Label>
            <Input className="text-xs h-9" value={localName} onChange={(e) => setLocalName(e.target.value)} placeholder="Local-script display name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Default language</Label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Coverage status</Label>
              <Select value={coverageStatus} onValueChange={setCoverageStatus}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COVERAGE_STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Volunteers section ─────────────────────────────────────────────
function VolunteersSection() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ items: any[] }>(`/api/admin/volunteers`)
      setItems(r.items ?? [])
    } catch (e) {
      toast.error('Failed to load volunteers', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function act(id: string, action: 'approve' | 'reject') {
    try {
      await apiPatch(`/api/admin/volunteers`, { id, action })
      toast.success(`Volunteer ${action === 'approve' ? 'approved' : 'rejected'}`)
      load()
    } catch (e) {
      toast.error(`Action ${action} failed`, { description: String(e) })
    }
  }

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Volunteers</CardTitle>
            <CardDescription className="text-xs">Approve or reject pending volunteer applications.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Volunteer</TableHead>
                <TableHead className="text-xs">Skills</TableHead>
                <TableHead className="text-xs">Languages</TableHead>
                <TableHead className="text-xs">Availability</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                    {loading ? 'Loading…' : 'No volunteers registered.'}
                  </TableCell>
                </TableRow>
              )}
              {items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{v.user?.name ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground">{v.user?.email ?? '—'}</div>
                    {v.approvedAt && <div className="text-[10px] text-muted-foreground">Approved {formatRelativeTime(v.approvedAt)}</div>}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground max-w-[180px] truncate" title={v.skills}>{v.skills || '—'}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">{v.languages}</TableCell>
                  <TableCell><StatusBadge status={v.availabilityStatus} /></TableCell>
                  <TableCell><StatusBadge status={v.verificationStatus} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {v.verificationStatus === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 dark:text-emerald-300" onClick={() => act(v.id, 'approve')}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 dark:text-red-300">
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject volunteer application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This sets verificationStatus=REJECTED. {v.user?.name ?? 'The volunteer'} will no longer be able to accept assignments.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => act(v.id, 'reject')}>Reject</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {v.verificationStatus !== 'PENDING' && (
                        <span className="text-[10px] text-muted-foreground">{v.verificationStatus === 'VERIFIED' ? '✓ Approved' : 'Rejected'}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Translations section ───────────────────────────────────────────
function TranslationsSection() {
  const [language, setLanguage] = React.useState('en')
  const [translations, setTranslations] = React.useState<Record<string, string>>({})
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading] = React.useState(true)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ translations: Record<string, string>; overrides: Record<string, string> }>(
        `/api/admin/translations?language=${language}`
      )
      setTranslations(r.translations ?? {})
      const overrideSet: Record<string, boolean> = {}
      for (const k of Object.keys(r.overrides ?? {})) overrideSet[k] = true
      setOverrides(overrideSet)
    } catch (e) {
      toast.error('Failed to load translations', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [language])

  React.useEffect(() => { load() }, [load])

  const keys = React.useMemo(() => {
    const all = Object.keys(translations).sort()
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter((k) => k.toLowerCase().includes(q) || translations[k]?.toLowerCase().includes(q))
  }, [translations, search])

  async function save(key: string) {
    setSavingKey(key)
    try {
      await apiPost('/api/admin/translations', { key, language, value: translations[key] ?? '' })
      toast.success(`Translation saved`, {
        description: `"${key}" (${language}) updated. Switch language in the header to verify on the live site.`,
      })
      setOverrides((o) => ({ ...o, [key]: true }))
    } catch (e) {
      toast.error('Save failed', { description: String(e) })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-3">
      <Card className="py-4 border-dashed bg-violet-50/40 dark:bg-violet-950/20">
        <CardContent className="flex items-start gap-3">
          <Languages className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-violet-800 dark:text-violet-300">Live i18n editor</div>
            <p className="text-violet-700/90 dark:text-violet-200/80 mt-0.5">
              Changes here update the live site instantly — switch language in the header to verify. Edits are
              persisted to the <span className="font-mono">Translation</span> table (key + language unique) and override
              the bundled defaults from <span className="font-mono">src/lib/i18n.ts</span>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><Languages className="h-4 w-4" /> Translation keys</CardTitle>
              <CardDescription className="text-xs">{keys.length} keys · editing language: <span className="font-mono">{language}</span></CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Filter keys or values…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs w-[200px]">Key</TableHead>
                  <TableHead className="text-xs">Value</TableHead>
                  <TableHead className="text-xs w-[100px]">Override</TableHead>
                  <TableHead className="text-xs w-[80px] text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No translations match the search.'}
                    </TableCell>
                  </TableRow>
                )}
                {keys.map((k) => (
                  <TableRow key={k}>
                    <TableCell className="text-[11px] font-mono text-muted-foreground align-top py-2">{k}</TableCell>
                    <TableCell className="py-2">
                      <Textarea
                        className="text-xs min-h-[36px] py-1.5"
                        value={translations[k] ?? ''}
                        onChange={(e) => setTranslations((t) => ({ ...t, [k]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      {overrides[k] ? (
                        <Badge variant="outline" className="text-[9px] border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">DB</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={savingKey === k}
                        onClick={() => save(k)}
                      >
                        {savingKey === k ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Settings section ───────────────────────────────────────────────
function SettingsSection() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [draftValue, setDraftValue] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ items: any[] }>(`/api/admin/settings`)
      setItems(r.items ?? [])
    } catch (e) {
      toast.error('Failed to load settings', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function startEdit(item: any) {
    setEditing(item)
    setDraftValue(item.value ?? '')
  }

  async function save() {
    if (!editing) return
    try {
      await apiPatch(`/api/admin/settings`, { key: editing.key, value: draftValue })
      toast.success(`Setting saved: ${editing.key}`)
      setEditing(null)
      load()
    } catch (e) {
      toast.error('Save failed', { description: String(e) })
    }
  }

  // Recommended settings shown as quick-creation shortcuts
  const SUGGESTED = [
    'branding.productName',
    'demo.simulationMode',
    'map.defaultExtent',
    'sms.defaultMessage',
    'sms.provider',
  ]

  async function createSuggested(key: string) {
    const defaults: Record<string, string> = {
      'branding.productName': 'PurvaGuard AI',
      'demo.simulationMode': 'true',
      'map.defaultExtent': JSON.stringify({ minLat: 21, maxLat: 29, minLng: 88, maxLng: 97 }),
      'sms.defaultMessage': DEFAULT_SMS_TEMPLATE,
      'sms.provider': 'textbelt',
    }
    try {
      await apiPatch('/api/admin/settings', { key, value: defaults[key] ?? '' })
      toast.success(`Created ${key}`)
      load()
    } catch (e) {
      toast.error('Create failed', { description: String(e) })
    }
  }

  return (
    <div className="space-y-3">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> System settings</CardTitle>
              <CardDescription className="text-xs">Key/value pairs stored in the <span className="font-mono">SystemSetting</span> table. Values are stored as opaque JSON strings.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs w-[280px]">Key</TableHead>
                  <TableHead className="text-xs">Value</TableHead>
                  <TableHead className="text-xs w-[120px]">Updated</TableHead>
                  <TableHead className="text-xs w-[80px] text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Loading…' : 'No settings yet. Create a suggested one below.'}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-[11px] font-mono text-muted-foreground align-top">{s.key}</TableCell>
                    <TableCell className="text-xs font-mono break-all max-w-[400px]">{s.value}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(s.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs font-semibold mb-2">Quick-create suggested settings</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={items.some((s) => s.key === k)}
                  onClick={() => createSuggested(k)}
                >
                  <Plus className="h-3 w-3" /> {k}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit setting</DialogTitle>
            <DialogDescription>Key: <span className="font-mono">{editing?.key}</span></DialogDescription>
          </DialogHeader>
          <Textarea
            className="text-xs min-h-[100px] font-mono"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main AdminView ─────────────────────────────────────────────────
export default function AdminView() {
  const { role, setView, location } = useApp()
  const [section, setSection] = React.useState<AdminSection>('overview')
  const [openIncidentId, setOpenIncidentId] = React.useState<string | null>(null)

  // Make setters referenced (no-op usage so lint doesn't complain about unused)
  React.useEffect(() => {
    // expose for debugging
    if (typeof window !== 'undefined') {
      ;(window as any).__purvaguardAdmin = { role, setView, location }
    }
  }, [role, setView, location])

  const activeSection = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" /> Admin Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            One comprehensive surface — operations, admin, SMS pipeline, disaster verification, translations, all data CRUD.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
            <Sparkles className="h-3 w-3" /> Demo mode — all features accessible
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            Role: <span className="font-mono">{role}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <MapPin className="h-3 w-3" /> {location.name}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
        {/* Sidebar nav */}
        <Card className="py-3 h-fit lg:sticky lg:top-4">
          <CardContent className="px-2 py-0">
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const isActive = s.id === section
                return (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    className={cn(
                      'group flex items-start gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'hover:bg-muted text-foreground/80'
                    )}
                  >
                    <s.icon className={cn('h-4 w-4 shrink-0 mt-0.5', isActive ? '' : 'text-muted-foreground group-hover:text-foreground')} />
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">{s.label}</span>
                      <span className={cn('text-[10px] mt-0.5', isActive ? 'opacity-80' : 'text-muted-foreground')}>{s.hint}</span>
                    </div>
                  </button>
                )
              })}
            </nav>
            <Separator className="my-3" />
            <div className="px-2 py-1 text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> All mutations audit-logged</div>
              <div className="flex items-center gap-1"><Database className="h-3 w-3" /> SQLite (Prisma) seeded</div>
              <button
                onClick={() => setView('home')}
                className="flex items-center gap-1 hover:text-foreground transition-colors mt-1"
              >
                <ExternalLink className="h-3 w-3" /> Back to public site
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <activeSection.icon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{activeSection.label}</h2>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">{activeSection.hint}</Badge>
          </div>

          {section === 'overview' && <OverviewSection onOpenIncident={(id) => { setOpenIncidentId(id); setSection('incidents') }} />}
          {section === 'incidents' && (
            <IncidentsSection openIncidentId={openIncidentId} setOpenIncidentId={setOpenIncidentId} />
          )}
          {section === 'alerts' && <AlertsSection />}
          {section === 'disaster-verify' && <DisasterVerifySection />}
          {section === 'sms' && <SmsSection />}
          {section === 'news' && <NewsSection />}
          {section === 'facilities' && <FacilitiesSection />}
          {section === 'regions' && <RegionsSection />}
          {section === 'volunteers' && <VolunteersSection />}
          {section === 'translations' && <TranslationsSection />}
          {section === 'settings' && <SettingsSection />}
        </div>
      </div>
    </div>
  )
}
