'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ShieldCheck, MapPin, Navigation, Phone, Clock, Loader2, Share2,
  AlertTriangle, Building2, Crosshair, Flag, ArrowRight, Footprints, Car, Accessibility,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatRelativeTime, distanceKm } from '@/lib/constants'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SimulationBadge, StatusBadge, VerificationBadge } from '@/components/shared/badges'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────
interface FacilityRow {
  id: string
  name: string
  facilityType: string
  lat: number
  lng: number
  address: string | null
  phone: string | null
  capacity: number | null
  availableUnits: number | null
  status: string
  verifiedAt: string | null
  source: string | null
  distanceKm: number
}

type FacilityTypeFilter = 'ALL' | 'SHELTER' | 'HOSPITAL' | 'RELIEF_CENTER' | 'POLICE_STATION' | 'ASSEMBLY_POINT'
type RouteProfile = 'walking' | 'vehicle' | 'accessible'

const FACILITY_TYPE_LABEL: Record<string, string> = {
  SHELTER: 'Shelter',
  HOSPITAL: 'Hospital',
  RELIEF_CENTER: 'Relief Center',
  POLICE_STATION: 'Police Station',
  FIRE_STATION: 'Fire Station',
  ASSEMBLY_POINT: 'Assembly Point',
}

const TYPE_OPTIONS: { value: FacilityTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'SHELTER', label: 'Shelters' },
  { value: 'HOSPITAL', label: 'Hospitals' },
  { value: 'RELIEF_CENTER', label: 'Relief centers' },
  { value: 'POLICE_STATION', label: 'Police stations' },
  { value: 'ASSEMBLY_POINT', label: 'Assembly points' },
]

// ── Main view ────────────────────────────────────────────────────────────
export default function SafePlacesView() {
  const { location, setView } = useApp()
  const [facilities, setFacilities] = React.useState<FacilityRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState<FacilityTypeFilter>('ALL')
  const [selectedId, setSelectedId] = React.useState<string>('')
  const [routeProfile, setRouteProfile] = React.useState<RouteProfile>('vehicle')

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await apiGet<{ items: FacilityRow[] }>(
          `/api/facilities?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}&radius=30`
        )
        if (!cancelled) {
          setFacilities(res.items ?? [])
          if ((res.items?.length ?? 0) > 0 && !selectedId) {
            setSelectedId(res.items[0].id)
          }
        }
      } catch (err: any) {
        console.warn('Failed to load facilities', err)
        if (!cancelled) setFacilities([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location.lat, location.lng])

  const visibleFacilities = React.useMemo(() => {
    if (typeFilter === 'ALL') return facilities
    return facilities.filter((f) => f.facilityType === typeFilter)
  }, [facilities, typeFilter])

  const selected = facilities.find((f) => f.id === selectedId) ?? null

  // Route calculation (illustrative)
  const routeDistanceKm = selected ? Math.round(distanceKm(location.lat, location.lng, selected.lat, selected.lng) * 100) / 100 : 0
  const effectiveSpeedKph =
    routeProfile === 'walking' ? 5 : routeProfile === 'accessible' ? 3.5 : 30
  const etaMinutes = selected ? Math.max(1, Math.round((routeDistanceKm / effectiveSpeedKph) * 60)) : 0

  function handleShareRoute() {
    if (!selected) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(
          `PurvaGuard AI — route to ${selected.name} (${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}). Demo share link.`
        )
        .then(() => toast.success('Route share link copied (demo)'))
        .catch(() => toast.info('Route share link copied (demo)'))
    } else {
      toast.info('Route share link copied (demo)')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Safe Places & Routes
          </h1>
          <p className="text-sm text-muted-foreground">
            Shelters, hospitals, relief centres near <span className="font-medium text-foreground">{location.name}</span>.
          </p>
        </div>
        <SimulationBadge />
      </div>

      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        <AlertTitle className="text-amber-800 dark:text-amber-300">Route is an aid, not a guarantee of safety</AlertTitle>
        <AlertDescription className="text-xs">
          Follow local authorities and on-ground responders. Conditions can change rapidly during a disaster.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Left: facilities list ──────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Nearby facilities
                </CardTitle>
                <CardDescription>Within 30 km of your current location.</CardDescription>
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FacilityTypeFilter)}>
                <SelectTrigger className="h-8 w-[150px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading facilities…
              </div>
            ) : visibleFacilities.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6">No facilities found within 30 km.</div>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {visibleFacilities.map((f) => {
                  const occPct =
                    f.capacity && f.capacity > 0
                      ? Math.min(100, Math.round(((f.capacity - (f.availableUnits ?? 0)) / f.capacity) * 100))
                      : null
                  const isSel = selectedId === f.id
                  return (
                    <li
                      key={f.id}
                      className={cn(
                        'rounded-lg border bg-card px-3 py-3 space-y-2 cursor-pointer transition-colors',
                        isSel ? 'border-primary ring-1 ring-primary/40' : 'hover:bg-muted/40'
                      )}
                      onClick={() => setSelectedId(f.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{f.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">
                              {FACILITY_TYPE_LABEL[f.facilityType] ?? f.facilityType}
                            </Badge>
                            <StatusBadge status={f.status} />
                            {f.verifiedAt && <VerificationBadge status="DISTRICT_VERIFIED" />}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold">{f.distanceKm.toFixed(1)} km</div>
                          <div className="text-[10px] text-muted-foreground">away</div>
                        </div>
                      </div>

                      {f.address && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {f.address}
                        </div>
                      )}

                      {f.capacity !== null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Capacity {f.capacity} · {f.availableUnits ?? 0} available
                            </span>
                            <span>{occPct !== null ? `${100 - occPct}% free` : ''}</span>
                          </div>
                          <Progress
                            value={occPct ?? 0}
                            className={cn(
                              'h-1.5',
                              (occPct ?? 0) >= 90 && '[&>[data-slot=progress-indicator]]:bg-red-500'
                            )}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {f.verifiedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> verified {formatRelativeTime(f.verifiedAt)}
                            </span>
                          )}
                          {f.source && <span>· {f.source}</span>}
                        </div>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={`https://www.openstreetmap.org/directions?from=${location.lat}%2C${location.lng}&to=${f.lat}%2C${f.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation className="h-3 w-3" /> Directions
                          </a>
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Right: route panel ─────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-4 w-4" /> Route to selected
            </CardTitle>
            <CardDescription>Illustrative straight-line route only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {facilities.length === 0 && !loading ? (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <AlertTitle className="text-amber-800 dark:text-amber-300 text-sm">Route data unavailable</AlertTitle>
                <AlertDescription className="text-xs">
                  Showing destination/contact only. Follow official guidance.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destination</Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} ({f.distanceKm.toFixed(1)} km)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selected && (
                  <>
                    {/* Route visualization */}
                    <div className="rounded-md border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Crosshair className="h-4 w-4" />
                          </div>
                          <div className="text-[10px] text-muted-foreground text-center">Origin</div>
                          <div className="text-[10px] text-muted-foreground text-center">
                            {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                          </div>
                        </div>
                        <div className="flex-1 relative h-0.5 bg-border">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap bg-card px-1">
                            {routeDistanceKm.toFixed(1)} km
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="text-[10px] text-muted-foreground text-center">Destination</div>
                          <div className="text-[10px] text-muted-foreground text-center">
                            {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md border p-3">
                        <div className="text-[10px] text-muted-foreground uppercase">Distance</div>
                        <div className="font-bold">{routeDistanceKm.toFixed(1)} km</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-[10px] text-muted-foreground uppercase">ETA (illustrative)</div>
                        <div className="font-bold">~{etaMinutes} min</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Route profile</Label>
                      <Select value={routeProfile} onValueChange={(v) => setRouteProfile(v as RouteProfile)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walking">
                            <span className="flex items-center gap-2"><Footprints className="h-3.5 w-3.5" /> Walking (~5 km/h)</span>
                          </SelectItem>
                          <SelectItem value="vehicle">
                            <span className="flex items-center gap-2"><Car className="h-3.5 w-3.5" /> Vehicle (~30 km/h)</span>
                          </SelectItem>
                          <SelectItem value="accessible">
                            <span className="flex items-center gap-2"><Accessibility className="h-3.5 w-3.5" /> Accessible (~3.5 km/h)</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Accessible profile only where routing data supports it. ETA assumes a clear, straight path —
                        not real road conditions.
                      </p>
                    </div>

                    {/* Road closures note */}
                    <div className="rounded-md border border-dashed p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        No road closure data for demo route
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Known road closures are not overlaid on this illustrative route. Always confirm with local
                        transport authorities before moving.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-1.5 text-xs">
                      <div className="font-semibold">Destination details</div>
                      <div className="text-muted-foreground">{selected.address || '—'}</div>
                      {selected.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {selected.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3 w-3" /> verified{' '}
                        {selected.verifiedAt ? formatRelativeTime(selected.verifiedAt) : 'unknown'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                        <a
                          href={`https://www.openstreetmap.org/directions?from=${location.lat}%2C${location.lng}&to=${selected.lat}%2C${selected.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Open in maps
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShareRoute}>
                        <Share2 className="h-3.5 w-3.5" /> Share route
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Known road closures ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4" /> Known road closures
          </CardTitle>
          <CardDescription>Crowd-sourced and official road closure reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription className="text-xs">
              No active closures reported in demo data. In production, this list aggregates verified road
              closure reports from operators and the community.
            </AlertDescription>
          </Alert>
          <div className="rounded-md border border-dashed p-4 text-center">
            <div className="text-sm text-muted-foreground">No active closures reported near {location.name}.</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setView('reports')}
            >
              <Flag className="h-3.5 w-3.5" /> Submit road blockage report <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
