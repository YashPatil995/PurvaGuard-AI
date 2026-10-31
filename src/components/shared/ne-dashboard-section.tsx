'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NE_STATES, type NeState } from '@/lib/ne-geo'
import { formatRelativeTime } from '@/lib/constants'
import {
  ShieldAlert, Activity, Waves, ExternalLink, RefreshCw, Filter,
  MapPin, CheckCircle2, Clock, Globe, ArrowUpRight, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface NeDashboardData {
  region: string
  statesCovered: string[]
  filter: { state: string; hazard: string }
  counts: { totalNeAlerts: number; totalNeEarthquakes: number }
  stateSummary: Record<string, { alerts: number; earthquakes: number }>
  alerts: Array<{
    id: string
    title: string
    body: string
    alertType: string
    severity: string
    issuerType: string
    issuerName: string
    sourceUrl: string | null
    issuedAt: string
    expiresAt: string
    status: string
    verificationStatus: string
    simulationMode: boolean
    affectedStates: string[]
  }>
  earthquakes: Array<{
    id: string
    eventId: string
    magnitude: number
    depthKm: number
    lat: number
    lng: number
    place: string
    region: string
    state: string | null
    eventTime: string
    sourceUrl: string
    source: string
    riskLevel: string
    riskScore: number
    isScientificObservation: boolean
  }>
  dataSources: Array<{
    id: string
    name: string
    provider: string
    healthStatus: string
    lastSuccessAt: string | null
  }>
  timestamp: string
}

export function NeDashboardSection() {
  const [data, setData] = React.useState<NeDashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedState, setSelectedState] = React.useState<string>('ALL')
  const [selectedHazard, setSelectedHazard] = React.useState<string>('ALL')
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date())

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const qState = selectedState !== 'ALL' ? `state=${encodeURIComponent(selectedState)}` : ''
      const qHazard = selectedHazard !== 'ALL' ? `hazard=${encodeURIComponent(selectedHazard)}` : ''
      const qs = [qState, qHazard].filter(Boolean).join('&')
      const res = await fetch(`/api/ne/dashboard${qs ? `?${qs}` : ''}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefreshed(new Date())
      } else {
        toast.error('Failed to load North-East disaster telemetry')
      }
    } catch {
      toast.error('Network error loading North-East telemetry')
    } finally {
      setLoading(false)
    }
  }, [selectedState, selectedHazard])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Top Banner & State Filter */}
      <div className="rounded-xl border bg-gradient-to-r from-blue-950/40 via-card to-emerald-950/20 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Globe className="h-4 w-4" />
              <span>North-East India Disaster Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Eight States Real-Time Early Warning &amp; Seismic Stream
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Correlated stream combining official civil warnings from <strong>NDMA SACHET</strong> (CAP v1.2) and scientific space-borne seismic telemetry from <strong>NESAC / NER-DRR</strong> (ISRO).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 h-8 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Feed
            </Button>
          </div>
        </div>

        {/* State Filter Pills */}
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> State:
          </span>
          <Button
            size="sm"
            variant={selectedState === 'ALL' ? 'default' : 'outline'}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setSelectedState('ALL')}
          >
            All 8 States
          </Button>
          {NE_STATES.map((st) => {
            const counts = data?.stateSummary?.[st]
            const total = (counts?.alerts || 0) + (counts?.earthquakes || 0)
            return (
              <Button
                key={st}
                size="sm"
                variant={selectedState === st ? 'default' : 'outline'}
                className="h-7 text-xs rounded-full px-2.5 gap-1"
                onClick={() => setSelectedState(st)}
              >
                <span>{st}</span>
                {total > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] rounded-full">
                    {total}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Two-Column Intelligence Grid: SACHET Warnings (Left) vs NER-DRR Seismic (Right) */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* COLUMN 1: Official NDMA SACHET Warnings */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Official Civil Disaster Alerts (NDMA SACHET)
                </CardTitle>
                <CardDescription className="text-xs">
                  Authoritative warnings issued by IMD, CWC &amp; State Disaster Management Authorities.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {data?.alerts.length || 0} in NE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !data?.alerts || data.alerts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No active severe weather or flood warnings currently issued by NDMA SACHET for {selectedState === 'ALL' ? 'North-East India' : selectedState}.
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border bg-muted/20 hover:bg-muted/40 p-3 space-y-2 transition-colors text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="destructive" className="h-5 text-[10px] font-bold">
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="h-5 text-[10px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        OFFICIAL (CAP 1.2)
                      </Badge>
                      {alert.affectedStates.map((st) => (
                        <Badge key={st} variant="secondary" className="h-5 text-[10px]">
                          📍 {st}
                        </Badge>
                      ))}
                    </div>
                    {alert.sourceUrl && (
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5 shrink-0 text-[11px]"
                      >
                        Source <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <p className="font-semibold text-foreground leading-snug break-words whitespace-normal">
                    {alert.title}
                  </p>

                  {alert.body && alert.body !== alert.title && (
                    <p className="text-xs text-foreground/80 leading-relaxed break-words whitespace-normal">
                      {alert.body}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>🏢 {alert.issuerName}</span>
                    <span>🕒 {formatRelativeTime(alert.issuedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* COLUMN 2: Scientific NESAC NER-DRR Seismic Telemetry */}
        <Card className="border-t-4 border-t-cyan-500 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  Scientific Seismic Telemetry (NESAC NER-DRR)
                </CardTitle>
                <CardDescription className="text-xs">
                  Space &amp; ground-sensor earthquake observations from the National Centre for Seismology &amp; ISRO.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {data?.earthquakes.length || 0} Events
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !data?.earthquakes || data.earthquakes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                <Activity className="h-8 w-8 text-cyan-500 mx-auto mb-2 opacity-60" />
                No seismic events recorded for {selectedState === 'ALL' ? 'North-East India' : selectedState} in the last 24 hours.
              </div>
            ) : (
              data.earthquakes.map((eq) => (
                <div
                  key={eq.id}
                  className="rounded-lg border bg-muted/20 hover:bg-muted/40 p-3 space-y-2 transition-colors text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="h-5 text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30">
                        {eq.magnitude} M
                      </Badge>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        Depth: {eq.depthKm} km
                      </Badge>
                      {eq.state && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                          📍 {eq.state}
                        </Badge>
                      )}
                      <Badge variant="outline" className="h-5 text-[10px] font-medium text-muted-foreground">
                        SCIENTIFIC TELEMETRY
                      </Badge>
                    </div>
                    {eq.sourceUrl && (
                      <a
                        href={eq.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5 shrink-0 text-[11px]"
                      >
                        NCS Portal <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <p className="font-medium text-foreground">
                    {eq.place}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>🛰️ {eq.source}</span>
                    <span>📍 Lat: {eq.lat.toFixed(2)}°, Lng: {eq.lng.toFixed(2)}°</span>
                    <span>🕒 {formatRelativeTime(eq.eventTime)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
