'use client'

import * as React from 'react'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import {
  DEMO_REGIONS,
  MAP_BOUNDS,
  HAZARD_META,
  projectLatLng,
  formatRelativeTime,
  distanceKm,
  type Severity,
  type HazardType,
} from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SeverityBadge,
  VerificationBadge,
  SimulationBadge,
  StatusBadge,
  HazardBadge,
} from '@/components/shared/badges'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Map as MapIcon,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  LocateFixed,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MapPin,
  Crosshair,
  Compass,
  RotateCcw,
  Activity,
  Radio,
  Clock,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────
type LayerKey = 'incidents' | 'alerts' | 'hazardZones' | 'reports' | 'facilities' | 'regions'

interface FacilityItem {
  id: string
  name: string
  facilityType: string
  lat: number
  lng: number
  status: string
  capacity: number | null
  availableUnits: number | null
}
interface IncidentItem {
  id: string
  incidentCode: string
  incidentType: string
  priority: string
  status: string
  lat: number
  lng: number
  description: string
  createdAt: string
  verificationStatus: string
  simulationMode: boolean
}
interface AlertItem {
  id: string
  title: string
  alertType: string
  severity: string
  verificationStatus: string
  lat: number
  lng: number
  radiusKm: number
  issuedAt: string
  expiresAt: string
  status: string
  simulationMode: boolean
  body?: string
}
interface HazardZoneItem {
  id: string
  name: string
  hazardType: string
  lat: number
  lng: number
  radiusKm: number
  baselineLevel: string
  source: string | null
}
interface ReportItem {
  id: string
  category: string
  description: string
  lat: number
  lng: number
  severity: string
  status: string
  createdAt: string
  verificationStatus: string
}
interface RegionItem {
  id: string
  canonicalName: string
  localName: string | null
  regionType: string
  lat: number
  lng: number
  coverageStatus: string
}

interface MapData {
  selected: { lat: number; lng: number } | null
  facilities: FacilityItem[]
  incidents: IncidentItem[]
  alerts: AlertItem[]
  hazardZones: HazardZoneItem[]
  reports: ReportItem[]
  regions: RegionItem[]
}

type SelectedMarker =
  | { kind: 'incident'; data: IncidentItem }
  | { kind: 'alert'; data: AlertItem }
  | { kind: 'hazardZone'; data: HazardZoneItem }
  | { kind: 'report'; data: ReportItem }
  | { kind: 'facility'; data: FacilityItem }
  | { kind: 'region'; data: RegionItem }

// ── Layer meta ──────────────────────────────────────────────────────
type MarkerShapeKind = 'triangle' | 'hexagon' | 'circle' | 'diamond' | 'square' | 'dot'

interface LayerMeta {
  label: string
  color: string
  ring: string
  shape: MarkerShapeKind
  defaultOn: boolean
}

const LAYER_META: Record<LayerKey, LayerMeta> = {
  incidents: { label: 'Incidents', color: '#dc2626', ring: 'ring-red-500', shape: 'triangle', defaultOn: true },
  alerts: { label: 'Alerts', color: '#ea580c', ring: 'ring-orange-500', shape: 'hexagon', defaultOn: true },
  hazardZones: { label: 'Hazard Zones', color: '#d97706', ring: 'ring-amber-500', shape: 'circle', defaultOn: false },
  reports: { label: 'Community Reports', color: '#2563eb', ring: 'ring-blue-500', shape: 'diamond', defaultOn: false },
  facilities: { label: 'Facilities', color: '#059669', ring: 'ring-emerald-500', shape: 'square', defaultOn: true },
  regions: { label: 'Regions', color: '#475569', ring: 'ring-slate-500', shape: 'dot', defaultOn: false },
}

// ── Marker shape renderer ───────────────────────────────────────────
function MarkerShape({
  shape,
  color,
  size,
}: {
  shape: MarkerShapeKind
  color: string
  size: number
}) {
  const s = size
  switch (shape) {
    case 'triangle':
      return (
        <svg width={s} height={s} viewBox="0 0 16 18" fill="none" aria-hidden>
          <polygon points="8,0 16,16 0,16" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <text x="8" y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">!</text>
        </svg>
      )
    case 'hexagon':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <polygon points="8,0 15,4 15,12 8,16 1,12 1,4" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'circle':
      return (
        <svg width={s} height={s} viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="8" fill={color} stroke="white" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden>
          <polygon points="8,0 16,8 8,16 0,8" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'square':
      return (
        <svg width={s} height={s} viewBox="0 0 16 18" fill="none" aria-hidden>
          <path d="M2 0 L14 0 L14 12 L8 18 L2 12 Z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'dot':
      return (
        <svg width={s} height={s} viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="4.5" fill={color} stroke="white" strokeWidth="1.5" />
        </svg>
      )
  }
}

// ── Marker (single) ─────────────────────────────────────────────────
function MapMarker({
  x,
  y,
  shape,
  color,
  label,
  showLabel,
  size,
  tooltip,
  onClick,
}: {
  x: number
  y: number
  shape: MarkerShapeKind
  color: string
  label: string
  showLabel: boolean
  size: number
  tooltip: string
  onClick: () => void
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="absolute z-20 flex flex-col items-center gap-0.5 outline-none focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            aria-label={label}
          >
            <MarkerShape shape={shape} color={color} size={size} />
            {showLabel && (
              <span
                className="max-w-[120px] truncate rounded-sm bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur"
              >
                {label}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <span className="block whitespace-normal">{tooltip}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── Selected location marker (pulsing blue) ─────────────────────────
function SelectedLocationMarker({
  x,
  y,
  label,
  showLabel,
}: {
  x: number
  y: number
  label: string
  showLabel: boolean
}) {
  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative flex flex-col items-center gap-1">
        <span className="absolute -top-5 h-10 w-10 -translate-x-1/2 left-1/2 rounded-full bg-cyan-500/20 animate-ping" />
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500 ring-2 ring-white shadow-md" />
        </span>
        {showLabel && (
          <span className="pointer-events-auto whitespace-nowrap rounded-sm bg-cyan-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm ring-1 ring-white/40">
            <MapPin className="inline h-2.5 w-2.5 mr-0.5" />
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Map background grid ─────────────────────────────────────────────
function MapGrid() {
  // Faint lat/lng grid: 5 horizontal + 5 vertical lines at 0/25/50/75/100%.
  const lines = [0, 25, 50, 75, 100]
  return (
    <svg
      className="absolute inset-0 h-full w-full text-foreground/15"
      aria-hidden
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {lines.map((p) => (
        <line key={`h-${p}`} x1="0" y1={p} x2="100" y2={p} stroke="currentColor" strokeWidth="0.15" />
      ))}
      {lines.map((p) => (
        <line key={`v-${p}`} x1={p} y1="0" x2={p} y2="100" stroke="currentColor" strokeWidth="0.15" />
      ))}
    </svg>
  )
}

// ── Legend ──────────────────────────────────────────────────────────
function Legend({ layers }: { layers: Record<LayerKey, boolean> }) {
  return (
    <Card className="absolute bottom-3 right-3 z-20 w-44 p-3 shadow-lg">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Legend
      </div>
      <ul className="space-y-1.5">
        {(Object.keys(LAYER_META) as LayerKey[]).map((key) => {
          const meta = LAYER_META[key]
          const enabled = layers[key]
          return (
            <li key={key} className={cn('flex items-center gap-2', !enabled && 'opacity-40')}>
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <MarkerShape shape={meta.shape} color={meta.color} size={14} />
              </span>
              <span className="text-[11px] font-medium">{meta.label}</span>
            </li>
          )
        })}
      </ul>
      <Separator className="my-2" />
      <div className="text-[10px] text-muted-foreground leading-snug">
        Bounds: {MAP_BOUNDS.minLat}–{MAP_BOUNDS.maxLat}°N · {MAP_BOUNDS.minLng}–{MAP_BOUNDS.maxLng}°E
      </div>
    </Card>
  )
}

// ── Layer panel ─────────────────────────────────────────────────────
function LayerPanel({
  layers,
  setLayers,
  counts,
}: {
  layers: Record<LayerKey, boolean>
  setLayers: (l: Record<LayerKey, boolean>) => void
  counts: Record<LayerKey, number>
}) {
  const [open, setOpen] = React.useState(true)
  return (
    <Card className="absolute top-3 left-3 z-20 w-56 p-0 shadow-lg">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b bg-muted/40 px-3 py-2.5 hover:bg-muted/70"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Layers
            </span>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-2">
            <ul className="space-y-2">
              {(Object.keys(LAYER_META) as LayerKey[]).map((key) => {
                const meta = LAYER_META[key]
                return (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`layer-${key}`} className="flex items-center gap-2 cursor-pointer text-[13px] font-medium">
                      <span className="inline-flex h-4 w-4 items-center justify-center">
                        <MarkerShape shape={meta.shape} color={meta.color} size={14} />
                      </span>
                      {meta.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground tabular-nums">{counts[key]}</span>
                      <Switch
                        id={`layer-${key}`}
                        checked={layers[key]}
                        onCheckedChange={(checked) => setLayers({ ...layers, [key]: checked })}
                        aria-label={`Toggle ${meta.label} layer`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            <Separator className="my-2.5" />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Distinct shapes per layer ensure readability without relying on color alone.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ── Map drawer content ──────────────────────────────────────────────
function MarkerDrawer({
  selected,
  onClose,
  onNavigate,
}: {
  selected: SelectedMarker | null
  onClose: () => void
  onNavigate: (target: 'alerts' | 'reports' | 'safe-places' | 'risk' | 'operations') => void
}) {
  const open = selected !== null
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto scrollbar-thin">
        {selected && <DrawerBody selected={selected} onNavigate={onNavigate} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({
  selected,
  onNavigate,
}: {
  selected: SelectedMarker
  onNavigate: (target: 'alerts' | 'reports' | 'safe-places' | 'risk' | 'operations') => void
}) {
  const { kind, data } = selected
  const meta = LAYER_META[kind]
  let title = ''
  let subtitle = ''
  let coords: { lat: number; lng: number } | null = null
  let primaryBadge: React.ReactNode = null
  let secondaryBadges: React.ReactNode[] = []
  let timeLabel: React.ReactNode = null
  let description: React.ReactNode = null
  let details: { label: string; value: React.ReactNode }[] = []
  let navigateTarget: 'alerts' | 'reports' | 'safe-places' | 'risk' | 'operations' | null = null

  switch (kind) {
    case 'incident': {
      const d = data as IncidentItem
      title = d.incidentCode
      subtitle = `${d.incidentType.replace(/_/g, ' ')} · ${d.priority} priority`
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.status} />
      secondaryBadges = [
        <VerificationBadge key="v" status={d.verificationStatus} />,
        d.simulationMode ? <SimulationBadge key="s" /> : null,
      ].filter(Boolean)
      timeLabel = <span>Created {formatRelativeTime(d.createdAt)}</span>
      description = d.description
      details = [
        { label: 'People affected', value: '—' },
        { label: 'Verification', value: d.verificationStatus.replace(/_/g, ' ') },
      ]
      // Incidents: ops role can navigate to operations dashboard.
      navigateTarget = null
      break
    }
    case 'alert': {
      const d = data as AlertItem
      title = d.title
      subtitle = `${d.alertType.replace(/_/g, ' ')} alert`
      coords = d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null
      primaryBadge = <SeverityBadge severity={(d.severity as Severity) ?? 'INFORMATIONAL'} />
      secondaryBadges = [
        <VerificationBadge key="v" status={d.verificationStatus} />,
        <StatusBadge key="st" status={d.status} />,
        d.simulationMode ? <SimulationBadge key="s" /> : null,
      ].filter(Boolean)
      timeLabel = <span>Issued {formatRelativeTime(d.issuedAt)} · expires {formatRelativeTime(d.expiresAt)}</span>
      description = d.body ?? 'No additional details.'
      details = [
        { label: 'Coverage radius', value: `${d.radiusKm} km` },
        { label: 'Severity', value: d.severity },
        { label: 'Verification', value: d.verificationStatus.replace(/_/g, ' ') },
      ]
      navigateTarget = 'alerts'
      break
    }
    case 'hazardZone': {
      const d = data as HazardZoneItem
      title = d.name
      subtitle = `${d.hazardType.replace(/_/g, ' ')} susceptibility`
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <HazardBadge type={d.hazardType} />
      secondaryBadges = [
        <Badge key="b" variant="outline" className="font-semibold border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          Baseline: {d.baselineLevel}
        </Badge>,
        d.source ? <Badge key="src" variant="outline" className="text-muted-foreground">{d.source}</Badge> : null,
      ].filter(Boolean)
      timeLabel = <span>Radius {d.radiusKm} km</span>
      description = `Pre-identified ${HAZARD_META[d.hazardType as HazardType]?.label ?? d.hazardType} susceptibility zone with baseline level ${d.baselineLevel}.`
      details = [
        { label: 'Radius', value: `${d.radiusKm} km` },
        { label: 'Baseline', value: d.baselineLevel },
        { label: 'Source', value: d.source ?? '—' },
      ]
      navigateTarget = 'risk'
      break
    }
    case 'report': {
      const d = data as ReportItem
      title = `${d.category.replace(/_/g, ' ')} report`
      subtitle = 'Community report'
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.status} />
      secondaryBadges = [
        <Badge key="sev" variant="outline" className="font-semibold border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
          {d.severity}
        </Badge>,
        <VerificationBadge key="v" status={d.verificationStatus} />,
      ].filter(Boolean)
      timeLabel = <span>Reported {formatRelativeTime(d.createdAt)}</span>
      description = d.description
      details = [
        { label: 'Severity', value: d.severity },
        { label: 'Status', value: d.status.replace(/_/g, ' ') },
        { label: 'Verification', value: d.verificationStatus.replace(/_/g, ' ') },
      ]
      navigateTarget = 'reports'
      break
    }
    case 'facility': {
      const d = data as FacilityItem
      title = d.name
      subtitle = d.facilityType.replace(/_/g, ' ')
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.status} />
      secondaryBadges = [
        d.capacity != null ? (
          <Badge key="cap" variant="outline" className="font-semibold border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
            Capacity: {d.capacity}
          </Badge>
        ) : null,
        d.availableUnits != null ? (
          <Badge key="av" variant="outline" className="font-semibold border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
            Available: {d.availableUnits}
          </Badge>
        ) : null,
      ].filter(Boolean)
      timeLabel = <span>Status: {d.status}</span>
      description = `${d.facilityType.replace(/_/g, ' ')} — ${d.status === 'OPEN' ? 'open and operational' : d.status === 'FULL' ? 'currently at capacity' : 'currently closed'}.`
      details = [
        { label: 'Type', value: d.facilityType.replace(/_/g, ' ') },
        { label: 'Status', value: d.status },
        { label: 'Capacity', value: d.capacity ?? '—' },
        { label: 'Available units', value: d.availableUnits ?? '—' },
      ]
      navigateTarget = 'safe-places'
      break
    }
    case 'region': {
      const d = data as RegionItem
      title = d.canonicalName
      subtitle = `${d.regionType} · ${d.localName ?? '—'}`
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.coverageStatus} />
      secondaryBadges = []
      timeLabel = <span>{d.regionType}</span>
      description = `Pilot locality with coverage status: ${d.coverageStatus.replace(/_/g, ' ')}.`
      details = [
        { label: 'Type', value: d.regionType },
        { label: 'Local name', value: d.localName ?? '—' },
        { label: 'Coverage', value: d.coverageStatus.replace(/_/g, ' ') },
      ]
      navigateTarget = null
      break
    }
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="gap-2 border-b px-4 pb-3 pt-4">
        <div className="flex items-start gap-2 pr-6">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-border bg-muted/40">
            <MarkerShape shape={meta.shape} color={meta.color} size={16} />
          </span>
          <div className="min-w-0">
            <SheetTitle className="text-base leading-tight">{title}</SheetTitle>
            <SheetDescription className="text-xs uppercase tracking-wide">{subtitle}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {primaryBadge}
          {secondaryBadges}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        {coords && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Crosshair className="h-3 w-3" />
              Coordinates
            </div>
            <div className="font-mono text-[12px]">
              {coords.lat.toFixed(4)}°N · {coords.lng.toFixed(4)}°E
            </div>
          </div>
        )}

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Description</h4>
          <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
        </div>

        {details.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Details</h4>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {details.map((d) => (
                <div key={d.label} className="space-y-0.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</dt>
                  <dd className="text-sm font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {timeLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeLabel}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3 space-y-2">
        {navigateTarget ? (
          <Button
            className="w-full"
            onClick={() => onNavigate(navigateTarget)}
          >
            View {navigateTarget === 'safe-places' ? 'in Safe Places' : `in ${navigateTarget.charAt(0).toUpperCase() + navigateTarget.slice(1)}`}
          </Button>
        ) : (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
            {kind === 'incident'
              ? 'Incident details shown on-map. Open the Operations Dashboard to act on this incident.'
              : 'No further view available for this item.'}
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={() => onNavigate('operations')} disabled={kind !== 'incident'}>
          Open Operations
        </Button>
      </div>
    </div>
  )
}

// ── Top controls bar ────────────────────────────────────────────────
function TopControlsBar({
  zoom,
  setZoom,
  fullscreen,
  setFullscreen,
  onUseMyLocation,
  onResetExtent,
}: {
  zoom: number
  setZoom: (z: number) => void
  fullscreen: boolean
  setFullscreen: (v: boolean) => void
  onUseMyLocation: () => void
  onResetExtent: () => void
}) {
  const { location, setLocation } = useApp()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Select
          value={location.name}
          onValueChange={(v) => {
            const region = DEMO_REGIONS.find((r) => r.name === v)
            if (region) {
              setLocation({
                name: region.name,
                lat: region.lat,
                lng: region.lng,
                localName: region.localName,
              })
            }
          }}
        >
          <SelectTrigger size="sm" className="h-8 min-w-0 flex-1 sm:w-64">
            <span className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Select locality" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {DEMO_REGIONS.map((r) => (
              <SelectItem key={r.name} value={r.name}>
                <div className="flex flex-col gap-0 py-0.5">
                  <span className="text-[13px] font-medium">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.localName} · {r.state}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onUseMyLocation}
          aria-label="Use my location"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">My location</span>
        </Button>

        <div className="flex items-center rounded-md border bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setZoom(Math.max(1, zoom - 1))}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground select-none">{zoom}x</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setZoom(Math.min(5, zoom + 1))}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onResetExtent}
          aria-label="Reset map extent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setFullscreen(!fullscreen)}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ── Bottom time slider ──────────────────────────────────────────────
function TimeSlider({ lastUpdated }: { lastUpdated: Date | null }) {
  const [value, setValue] = React.useState<number>(100)
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-soft-pulse" />
        <span className="text-emerald-700 dark:text-emerald-400">Live</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={(v) => setValue(v[0])}
          min={0}
          max={100}
          step={1}
          aria-label="Time scrubber — last 24 hours"
          className="flex-1"
        />
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 min-w-[120px] text-right">
          {value === 100 ? 'Now' : `${Math.round((100 - value) * 24 / 100)}h ago`}
        </span>
      </div>
      <Separator orientation="vertical" className="hidden sm:block h-5" />
      <span className="hidden sm:block text-[11px] text-muted-foreground shrink-0">
        <Clock className="inline h-3 w-3 mr-1" />
        Data as of {lastUpdated ? formatRelativeTime(lastUpdated) : '—'}
      </span>
    </div>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24 ml-auto" />
      </div>
      <Skeleton className="h-[60vh] md:h-[70vh] w-full rounded-xl" />
    </div>
  )
}

// ── Main MapView ────────────────────────────────────────────────────
export default function MapView() {
  const { location, setLocation, setView, role } = useApp()
  const [data, setData] = React.useState<MapData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [layers, setLayers] = React.useState<Record<LayerKey, boolean>>({
    incidents: LAYER_META.incidents.defaultOn,
    alerts: LAYER_META.alerts.defaultOn,
    hazardZones: LAYER_META.hazardZones.defaultOn,
    reports: LAYER_META.reports.defaultOn,
    facilities: LAYER_META.facilities.defaultOn,
    regions: LAYER_META.regions.defaultOn,
  })
  const [zoom, setZoom] = React.useState<number>(2)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [selected, setSelected] = React.useState<SelectedMarker | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  // Fetch map data whenever the selected location changes.
  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
      })
      const res = await apiGet<MapData>(`/api/map?${qs.toString()}`)
      setData(res)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[map-view] fetch failed', err)
      setError(err instanceof Error ? err.message : 'Failed to load map data')
      toast.error('Failed to load map data. Showing cached view if available.')
    } finally {
      setLoading(false)
    }
  }, [location.lat, location.lng])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Geolocation handler — wrapped in try/catch; client-only.
  const useMyLocation = React.useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.')
      return
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        })
      })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      // Find nearest demo region for label; if outside bounds, just label "My location".
      let nearest: (typeof DEMO_REGIONS)[number] = DEMO_REGIONS[0]
      let best = Number.POSITIVE_INFINITY
      for (const r of DEMO_REGIONS) {
        const d = distanceKm(lat, lng, r.lat, r.lng)
        if (d < best) {
          best = d
          nearest = r
        }
      }
      const inBounds =
        lat >= MAP_BOUNDS.minLat && lat <= MAP_BOUNDS.maxLat && lng >= MAP_BOUNDS.minLng && lng <= MAP_BOUNDS.maxLng
      setLocation({
        name: inBounds && best < 50 ? nearest.name : 'My location',
        lat,
        lng,
        localName: inBounds && best < 50 ? nearest.localName : undefined,
      })
      toast.success(`Location set to ${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`)
    } catch (err: any) {
      if (err?.code === err?.PERMISSION_DENIED) {
        toast.error('Location permission denied — please select a locality')
      } else if (err?.code === err?.TIMEOUT) {
        toast.error('Could not get a fix on your location. Try again.')
      } else {
        toast.error('Location unavailable — please select a locality')
      }
    }
  }, [setLocation])

  const resetExtent = React.useCallback(() => {
    setZoom(2)
    setFullscreen(false)
  }, [])

  const onNavigate = React.useCallback(
    (target: 'alerts' | 'reports' | 'safe-places' | 'risk' | 'operations') => {
      setSelected(null)
      // For incidents/operations dashboard: restrict to ops roles.
      if (target === 'operations') {
        const opsRoles: string[] = ['DISTRICT_OPERATOR', 'STATE_OPERATOR', 'ADMIN']
        if (!opsRoles.includes(role)) {
          toast.info('Operations dashboard requires an operator role.')
          return
        }
      }
      setView(target)
    },
    [role, setView]
  )

  // Marker sizing & label visibility based on zoom.
  const markerSize = 16 + (zoom - 1) * 3 // 16..28
  const showLabels = zoom >= 3

  // Selected location projection.
  const sel = projectLatLng(location.lat, location.lng)

  // Compute counts.
  const counts: Record<LayerKey, number> = {
    incidents: data?.incidents.length ?? 0,
    alerts: data?.alerts.length ?? 0,
    hazardZones: data?.hazardZones.length ?? 0,
    reports: data?.reports.length ?? 0,
    facilities: data?.facilities.length ?? 0,
    regions: data?.regions.length ?? 0,
  }

  const isOpsRole = ['DISTRICT_OPERATOR', 'STATE_OPERATOR', 'ADMIN'].includes(role)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <MapIcon className="h-5 w-5 text-muted-foreground" />
            Live Map
            <Badge variant="outline" className="ml-1 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
              SIMULATED FEED
            </Badge>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Custom topographic overlay for the Himalayan &amp; North Eastern Region — incidents, alerts, hazard zones, facilities and community reports.
          </p>
        </div>
        {isOpsRole && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView('operations')}>
            <Activity className="h-3.5 w-3.5" />
            Operations Dashboard
          </Button>
        )}
      </div>

      {/* Top controls */}
      <div className="mb-3">
        <TopControlsBar
          zoom={zoom}
          setZoom={setZoom}
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          onUseMyLocation={useMyLocation}
          onResetExtent={resetExtent}
        />
      </div>

      {/* Map */}
      {loading && !data ? (
        <MapSkeleton />
      ) : error && !data ? (
        <Card className="p-6">
          <CardContent className="space-y-3 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">Could not load map data.</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            ref={containerRef}
            className={cn(
              'relative w-full overflow-hidden rounded-xl border bg-slate-200 dark:bg-slate-800',
              fullscreen ? 'h-[calc(100vh-7rem)]' : 'h-[60vh] md:h-[70vh]'
            )}
          >
            {/* Background image — falls back to bg-slate-200 if missing */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/map-bg.png')" }}
              aria-hidden
            />
            {/* Dark overlay for marker legibility */}
            <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/40" aria-hidden />
            {/* Faint lat/lng grid */}
            <MapGrid />

            {/* North + extent labels */}
            <div className="pointer-events-none absolute top-3 right-1/2 translate-x-1/2 z-10 flex flex-col items-center gap-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/50">
              <Compass className="h-3 w-3" />
              N
            </div>
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[10px] font-medium text-foreground/40">
              {MAP_BOUNDS.minLat}–{MAP_BOUNDS.maxLat}°N · {MAP_BOUNDS.minLng}–{MAP_BOUNDS.maxLng}°E
            </div>

            {/* Layer panel */}
            <LayerPanel layers={layers} setLayers={setLayers} counts={counts} />

            {/* Legend */}
            <Legend layers={layers} />

            {/* Markers */}
            <div className="absolute inset-0">
              {/* Selected location pulsing marker (always on) */}
              <SelectedLocationMarker
                x={sel.x}
                y={sel.y}
                label={location.name}
                showLabel={showLabels || zoom >= 2}
              />

              {/* Regions */}
              {layers.regions &&
                data?.regions.map((r) => {
                  const p = projectLatLng(r.lat, r.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  return (
                    <MapMarker
                      key={`region-${r.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.regions.shape}
                      color={LAYER_META.regions.color}
                      label={r.canonicalName}
                      showLabel={showLabels}
                      size={12}
                      tooltip={`Region: ${r.canonicalName} (${r.regionType})`}
                      onClick={() => setSelected({ kind: 'region', data: r })}
                    />
                  )
                })}

              {/* Hazard zones — render as soft circles first (rings), then center marker */}
              {layers.hazardZones &&
                data?.hazardZones.map((hz) => {
                  const p = projectLatLng(hz.lat, hz.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  // Approximate radius in % of map width — rough visual cue only.
                  const radiusPct = Math.min(8, Math.max(1.5, (hz.radiusKm / 100) * 100 * 0.4))
                  return (
                    <div
                      key={`hz-ring-${hz.id}`}
                      className="absolute z-10 pointer-events-none"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="rounded-full border-2 border-amber-500/40 bg-amber-500/10"
                        style={{ width: `${radiusPct * 2}%`, height: `${radiusPct * 2}%` }}
                      />
                    </div>
                  )
                })}
              {layers.hazardZones &&
                data?.hazardZones.map((hz) => {
                  const p = projectLatLng(hz.lat, hz.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  return (
                    <MapMarker
                      key={`hz-${hz.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.hazardZones.shape}
                      color={LAYER_META.hazardZones.color}
                      label={hz.name}
                      showLabel={showLabels}
                      size={markerSize}
                      tooltip={`${hz.name} — ${hz.hazardType.replace(/_/g, ' ')} (${hz.baselineLevel})`}
                      onClick={() => setSelected({ kind: 'hazardZone', data: hz })}
                    />
                  )
                })}

              {/* Facilities */}
              {layers.facilities &&
                data?.facilities.map((f) => {
                  const p = projectLatLng(f.lat, f.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  const color = f.status === 'FULL' ? '#9ca3af' : f.status === 'CLOSED' ? '#6b7280' : LAYER_META.facilities.color
                  return (
                    <MapMarker
                      key={`fac-${f.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.facilities.shape}
                      color={color}
                      label={f.name}
                      showLabel={showLabels}
                      size={markerSize}
                      tooltip={`${f.name} — ${f.facilityType.replace(/_/g, ' ')} · ${f.status}`}
                      onClick={() => setSelected({ kind: 'facility', data: f })}
                    />
                  )
                })}

              {/* Community reports */}
              {layers.reports &&
                data?.reports.map((rp) => {
                  const p = projectLatLng(rp.lat, rp.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  return (
                    <MapMarker
                      key={`rep-${rp.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.reports.shape}
                      color={LAYER_META.reports.color}
                      label={`${rp.category.replace(/_/g, ' ')} report`}
                      showLabel={showLabels}
                      size={markerSize}
                      tooltip={`${rp.category.replace(/_/g, ' ')} report — ${rp.severity}`}
                      onClick={() => setSelected({ kind: 'report', data: rp })}
                    />
                  )
                })}

              {/* Alerts */}
              {layers.alerts &&
                data?.alerts.map((al) => {
                  const p = projectLatLng(al.lat, al.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  const color =
                    al.severity === 'EMERGENCY' || al.severity === 'WARNING'
                      ? '#dc2626'
                      : al.severity === 'WATCH'
                      ? '#ea580c'
                      : LAYER_META.alerts.color
                  return (
                    <MapMarker
                      key={`al-${al.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.alerts.shape}
                      color={color}
                      label={al.title}
                      showLabel={showLabels}
                      size={markerSize + 2}
                      tooltip={`${al.title} — ${al.severity}`}
                      onClick={() => setSelected({ kind: 'alert', data: al })}
                    />
                  )
                })}

              {/* Incidents (rendered last, on top) */}
              {layers.incidents &&
                data?.incidents.map((inc) => {
                  const p = projectLatLng(inc.lat, inc.lng)
                  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null
                  return (
                    <MapMarker
                      key={`inc-${inc.id}`}
                      x={p.x}
                      y={p.y}
                      shape={LAYER_META.incidents.shape}
                      color={LAYER_META.incidents.color}
                      label={inc.incidentCode}
                      showLabel={showLabels}
                      size={markerSize + 2}
                      tooltip={`${inc.incidentCode} — ${inc.incidentType.replace(/_/g, ' ')} · ${inc.priority}`}
                      onClick={() => setSelected({ kind: 'incident', data: inc })}
                    />
                  )
                })}
            </div>

            {/* Hover hint when nothing selected */}
            <div className="pointer-events-none absolute bottom-2 right-2 z-10 hidden md:block">
              <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border/40 backdrop-blur">
                <Radio className="inline h-3 w-3 mr-1" />
                Click any marker for details
              </span>
            </div>
          </div>

          {/* Time slider */}
          <TimeSlider lastUpdated={lastUpdated} />

          {/* Summary chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Active layers:</span>
            {(Object.keys(layers) as LayerKey[]).filter((k) => layers[k]).map((k) => (
              <Badge key={k} variant="outline" className="gap-1 text-[11px]">
                <span className="inline-flex h-2 w-2 items-center justify-center">
                  <MarkerShape shape={LAYER_META[k].shape} color={LAYER_META[k].color} size={10} />
                </span>
                {LAYER_META[k].label}
                <span className="ml-1 tabular-nums text-muted-foreground">{counts[k]}</span>
              </Badge>
            ))}
            {error && (
              <Badge variant="outline" className="text-[11px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                Partial data
              </Badge>
            )}
          </div>
        </>
      )}

      {/* Marker detail drawer */}
      <MarkerDrawer selected={selected} onClose={() => setSelected(null)} onNavigate={onNavigate} />
    </div>
  )
}
