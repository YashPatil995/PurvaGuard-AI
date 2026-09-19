'use client'

import * as React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, Search, Navigation, Layers, X, AlertTriangle, ShieldCheck,
  Waves, Mountain, CloudRain, Activity, Route as RouteIcon, Info,
  Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { DEMO_REGIONS, formatRelativeTime } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MapFeature {
  id: string
  type: 'incident' | 'alert' | 'facility' | 'report' | 'hazardZone'
  lat: number
  lng: number
  title: string
  subtitle: string
  severity?: string
  status?: string
  description?: string
  createdAt?: string
  simulationMode?: boolean
}

const LAYER_CONFIG = [
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: '#dc2626', on: true },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, color: '#ea580c', on: true },
  { id: 'facilities', label: 'Safe Places', icon: ShieldCheck, color: '#059669', on: true },
  { id: 'reports', label: 'Reports', icon: MapPin, color: '#2563eb', on: false },
  { id: 'hazardZones', label: 'Hazard Zones', icon: Mountain, color: '#d97706', on: false },
] as const

// Create a colored marker icon for Leaflet
function makeIcon(color: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: 'purvaguard-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:13px;">${emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

const TYPE_ICON: Record<string, string> = {
  incident: '🚨', alert: '⚠️', facility: '🏥', report: '📍', hazardZone: '🌋',
}
const TYPE_COLOR: Record<string, string> = {
  incident: '#dc2626', alert: '#ea580c', facility: '#059669', report: '#2563eb', hazardZone: '#d97706',
}

export default function MapView() {
  const { location, setLocation } = useApp()
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const markersRef = React.useRef<L.Marker[]>([])
  const userMarkerRef = React.useRef<L.Marker | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [features, setFeatures] = React.useState<MapFeature[]>([])
  const [layers, setLayers] = React.useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_CONFIG.map((l) => [l.id, l.on]))
  )
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [selectedFeature, setSelectedFeature] = React.useState<MapFeature | null>(null)
  const [fullscreen, setFullscreen] = React.useState(false)

  // Initialize map once
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [location.lat, location.lng],
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
    })

    // OpenStreetMap tiles — real, accurate state names
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Add scale
    L.control.scale({ imperial: false, metric: true }).addTo(map)

    mapRef.current = map

    // Recompute size after mount
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Move map when location changes
  React.useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView([location.lat, location.lng], 10, { animate: true })
    // Update user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }
    const userIcon = L.divIcon({
      className: 'purvaguard-user-marker',
      html: `<div style="position:relative;width:20px;height:20px;"><span style="position:absolute;inset:0;border-radius:50%;background:#0891b2;opacity:0.3;animation:pulse 2s infinite;"></span><span style="position:absolute;inset:3px;border-radius:50%;background:#0891b2;border:2px solid white;box-shadow:0 0 8px rgba(8,145,178,0.6);"></span></div><style>@keyframes pulse{0%{transform:scale(1);opacity:0.5}70%{transform:scale(2.5);opacity:0}100%{opacity:0}}</style>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    userMarkerRef.current = L.marker([location.lat, location.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindTooltip(`📍 ${location.name}`, { permanent: false, direction: 'top' })
  }, [location])

  // Fetch features when location changes
  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    apiGet<{ facilities: any[]; incidents: any[]; alerts: any[]; reports: any[]; hazardZones: any[] }>(
      `/api/map?lat=${location.lat}&lng=${location.lng}`
    )
      .then((data) => {
        if (!active) return
        const all: MapFeature[] = [
          ...data.facilities.map((f) => ({
            id: f.id, type: 'facility' as const, lat: f.lat, lng: f.lng,
            title: f.name, subtitle: f.facilityType, status: f.status,
          })),
          ...data.incidents.map((i) => ({
            id: i.id, type: 'incident' as const, lat: i.lat, lng: i.lng,
            title: `${i.incidentType} — ${i.incidentCode}`, subtitle: i.status,
            description: i.description, createdAt: i.createdAt, severity: i.priority,
            status: i.status, simulationMode: i.simulationMode,
          })),
          ...data.alerts.map((a) => ({
            id: a.id, type: 'alert' as const, lat: a.lat ?? location.lat, lng: a.lng ?? location.lng,
            title: a.title, subtitle: a.severity, description: a.body,
            createdAt: a.issuedAt, severity: a.severity, status: a.status,
            simulationMode: a.simulationMode,
          })),
          ...data.reports.map((r) => ({
            id: r.id, type: 'report' as const, lat: r.lat, lng: r.lng,
            title: `${r.category} report`, subtitle: r.severity, description: r.description,
            createdAt: r.createdAt, severity: r.severity, status: r.status,
          })),
          ...data.hazardZones.map((h) => ({
            id: h.id, type: 'hazardZone' as const, lat: h.lat, lng: h.lng,
            title: h.name, subtitle: h.hazardType, description: `Baseline: ${h.baselineLevel}`,
          })),
        ]
        setFeatures(all)
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [location.lat, location.lng])

  // Render markers based on layer toggles
  React.useEffect(() => {
    if (!mapRef.current) return
    // Clear existing
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const visible = features.filter((f) => {
      if (f.type === 'incident') return layers.incidents
      if (f.type === 'alert') return layers.alerts
      if (f.type === 'facility') return layers.facilities
      if (f.type === 'report') return layers.reports
      if (f.type === 'hazardZone') return layers.hazardZones
      return false
    })

    for (const f of visible) {
      const icon = makeIcon(TYPE_COLOR[f.type], TYPE_ICON[f.type])
      const marker = L.marker([f.lat, f.lng], { icon })
        .addTo(mapRef.current!)
        .bindTooltip(f.title, { direction: 'top' })
        .on('click', () => setSelectedFeature(f))
      markersRef.current.push(marker)
    }
  }, [features, layers])

  // Search using Nominatim (OpenStreetMap geocoder) — real, accurate
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const q = encodeURIComponent(`${searchQuery}, India`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`, {
        headers: { 'Accept-Language': 'en' },
      })
      const data = await res.json()
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        const name = data[0].display_name.split(',').slice(0, 3).join(', ')
        setLocation({ name, lat, lng })
        mapRef.current?.setView([lat, lng], 11, { animate: true })
        toast.success(`Found: ${name}`)
      } else {
        toast.error('Location not found. Try a different search.')
      }
    } catch {
      toast.error('Search failed. Try again.')
    } finally {
      setSearching(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return }
    toast.info('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLocation({ name: 'My current location', lat, lng })
        mapRef.current?.setView([lat, lng], 12, { animate: true })
        toast.success('Located you.')
      },
      () => toast.error('Location permission denied.'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const toggleLayer = (id: string, on: boolean) => {
    setLayers((prev) => ({ ...prev, [id]: on }))
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Live Disaster Map
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive OpenStreetMap · {location.name} · {features.length} features
          </p>
        </div>
        <Badge variant="outline" className="gap-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live tiles · accurate labels
        </Badge>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search any location in India (e.g. Imphal, Manipur)…"
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching} size="icon">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={useMyLocation} className="gap-1.5">
          <Navigation className="h-4 w-4" /> My location
        </Button>
      </div>

      {/* Quick locality select */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {DEMO_REGIONS.map((r) => (
          <button
            key={r.name}
            onClick={() => setLocation({ name: r.name, lat: r.lat, lng: r.lng, localName: r.localName })}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              location.name === r.name ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
            )}
          >
            {r.name.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Map + sidebar layout */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-3">
        {/* Map */}
        <div className={cn('relative rounded-xl border overflow-hidden', fullscreen && 'fixed inset-0 z-50 rounded-none')}>
          <div ref={mapContainerRef} className={cn('w-full', fullscreen ? 'h-screen' : 'h-[60vh] sm:h-[65vh]')} />
          
          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1">
            <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={() => mapRef.current?.zoomIn()}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={() => mapRef.current?.zoomOut()}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={() => mapRef.current?.setView([location.lat, location.lng], 10)}>
              <MapPin className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {loading && (
            <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 rounded-md bg-card/90 px-3 py-1.5 text-xs shadow">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading features…
            </div>
          )}
        </div>

        {/* Layer panel */}
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Map Layers</h3>
            </div>
            <div className="space-y-2">
              {LAYER_CONFIG.map((l) => {
                const count = features.filter((f) => f.type === (l.id === 'incidents' ? 'incident' : l.id === 'alerts' ? 'alert' : l.id === 'facilities' ? 'facility' : l.id === 'reports' ? 'report' : 'hazardZone')).length
                return (
                  <div key={l.id} className="flex items-center justify-between">
                    <Label htmlFor={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">{count}</Badge>
                    </Label>
                    <Switch id={l.id} checked={layers[l.id]} onCheckedChange={(v) => toggleLayer(l.id, v)} />
                  </div>
                )
              })}
            </div>
            <Separator className="my-3" />
            <div className="text-[11px] text-muted-foreground">
              <p className="font-medium mb-1">Legend</p>
              <ul className="space-y-1">
                <li>🚨 Incidents — red</li>
                <li>⚠️ Alerts — orange</li>
                <li>🏥 Safe places — green</li>
                <li>📍 Reports — blue</li>
                <li>🌋 Hazard zones — amber</li>
              </ul>
            </div>
          </div>

          {/* Selected feature preview */}
          {selectedFeature && (
            <div className="rounded-xl border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold pr-2">{selectedFeature.title}</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setSelectedFeature(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">{selectedFeature.type}</Badge>
                {selectedFeature.severity && <Badge variant="outline" className="text-[10px]">{selectedFeature.severity}</Badge>}
                {selectedFeature.status && <Badge variant="outline" className="text-[10px]">{selectedFeature.status}</Badge>}
                {selectedFeature.simulationMode && <Badge variant="outline" className="text-[10px] bg-amber-50">DEMO</Badge>}
              </div>
              {selectedFeature.description && <p className="text-xs text-muted-foreground">{selectedFeature.description}</p>}
              {selectedFeature.createdAt && <p className="text-[10px] text-muted-foreground">{formatRelativeTime(selectedFeature.createdAt)}</p>}
              <p className="text-[10px] text-muted-foreground font-mono">{selectedFeature.lat.toFixed(4)}, {selectedFeature.lng.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Map tiles © OpenStreetMap contributors. Map data is for decision-support only — not an official warning.
      </p>
    </div>
  )
}
