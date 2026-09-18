'use client'

import * as React from 'react'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import {
  DEMO_REGIONS,
  MAP_BOUNDS,
  HAZARD_META,
  SITE_IMAGES,
  projectLatLng,
  formatRelativeTime,
  distanceKm,
  type Severity,
  type HazardType,
  type Role,
} from '@/lib/constants'
import { Card } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
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
  Search,
  Filter,
  X,
  Eye,
  EyeOff,
  Navigation2,
  Info,
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

type NavigateTarget = 'alerts' | 'reports' | 'safe-places' | 'risk' | 'admin'

// ── Layer meta ──────────────────────────────────────────────────────
type MarkerShapeKind = 'triangle' | 'hexagon' | 'circle' | 'diamond' | 'square' | 'dot'

interface LayerMeta {
  label: string
  color: string
  shape: MarkerShapeKind
  defaultOn: boolean
}

const LAYER_META: Record<LayerKey, LayerMeta> = {
  incidents: { label: 'Incidents', color: '#dc2626', shape: 'triangle', defaultOn: true },
  alerts: { label: 'Alerts', color: '#ea580c', shape: 'hexagon', defaultOn: true },
  hazardZones: { label: 'Hazard Zones', color: '#d97706', shape: 'circle', defaultOn: false },
  reports: { label: 'Community Reports', color: '#2563eb', shape: 'diamond', defaultOn: false },
  facilities: { label: 'Facilities', color: '#059669', shape: 'square', defaultOn: true },
  regions: { label: 'Regions', color: '#64748b', shape: 'dot', defaultOn: false },
}

const LAYER_ORDER: LayerKey[] = ['incidents', 'alerts', 'hazardZones', 'reports', 'facilities', 'regions']

// Zoom level → wrapper scale. Index 0 = zoom 1 (lowest). Default zoom 3 (scale 1.0).
const ZOOM_SCALES = [0.85, 0.95, 1.0, 1.4, 1.8, 2.4]

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

// ── Marker (single, click → drawer) ─────────────────────────────────
function MapMarker({
  x,
  y,
  shape,
  color,
  label,
  showLabel,
  tooltip,
  counterScale,
  onClick,
  zIndex = 20,
}: {
  x: number
  y: number
  shape: MarkerShapeKind
  color: string
  label: string
  showLabel: boolean
  tooltip: string
  counterScale: number
  onClick: () => void
  zIndex?: number
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-marker="true"
            onClick={onClick}
            className="absolute z-20 flex flex-col items-center gap-0.5 outline-none focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-ring rounded-sm hover:z-30"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex,
              cursor: 'pointer',
            }}
            aria-label={label}
          >
            <span
              className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)] transition-transform hover:scale-110"
              style={{ transform: `scale(${1})`, transformOrigin: 'center' }}
            >
              <MarkerShape shape={shape} color={color} size={18} />
            </span>
            {showLabel && (
              <span
                className="max-w-[140px] truncate rounded-sm bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur pointer-events-none"
                style={{
                  transform: `scale(${1 / counterScale})`,
                  transformOrigin: 'top center',
                }}
              >
                {label}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          <span className="block whitespace-normal">{tooltip}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── Selected location marker (pulsing cyan dot) ────────────────────
function SelectedLocationMarker({
  x,
  y,
  label,
  counterScale,
}: {
  x: number
  y: number
  label: string
  counterScale: number
}) {
  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${1 / counterScale})`,
        transformOrigin: 'center center',
      }}
    >
      <div className="relative flex flex-col items-center gap-1">
        {/* Outer pulse ring */}
        <span className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-cyan-500/20 animate-ping" />
        {/* Inner pulse */}
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-cyan-500 ring-2 ring-white shadow-md" />
        </span>
        {/* Label pin */}
        <span className="pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-md bg-cyan-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md ring-1 ring-white/40">
          <MapPin className="h-2.5 w-2.5" />
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Hazard zone radius ring ─────────────────────────────────────────
function HazardZoneRing({
  x,
  y,
  radiusPct,
  counterScale,
}: {
  x: number
  y: number
  radiusPct: number
  counterScale: number
}) {
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${1 / counterScale})`,
        transformOrigin: 'center center',
        width: `${radiusPct * 2}%`,
        height: `${radiusPct * 2}%`,
      }}
      aria-hidden
    >
      <div className="h-full w-full rounded-full border-2 border-amber-500/50 bg-amber-500/10 backdrop-blur-[1px]" />
    </div>
  )
}

// ── Map background grid (lat/lng reference) ─────────────────────────
function MapGrid() {
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
    <Card className="absolute bottom-3 right-3 z-30 w-48 p-3 shadow-lg backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Info className="h-3 w-3" />
        Legend
      </div>
      <ul className="space-y-1.5">
        {LAYER_ORDER.map((key) => {
          const meta = LAYER_META[key]
          const enabled = layers[key]
          return (
            <li key={key} className={cn('flex items-center gap-2 transition-opacity', !enabled && 'opacity-40')}>
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <MarkerShape shape={meta.shape} color={meta.color} size={14} />
              </span>
              <span className="text-[11px] font-medium">{meta.label}</span>
            </li>
          )
        })}
      </ul>
      <Separator className="my-2" />
      <div className="text-[10px] leading-snug text-muted-foreground">
        Bounds: {MAP_BOUNDS.minLat}–{MAP_BOUNDS.maxLat}°N · {MAP_BOUNDS.minLng}–{MAP_BOUNDS.maxLng}°E
      </div>
    </Card>
  )
}

// ── Layer panel (collapsible, left side) ────────────────────────────
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
  const activeCount = LAYER_ORDER.filter((k) => layers[k]).length

  return (
    <Card className="absolute left-3 top-3 z-30 w-60 p-0 shadow-lg backdrop-blur-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b bg-muted/40 px-3 py-2.5 hover:bg-muted/70"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Layers
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-semibold">
                {activeCount}/{LAYER_ORDER.length}
              </Badge>
            </span>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-2">
            <ul className="space-y-2">
              {LAYER_ORDER.map((key) => {
                const meta = LAYER_META[key]
                return (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`layer-${key}`} className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
                      <span className="inline-flex h-4 w-4 items-center justify-center">
                        <MarkerShape shape={meta.shape} color={meta.color} size={14} />
                      </span>
                      {meta.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] tabular-nums text-muted-foreground">{counts[key]}</span>
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
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setLayers(Object.fromEntries(LAYER_ORDER.map((k) => [k, true])) as Record<LayerKey, boolean>)}
              >
                <Eye className="mr-1 h-3 w-3" />
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setLayers(Object.fromEntries(LAYER_ORDER.map((k) => [k, false])) as Record<LayerKey, boolean>)}
              >
                <EyeOff className="mr-1 h-3 w-3" />
                None
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Distinct shapes per layer ensure readability without relying on color alone.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
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
  const [query, setQuery] = React.useState('')

  const filteredRegions = React.useMemo(() => {
    if (!query.trim()) return DEMO_REGIONS
    const q = query.toLowerCase()
    return DEMO_REGIONS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        (r.localName ?? '').toLowerCase().includes(q)
    )
  }, [query])

  const handleSelectRegion = React.useCallback(
    (regionName: string) => {
      const region = DEMO_REGIONS.find((r) => r.name === regionName)
      if (region) {
        setLocation({
          name: region.name,
          lat: region.lat,
          lng: region.lng,
          localName: region.localName,
        })
        toast.success(`Location set to ${region.name}`, {
          description: `Map refetched for ${region.lat.toFixed(3)}°N, ${region.lng.toFixed(3)}°E`,
        })
      }
    },
    [setLocation]
  )

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* Location search */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Select value={location.name} onValueChange={handleSelectRegion}>
          <SelectTrigger size="sm" className="h-9 min-w-0 flex-1 sm:w-72">
            <span className="flex items-center gap-1.5 text-xs">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Select locality" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <div className="p-1.5">
              <Input
                placeholder="Search region, state, or local name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-8 text-xs"
              />
            </div>
            <Separator className="my-1" />
            <div className="max-h-72 overflow-y-auto">
              {filteredRegions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">No matches found.</div>
              ) : (
                filteredRegions.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    <div className="flex flex-col gap-0 py-0.5">
                      <span className="text-[13px] font-medium">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.localName} · {r.state}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
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
          className="h-9 w-9 rounded-r-none"
          onClick={() => setZoom(Math.max(1, zoom - 1))}
          disabled={zoom <= 1}
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="select-none px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground" title={`Zoom level ${zoom} of 6`}>
          {zoom}/6
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={() => setZoom(Math.min(6, zoom + 1))}
          disabled={zoom >= 6}
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={onResetExtent}
        aria-label="Reset map extent"
        title="Reset zoom + pan"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => setFullscreen(!fullscreen)}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

// ── Marker detail drawer (right side Sheet) ────────────────────────
function MarkerDrawer({
  selected,
  onClose,
  onNavigate,
}: {
  selected: SelectedMarker | null
  onClose: () => void
  onNavigate: (target: NavigateTarget) => void
}) {
  const open = selected !== null
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
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
  onNavigate: (target: NavigateTarget) => void
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
  let navigateTarget: NavigateTarget | null = null
  let navigateLabel = ''

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
        { label: 'Type', value: d.incidentType.replace(/_/g, ' ') },
        { label: 'Priority', value: d.priority },
        { label: 'Status', value: d.status.replace(/_/g, ' ') },
        { label: 'Verification', value: d.verificationStatus.replace(/_/g, ' ') },
      ]
      navigateTarget = 'admin'
      navigateLabel = 'Open Operations Dashboard'
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
      timeLabel = (
        <span>
          Issued {formatRelativeTime(d.issuedAt)} · expires {formatRelativeTime(d.expiresAt)}
        </span>
      )
      description = d.body ?? 'No additional details.'
      details = [
        { label: 'Coverage radius', value: `${d.radiusKm} km` },
        { label: 'Severity', value: d.severity },
        { label: 'Verification', value: d.verificationStatus.replace(/_/g, ' ') },
        { label: 'Status', value: d.status.replace(/_/g, ' ') },
      ]
      navigateTarget = 'alerts'
      navigateLabel = 'View in Alerts'
      break
    }
    case 'hazardZone': {
      const d = data as HazardZoneItem
      title = d.name
      subtitle = `${d.hazardType.replace(/_/g, ' ')} susceptibility`
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <HazardBadge type={d.hazardType} />
      secondaryBadges = [
        <Badge
          key="b"
          variant="outline"
          className="border-amber-200 bg-amber-50 font-semibold text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300"
        >
          Baseline: {d.baselineLevel}
        </Badge>,
        d.source ? (
          <Badge key="src" variant="outline" className="text-muted-foreground">
            {d.source}
          </Badge>
        ) : null,
      ].filter(Boolean)
      timeLabel = <span>Radius {d.radiusKm} km</span>
      description = `Pre-identified ${HAZARD_META[d.hazardType as HazardType]?.label ?? d.hazardType} susceptibility zone with baseline level ${d.baselineLevel}.`
      details = [
        { label: 'Radius', value: `${d.radiusKm} km` },
        { label: 'Baseline', value: d.baselineLevel },
        { label: 'Source', value: d.source ?? '—' },
        { label: 'Type', value: d.hazardType.replace(/_/g, ' ') },
      ]
      navigateTarget = 'risk'
      navigateLabel = 'View in Risk & Forecast'
      break
    }
    case 'report': {
      const d = data as ReportItem
      title = `${d.category.replace(/_/g, ' ')} report`
      subtitle = 'Community report'
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.status} />
      secondaryBadges = [
        <Badge
          key="sev"
          variant="outline"
          className="border-blue-200 bg-blue-50 font-semibold text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
        >
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
        { label: 'Category', value: d.category.replace(/_/g, ' ') },
      ]
      navigateTarget = 'reports'
      navigateLabel = 'View in Reports'
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
          <Badge
            key="cap"
            variant="outline"
            className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
          >
            Capacity: {d.capacity}
          </Badge>
        ) : null,
        d.availableUnits != null ? (
          <Badge
            key="av"
            variant="outline"
            className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
          >
            Available: {d.availableUnits}
          </Badge>
        ) : null,
      ].filter(Boolean)
      timeLabel = <span>Status: {d.status.replace(/_/g, ' ')}</span>
      description = `${d.facilityType.replace(/_/g, ' ')} — ${d.status === 'OPEN' ? 'open and operational' : d.status === 'FULL' ? 'currently at capacity' : 'currently closed'}.`
      details = [
        { label: 'Type', value: d.facilityType.replace(/_/g, ' ') },
        { label: 'Status', value: d.status.replace(/_/g, ' ') },
        { label: 'Capacity', value: d.capacity ?? '—' },
        { label: 'Available units', value: d.availableUnits ?? '—' },
      ]
      navigateTarget = 'safe-places'
      navigateLabel = 'View in Safe Places'
      break
    }
    case 'region': {
      const d = data as RegionItem
      title = d.canonicalName
      subtitle = `${d.regionType} · ${d.localName ?? '—'}`
      coords = { lat: d.lat, lng: d.lng }
      primaryBadge = <StatusBadge status={d.coverageStatus} />
      secondaryBadges = []
      timeLabel = <span>{d.regionType.replace(/_/g, ' ')}</span>
      description = `Pilot locality with coverage status: ${d.coverageStatus.replace(/_/g, ' ')}.`
      details = [
        { label: 'Type', value: d.regionType.replace(/_/g, ' ') },
        { label: 'Local name', value: d.localName ?? '—' },
        { label: 'Coverage', value: d.coverageStatus.replace(/_/g, ' ') },
      ]
      navigateTarget = null
      navigateLabel = ''
      break
    }
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="gap-2 border-b px-4 pb-3 pt-4">
        <SheetDescription className="sr-only">Map marker details</SheetDescription>
        <div className="flex items-start gap-2 pr-6">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 ring-1 ring-border">
            <MarkerShape shape={meta.shape} color={meta.color} size={18} />
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

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {coords && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
              <Crosshair className="h-3 w-3" />
              Coordinates
            </div>
            <div className="font-mono text-[12px]">
              {coords.lat.toFixed(4)}°N · {coords.lng.toFixed(4)}°E
            </div>
            {selected.kind !== 'region' && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                <Navigation2 className="mr-1 inline h-2.5 w-2.5" />
                Distances measured from map center.
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </h4>
          <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
        </div>

        {details.length > 0 && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </h4>
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

      <div className="space-y-2 border-t px-4 py-3">
        {navigateTarget ? (
          <Button className="w-full" onClick={() => onNavigate(navigateTarget)}>
            {navigateLabel}
          </Button>
        ) : (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
            No further view available for this item.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bottom time slider ─────────────────────────────────────────────
function TimeSlider({ lastUpdated }: { lastUpdated: Date | null }) {
  const [value, setValue] = React.useState<number>(100)
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
        <span className="flex h-2 w-2 animate-soft-pulse rounded-full bg-emerald-500" />
        <span className="text-emerald-700 dark:text-emerald-400">Live</span>
      </div>
      <div className="flex flex-1 items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={(v) => setValue(v[0])}
          min={0}
          max={100}
          step={1}
          aria-label="Time scrubber — last 24 hours"
          className="flex-1"
        />
        <span className="min-w-[110px] shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {value === 100 ? 'Now (Live)' : `${Math.round(((100 - value) * 24) / 100)}h ago`}
        </span>
      </div>
      <Separator orientation="vertical" className="hidden h-5 sm:block" />
      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
        <Clock className="mr-1 inline h-3 w-3" />
        Data as of {lastUpdated ? formatRelativeTime(lastUpdated) : '—'}
      </span>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <Skeleton className="h-[65vh] w-full rounded-xl" />
    </div>
  )
}

// ── Main MapView ───────────────────────────────────────────────────
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
  const [zoom, setZoom] = React.useState<number>(3)
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [fullscreen, setFullscreen] = React.useState(false)
  const [selected, setSelected] = React.useState<SelectedMarker | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const [imgOk, setImgOk] = React.useState<boolean | null>(null)

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const dragRef = React.useRef<{
    dragging: boolean
    startX: number
    startY: number
    panX: number
    panY: number
    moved: boolean
  }>({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false })

  // ── CRITICAL: refetch /api/map whenever the selected location changes.
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
      toast.error('Failed to load map data. Showing last cached view.')
    } finally {
      setLoading(false)
    }
  }, [location.lat, location.lng])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-recenter pan whenever location changes so the new pin is centered.
  React.useEffect(() => {
    setPan({ x: 0, y: 0 })
  }, [location.lat, location.lng])

  // Preload background image to detect failures gracefully.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const img = new window.Image()
    img.onload = () => setImgOk(true)
    img.onerror = () => setImgOk(false)
    img.src = SITE_IMAGES.mapBg
  }, [])

  // ── Geolocation handler ──────────────────────────────────────────
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

      // Find nearest demo region for label.
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
        lat >= MAP_BOUNDS.minLat &&
        lat <= MAP_BOUNDS.maxLat &&
        lng >= MAP_BOUNDS.minLng &&
        lng <= MAP_BOUNDS.maxLng
      const useNearest = inBounds && best < 50
      setLocation({
        name: useNearest ? nearest.name : 'My location',
        lat,
        lng,
        localName: useNearest ? nearest.localName : undefined,
      })
      toast.success(`Location set to ${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`, {
        description: useNearest ? `Nearest: ${nearest.name}` : 'Outside NE India bounds — showing on map anyway.',
      })
    } catch (err: any) {
      if (err?.code === err?.PERMISSION_DENIED) {
        toast.error('Location permission denied — please select a locality from the dropdown.')
      } else if (err?.code === err?.TIMEOUT) {
        toast.error('Could not get a fix on your location. Try again.')
      } else {
        toast.error('Location unavailable — please select a locality from the dropdown.')
      }
    }
  }, [setLocation])

  const resetExtent = React.useCallback(() => {
    setZoom(3)
    setPan({ x: 0, y: 0 })
    setFullscreen(false)
  }, [])

  const onNavigate = React.useCallback(
    (target: NavigateTarget) => {
      setSelected(null)
      // Operations / admin dashboard: restrict to ops roles.
      if (target === 'admin') {
        const opsRoles: Role[] = ['DISTRICT_OPERATOR', 'STATE_OPERATOR', 'ADMIN']
        if (!opsRoles.includes(role)) {
          toast.info('Operations Dashboard requires an operator or admin role.')
          return
        }
      }
      setView(target)
    },
    [role, setView]
  )

  // ── Pan handlers (pointer events unify mouse + touch) ─────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Don't pan if the user clicked on a marker (data-marker) — they want to click it.
    const target = e.target as HTMLElement
    if (target.closest('[data-marker="true"]')) return
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }

  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  // Wheel zoom with ctrl/cmd to avoid hijacking page scroll
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    setZoom((z) => Math.min(6, Math.max(1, z + delta)))
  }

  // ── Derived values ───────────────────────────────────────────────
  const scale = ZOOM_SCALES[zoom - 1]
  const showLabels = zoom >= 4
  const sel = projectLatLng(location.lat, location.lng)
  const isPanning = dragRef.current.dragging

  const counts: Record<LayerKey, number> = {
    incidents: data?.incidents.length ?? 0,
    alerts: data?.alerts.length ?? 0,
    hazardZones: data?.hazardZones.length ?? 0,
    reports: data?.reports.length ?? 0,
    facilities: data?.facilities.length ?? 0,
    regions: data?.regions.length ?? 0,
  }

  const isOpsRole = ['DISTRICT_OPERATOR', 'STATE_OPERATOR', 'ADMIN'].includes(role)

  const mapBgStyle: React.CSSProperties =
    imgOk === false
      ? {}
      : {
          backgroundImage: `url(${SITE_IMAGES.mapBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <MapIcon className="h-5 w-5 text-muted-foreground" />
            Live Map
            <Badge
              variant="outline"
              className="ml-1 gap-1 border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
            >
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-emerald-500" />
              SIMULATED FEED
            </Badge>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Zoomable, pannable topographic overlay for North East India — incidents, alerts, hazard zones, facilities and community reports. Updates whenever you change location.
          </p>
        </div>
        {isOpsRole && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView('admin')}>
            <Activity className="h-3.5 w-3.5" />
            Operations Dashboard
          </Button>
        )}
      </div>

      {/* Top controls */}
      <TopControlsBar
        zoom={zoom}
        setZoom={setZoom}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        onUseMyLocation={useMyLocation}
        onResetExtent={resetExtent}
      />

      {/* Map */}
      {loading && !data ? (
        <MapSkeleton />
      ) : error && !data ? (
        <Card className="p-6">
          <div className="space-y-3 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">Could not load map data.</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div
            ref={containerRef}
            className={cn(
              'relative w-full overflow-hidden rounded-xl border bg-slate-800',
              fullscreen && 'fixed inset-0 z-50 rounded-none border-0'
            )}
            style={{
              height: fullscreen ? '100vh' : '65vh',
            }}
          >
            {/* Pannable + zoomable wrapper (pointer-events auto only here) */}
            <div
              className={cn(
                'absolute inset-0 touch-none select-none',
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPan}
              onPointerCancel={endPan}
              onPointerLeave={endPan}
              onWheel={onWheel}
              role="presentation"
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  willChange: 'transform',
                }}
              >
                {/* Background image with dark overlay */}
                <div
                  className={cn(
                    'absolute inset-0',
                    imgOk === false ? 'bg-slate-800' : 'bg-cover bg-center'
                  )}
                  style={mapBgStyle}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-slate-900/30" aria-hidden />
                <MapGrid />

                {/* N indicator */}
                <div className="pointer-events-none absolute right-1/2 top-3 z-10 flex translate-x-1/2 flex-col items-center gap-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
                  <Compass className="h-3 w-3" />
                  N
                </div>

                {/* Selected location pulsing marker (always on) */}
                <SelectedLocationMarker
                  x={sel.x}
                  y={sel.y}
                  label={location.name}
                  counterScale={scale}
                />

                {/* Hazard zone radius rings */}
                {layers.hazardZones &&
                  data?.hazardZones.map((hz) => {
                    const p = projectLatLng(hz.lat, hz.lng)
                    if (p.x < -10 || p.x > 110 || p.y < -10 || p.y > 110) return null
                    const radiusPct = Math.min(8, Math.max(1.5, (hz.radiusKm / 100) * 100 * 0.4))
                    return (
                      <HazardZoneRing
                        key={`hz-ring-${hz.id}`}
                        x={p.x}
                        y={p.y}
                        radiusPct={radiusPct}
                        counterScale={scale}
                      />
                    )
                  })}

                {/* Regions (only labels at high zoom) */}
                {layers.regions &&
                  data?.regions.map((r) => {
                    const p = projectLatLng(r.lat, r.lng)
                    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return null
                    return (
                      <MapMarker
                        key={`region-${r.id}`}
                        x={p.x}
                        y={p.y}
                        shape={LAYER_META.regions.shape}
                        color={LAYER_META.regions.color}
                        label={r.canonicalName}
                        showLabel={showLabels}
                        tooltip={`Region: ${r.canonicalName} (${r.regionType})`}
                        counterScale={scale}
                        zIndex={15}
                        onClick={() => setSelected({ kind: 'region', data: r })}
                      />
                    )
                  })}

                {/* Facilities */}
                {layers.facilities &&
                  data?.facilities.map((f) => {
                    const p = projectLatLng(f.lat, f.lng)
                    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return null
                    const color =
                      f.status === 'FULL'
                        ? '#9ca3af'
                        : f.status === 'CLOSED'
                        ? '#6b7280'
                        : LAYER_META.facilities.color
                    return (
                      <MapMarker
                        key={`fac-${f.id}`}
                        x={p.x}
                        y={p.y}
                        shape={LAYER_META.facilities.shape}
                        color={color}
                        label={f.name}
                        showLabel={showLabels}
                        tooltip={`${f.name} — ${f.facilityType.replace(/_/g, ' ')} · ${f.status}`}
                        counterScale={scale}
                        zIndex={22}
                        onClick={() => setSelected({ kind: 'facility', data: f })}
                      />
                    )
                  })}

                {/* Community reports */}
                {layers.reports &&
                  data?.reports.map((rp) => {
                    const p = projectLatLng(rp.lat, rp.lng)
                    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return null
                    return (
                      <MapMarker
                        key={`rep-${rp.id}`}
                        x={p.x}
                        y={p.y}
                        shape={LAYER_META.reports.shape}
                        color={LAYER_META.reports.color}
                        label={`${rp.category.replace(/_/g, ' ')} report`}
                        showLabel={showLabels}
                        tooltip={`${rp.category.replace(/_/g, ' ')} report — ${rp.severity}`}
                        counterScale={scale}
                        zIndex={24}
                        onClick={() => setSelected({ kind: 'report', data: rp })}
                      />
                    )
                  })}

                {/* Alerts */}
                {layers.alerts &&
                  data?.alerts.map((al) => {
                    const p = projectLatLng(al.lat, al.lng)
                    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return null
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
                        tooltip={`${al.title} — ${al.severity}`}
                        counterScale={scale}
                        zIndex={26}
                        onClick={() => setSelected({ kind: 'alert', data: al })}
                      />
                    )
                  })}

                {/* Incidents (top-most) */}
                {layers.incidents &&
                  data?.incidents.map((inc) => {
                    const p = projectLatLng(inc.lat, inc.lng)
                    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) return null
                    return (
                      <MapMarker
                        key={`inc-${inc.id}`}
                        x={p.x}
                        y={p.y}
                        shape={LAYER_META.incidents.shape}
                        color={LAYER_META.incidents.color}
                        label={inc.incidentCode}
                        showLabel={showLabels}
                        tooltip={`${inc.incidentCode} — ${inc.incidentType.replace(/_/g, ' ')} · ${inc.priority}`}
                        counterScale={scale}
                        zIndex={28}
                        onClick={() => setSelected({ kind: 'incident', data: inc })}
                      />
                    )
                  })}
              </div>
            </div>

            {/* Layer panel (left, collapsible) */}
            <LayerPanel layers={layers} setLayers={setLayers} counts={counts} />

            {/* Legend (bottom-right) */}
            <Legend layers={layers} />

            {/* Bottom-left extent label */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 text-[10px] font-medium text-foreground/50">
              {MAP_BOUNDS.minLat}–{MAP_BOUNDS.maxLat}°N · {MAP_BOUNDS.minLng}–{MAP_BOUNDS.maxLng}°E
            </div>

            {/* Hover hint (bottom-left) */}
            <div className="pointer-events-none absolute bottom-2 left-3 z-20 hidden md:block">
              <span className="rounded-md bg-background/70 px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border/40 backdrop-blur">
                <Radio className="mr-1 inline h-3 w-3" />
                Drag to pan · Ctrl+scroll to zoom · Click a marker for details
              </span>
            </div>

            {/* Fullscreen exit button (only when fullscreen) */}
            {fullscreen && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-3 top-3 z-40 h-9 w-9 shadow-md"
                onClick={() => setFullscreen(false)}
                aria-label="Exit fullscreen"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Live loading chip (when refetching after a location change) */}
            {loading && data && (
              <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow-md ring-1 ring-border/60 backdrop-blur">
                <span className="h-2 w-2 animate-soft-pulse rounded-full bg-cyan-500" />
                Updating map…
              </div>
            )}

            {/* Partial data warning */}
            {error && data && (
              <div className="absolute right-3 bottom-3 z-30 flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 shadow-md dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Partial data — last update {lastUpdated ? formatRelativeTime(lastUpdated) : 'unknown'}
              </div>
            )}
          </div>

          {/* Time slider */}
          <TimeSlider lastUpdated={lastUpdated} />

          {/* Summary chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />
              Active layers:
            </span>
            {LAYER_ORDER.filter((k) => layers[k]).map((k) => (
              <Badge key={k} variant="outline" className="gap-1 text-[11px]">
                <span className="inline-flex h-2 w-2 items-center justify-center">
                  <MarkerShape shape={LAYER_META[k].shape} color={LAYER_META[k].color} size={10} />
                </span>
                {LAYER_META[k].label}
                <span className="ml-1 tabular-nums text-muted-foreground">{counts[k]}</span>
              </Badge>
            ))}
            {LAYER_ORDER.filter((k) => layers[k]).length === 0 && (
              <span className="text-[11px] text-muted-foreground">No layers visible</span>
            )}
          </div>

          {/* Selected location summary */}
          <div className="mt-2 text-[11px] text-muted-foreground">
            <MapPin className="mr-1 inline h-3 w-3 text-cyan-600" />
            Selected: <span className="font-medium text-foreground">{location.name}</span> ·{' '}
            <span className="font-mono">
              {location.lat.toFixed(3)}°N, {location.lng.toFixed(3)}°E
            </span>
          </div>
        </>
      )}

      {/* Marker detail drawer */}
      <MarkerDrawer selected={selected} onClose={() => setSelected(null)} onNavigate={onNavigate} />
    </div>
  )
}
