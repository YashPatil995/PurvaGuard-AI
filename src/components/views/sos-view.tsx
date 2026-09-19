'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Siren, MapPin, Phone, Plus, Trash2, Shield, ShieldCheck, AlertTriangle,
  PhoneCall, ChevronRight, Loader2, Navigation, Clock, Crosshair, CloudOff,
  FileText, X, RefreshCw,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import { formatRelativeTime } from '@/lib/constants'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  SimulationBadge, StatusBadge, DemoBadge, VerificationBadge,
} from '@/components/shared/badges'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────
interface SavedLocation {
  lat: number
  lng: number
  accuracyM: number | null
  capturedAt: string
  expiresAt: string
}

interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  verified: boolean
}

interface SosIncidentSummary {
  id: string
  incidentCode: string
  status: string
  priority: string
  description: string
  lat: number
  lng: number
  locationKind: string
  peopleCount: number
  createdAt: string
  simulationMode: boolean
}

interface IncidentEventRow {
  id: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  createdAt: string
}

interface IncidentDetail {
  incident: {
    id: string
    incidentCode: string
    incidentType: string
    priority: string
    status: string
    description: string
    lat: number
    lng: number
    locationAccuracyM: number | null
    locationKind: string
    peopleCount: number
    needs: string | null
    reporterContact: string | null
    verificationStatus: string
    simulationMode: boolean
    createdAt: string
    updatedAt: string
    closedAt: string | null
  }
  events: IncidentEventRow[]
  assignments: any[]
  deliveries: any[]
}

type DeliveryStage = 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'CLOSED'

const EMERGENCY_TYPES: { value: string; label: string }[] = [
  { value: 'trapped', label: 'Trapped' },
  { value: 'injured', label: 'Injured' },
  { value: 'flood', label: 'Flood' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'road blocked', label: 'Road blocked' },
  { value: 'missing person', label: 'Missing person' },
  { value: 'other', label: 'Other' },
]

const NEED_OPTIONS = [
  { value: 'medical', label: 'Medical' },
  { value: 'rescue', label: 'Rescue' },
  { value: 'food_water', label: 'Food / water' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'accessibility', label: 'Accessibility (wheelchair / visual / etc.)' },
  { value: 'translation', label: 'Translation help' },
  { value: 'children_elderly', label: 'Children / elderly support' },
]

const DELIVERY_STEPS: { key: DeliveryStage; label: string; desc: string }[] = [
  { key: 'QUEUED', label: 'Queued offline', desc: 'Stored locally until connection' },
  { key: 'SENT', label: 'Sent to platform', desc: 'Reached PurvaGuard AI server' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged by operator', desc: 'District operator queue has it' },
  { key: 'ASSIGNED', label: 'Assigned', desc: 'A responder team has been assigned' },
  { key: 'CLOSED', label: 'Closed', desc: 'Resolved or closed' },
]

const STAGE_ORDER: Record<DeliveryStage, number> = {
  QUEUED: 0,
  SENT: 1,
  ACKNOWLEDGED: 2,
  ASSIGNED: 3,
  CLOSED: 4,
}

// ── Helpers ──────────────────────────────────────────────────────────────
const LAST_LOC_KEY = 'purvaguard-last-location'
const CONTACTS_KEY = 'purvaguard-contacts'

function captureGeolocation(): Promise<{ lat: number; lng: number; accuracyM: number | null }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Use manual location instead.'))
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('Location is unavailable right now.'))
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Timed out while fetching location.'))
        } else {
          reject(new Error('Could not capture location.'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

function loadSavedLocation(): SavedLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_LOC_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedLocation
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(LAST_LOC_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveSavedLocation(loc: { lat: number; lng: number; accuracyM: number | null }) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const data: SavedLocation = {
    lat: loc.lat,
    lng: loc.lng,
    accuracyM: loc.accuracyM,
    capturedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 24 * 3600 * 1000).toISOString(),
  }
  window.localStorage.setItem(LAST_LOC_KEY, JSON.stringify(data))
}

function clearSavedLocation() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LAST_LOC_KEY)
}

function loadContacts(): EmergencyContact[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY)
    if (!raw) {
      // Seed a demo contact on first read.
      const seed: EmergencyContact[] = [
        { id: 'demo-seed', name: 'Family Member (demo)', relationship: 'family', phone: '+91-XXXXX-XXXXX', verified: false },
      ]
      window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(seed))
      return seed
    }
    return JSON.parse(raw) as EmergencyContact[]
  } catch {
    return []
  }
}

function saveContacts(contacts: EmergencyContact[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts))
}

// ── Main view ────────────────────────────────────────────────────────────
export default function SosView() {
  const { location, connectivity } = useApp()
  const [saveLocOn, setSaveLocOn] = React.useState(false)
  const [savedLocation, setSavedLocation] = React.useState<SavedLocation | null>(null)
  const [contacts, setContacts] = React.useState<EmergencyContact[]>([])
  const [showAddContact, setShowAddContact] = React.useState(false)
  const [newContact, setNewContact] = React.useState({ name: '', relationship: '', phone: '' })

  // SOS form state
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [emergencyType, setEmergencyType] = React.useState('trapped')
  const [sosDescription, setSosDescription] = React.useState('')
  const [peopleCount, setPeopleCount] = React.useState('1')
  const [needs, setNeeds] = React.useState<string[]>([])
  const [contactPhone, setContactPhone] = React.useState('')
  const [latOverride, setLatOverride] = React.useState<string>('')
  const [lngOverride, setLngOverride] = React.useState<string>('')
  const [attachmentName, setAttachmentName] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitResult, setSubmitResult] = React.useState<{
    incidentCode: string
    stage: DeliveryStage
    incidentId: string
  } | null>(null)

  // My incidents
  const [incidents, setIncidents] = React.useState<SosIncidentSummary[]>([])
  const [loadingIncidents, setLoadingIncidents] = React.useState(true)
  const [selectedIncident, setSelectedIncident] = React.useState<IncidentDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Initialise from local storage.
  React.useEffect(() => {
    setSavedLocation(loadSavedLocation())
    setContacts(loadContacts())
    if (typeof window !== 'undefined') {
      setSaveLocOn(window.localStorage.getItem(LAST_LOC_KEY) !== null)
    }
  }, [])

  // Prefill manual override with app location when not provided.
  React.useEffect(() => {
    if (!latOverride) setLatOverride(String(location.lat))
    if (!lngOverride) setLngOverride(String(location.lng))
  }, [location.lat, location.lng])

  const refreshIncidents = React.useCallback(async () => {
    setLoadingIncidents(true)
    try {
      const res = await apiGet<{ items: SosIncidentSummary[] }>('/api/sos?limit=20')
      setIncidents(res.items ?? [])
    } catch (err: any) {
      // Silent: feed will just be empty.
      console.warn('Failed to load incidents', err)
      setIncidents([])
    } finally {
      setLoadingIncidents(false)
    }
  }, [])

  React.useEffect(() => {
    refreshIncidents()
  }, [refreshIncidents])

  // ── Handlers ──────────────────────────────────────────────────────────
  async function handleToggleSaveLoc(checked: boolean) {
    setSaveLocOn(checked)
    if (checked) {
      try {
        const pos = await captureGeolocation()
        saveSavedLocation(pos)
        setSavedLocation(loadSavedLocation())
        toast.success('Last location saved locally (24h).')
      } catch (err: any) {
        toast.error(err?.message ?? 'Could not capture location.')
        setSaveLocOn(false)
      }
    } else {
      clearSavedLocation()
      setSavedLocation(null)
      toast.info('Last location cleared.')
    }
  }

  async function handleRefreshSavedLoc() {
    try {
      const pos = await captureGeolocation()
      saveSavedLocation(pos)
      setSavedLocation(loadSavedLocation())
      toast.success('Last location refreshed.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not capture location.')
    }
  }

  function handleDeleteSavedLoc() {
    clearSavedLocation()
    setSavedLocation(null)
    setSaveLocOn(false)
    toast.info('Last location deleted.')
  }

  function handleAddContact() {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error('Name and phone are required.')
      return
    }
    const next: EmergencyContact = {
      id: `local-${Date.now()}`,
      name: newContact.name.trim(),
      relationship: newContact.relationship.trim() || 'family',
      phone: newContact.phone.trim(),
      verified: false,
    }
    const updated = [...contacts, next]
    setContacts(updated)
    saveContacts(updated)
    setNewContact({ name: '', relationship: '', phone: '' })
    setShowAddContact(false)
    toast.success('Contact saved locally (not yet verified).')
  }

  function handleRemoveContact(id: string) {
    const updated = contacts.filter((c) => c.id !== id)
    setContacts(updated)
    saveContacts(updated)
    toast.info('Contact removed.')
  }

  function toggleNeed(value: string) {
    setNeeds((cur) => (cur.includes(value) ? cur.filter((n) => n !== value) : [...cur, value]))
  }

  async function resolveLocationForSos(): Promise<{
    lat: number
    lng: number
    accuracyM: number | null
    locationKind: 'GPS' | 'LAST_KNOWN' | 'MANUAL'
    sourceLabel: string
  }> {
    // Manual override takes priority if filled.
    const mLat = Number(latOverride)
    const mLng = Number(lngOverride)
    if (Number.isFinite(mLat) && Number.isFinite(mLng) && latOverride && lngOverride) {
      return { lat: mLat, lng: mLng, accuracyM: null, locationKind: 'MANUAL', sourceLabel: 'manual location' }
    }
    // Try GPS.
    try {
      const pos = await captureGeolocation()
      return { ...pos, locationKind: 'GPS', sourceLabel: 'live GPS' }
    } catch (err) {
      // Fall back to last known.
      const last = loadSavedLocation()
      if (last) {
        return {
          lat: last.lat,
          lng: last.lng,
          accuracyM: last.accuracyM,
          locationKind: 'LAST_KNOWN',
          sourceLabel: `last known (${formatRelativeTime(last.capturedAt)})`,
        }
      }
      // Fall back to app-selected location.
      return {
        lat: location.lat,
        lng: location.lng,
        accuracyM: null,
        locationKind: 'MANUAL',
        sourceLabel: 'manual location',
      }
    }
  }

  async function handleSubmitSos() {
    setSubmitting(true)
    try {
      const loc = await resolveLocationForSos()
      const payload: any = {
        lat: loc.lat,
        lng: loc.lng,
        accuracyM: loc.accuracyM,
        locationKind: loc.locationKind,
        peopleCount: Number(peopleCount) || 1,
        emergencyType,
        description: sosDescription.trim(),
        needs,
        contact: contactPhone.trim() || undefined,
        consent: true,
      }
      const res = await apiPost<{
        incident: { id: string; incidentCode: string }
        deliveryStatus: string
      }>('/api/sos', payload)
      setSubmitResult({
        incidentCode: res.incident.incidentCode,
        stage: 'ACKNOWLEDGED',
        incidentId: res.incident.id,
      })
      setConfirmOpen(false)
      toast.success(`SOS submitted — ${res.incident.incidentCode}`, {
        description: res.deliveryStatus,
      })
      refreshIncidents()
    } catch (err: any) {
      // Offline / weak path — store a queued record locally.
      if (typeof window !== 'undefined') {
        const qRaw = window.localStorage.getItem('purvaguard-sos-queue')
        const q = qRaw ? (JSON.parse(qRaw) as any[]) : []
        q.push({
          queuedAt: new Date().toISOString(),
          payload: { emergencyType, description: sosDescription, peopleCount, needs, contact: contactPhone },
        })
        window.localStorage.setItem('purvaguard-sos-queue', JSON.stringify(q))
      }
      setSubmitResult({
        incidentCode: 'QUEUED-OFFLINE',
        stage: 'QUEUED',
        incidentId: '',
      })
      toast.error('Offline — SOS queued locally. Will retry when back online.', {
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function openIncidentDetail(id: string) {
    setSheetOpen(true)
    setLoadingDetail(true)
    setSelectedIncident(null)
    try {
      const res = await apiGet<IncidentDetail>(`/api/incidents/${id}`)
      setSelectedIncident(res)
      // Bump submitResult stage if this incident is the just-submitted one.
      if (submitResult?.incidentId === id) {
        const statusMap: Record<string, DeliveryStage> = {
          NEW: 'ACKNOWLEDGED',
          TRIAGED: 'ACKNOWLEDGED',
          VERIFIED: 'ACKNOWLEDGED',
          ASSIGNED: 'ASSIGNED',
          RESPONDING: 'ASSIGNED',
          RESOLVED: 'CLOSED',
          CANCELLED: 'CLOSED',
          DUPLICATE: 'CLOSED',
          UNVERIFIED_CLOSED: 'CLOSED',
        }
        setSubmitResult((cur) => (cur ? { ...cur, stage: statusMap[res.incident.status] ?? 'ACKNOWLEDGED' } : cur))
      }
    } catch (err: any) {
      toast.error('Failed to load incident detail.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const currentStageIdx = submitResult ? STAGE_ORDER[submitResult.stage] : -1

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* SIMULATED banner */}
      <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>SIMULATED — NOT SENT TO GOVERNMENT OR EMERGENCY SERVICES</AlertTitle>
        <AlertDescription>
          The SOS flow on this demo only stores the report inside the PurvaGuard AI platform and shows a
          simulated operator handoff. <strong>In a real emergency, call your local authority directly.</strong>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Siren className="h-6 w-6 text-destructive" />
            SOS / Get Help
          </h1>
          <p className="text-sm text-muted-foreground">
            Active location: <span className="font-medium text-foreground">{location.name}</span>
            {connectivity === 'OFFLINE' && (
              <Badge variant="outline" className="ml-2 border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <CloudOff className="h-3 w-3" /> Offline
              </Badge>
            )}
          </p>
        </div>
        <SimulationBadge />
      </div>

      {/* ── Section 1: Before an emergency ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Before an emergency
          </CardTitle>
          <CardDescription>
            Prepare now so help can reach you faster. These details stay on this device unless you submit an SOS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Save my last location */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="save-loc" className="text-sm font-semibold">
                  Save my last location
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stores your last GPS fix + timestamp + accuracy on this device only (24h). Visible only to
                  you and to the platform during an active SOS. You can delete it any time.
                </p>
              </div>
              <Switch id="save-loc" checked={saveLocOn} onCheckedChange={handleToggleSaveLoc} />
            </div>
            {saveLocOn && (
              <div className="rounded-md bg-muted/50 p-3 text-xs space-y-2">
                {savedLocation ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Crosshair className="h-3 w-3" />
                        <span className="font-medium">
                          {savedLocation.lat.toFixed(5)}, {savedLocation.lng.toFixed(5)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Last known: {formatRelativeTime(savedLocation.capturedAt)}
                        {savedLocation.accuracyM !== null && (
                          <> · accuracy ±{Math.round(savedLocation.accuracyM)}m</>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={handleRefreshSavedLoc} className="h-7">
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleDeleteSavedLoc} className="h-7 text-destructive">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Capturing…</div>
                )}
              </div>
            )}
          </div>

          {/* Emergency contacts */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">Emergency contacts</Label>
                <p className="text-xs text-muted-foreground">Stored on this device only.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowAddContact((v) => !v)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {showAddContact && (
              <div className="rounded-md bg-muted/40 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))}
                />
                <Input
                  placeholder="Relationship (e.g. spouse)"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact((c) => ({ ...c, relationship: e.target.value }))}
                />
                <Input
                  placeholder="Phone (e.g. +91-…)"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddContact}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddContact(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <ul className="space-y-1.5">
              {contacts.length === 0 && (
                <li className="text-xs text-muted-foreground">No contacts saved yet.</li>
              )}
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">· {c.relationship}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.verified ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <VerificationBadge status="UNVERIFIED" />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleRemoveContact(c.id)}
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Offline emergency card summary */}
          <div className="rounded-lg border border-dashed p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CloudOff className="h-4 w-4" />
              <Label className="text-sm font-semibold">Offline emergency card</Label>
              <Badge variant="outline" className="text-[10px] font-bold uppercase border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                Available offline
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This summary stays accessible without a connection. It includes your name (if provided),
              essential needs, emergency contacts and last-synced local instructions.
            </p>
            <ul className="text-xs space-y-1 mt-1 text-muted-foreground">
              <li>• Contacts: {contacts.length} saved</li>
              <li>• Last location: {savedLocation ? formatRelativeTime(savedLocation.capturedAt) : 'not saved'}</li>
              <li>• Local instructions: "Move to higher ground. Avoid riverbanks. Keep your phone dry and charged."</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: SOS initiation ───────────────────────────────── */}
      <Card className="border-red-300 dark:border-red-900 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Siren className="h-4 w-4" /> SOS initiation
          </CardTitle>
          <CardDescription>
            Use only in a real emergency. The platform will store your location, emergency type, and contact
            (if provided). All simulated — no real authority is contacted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="em-type" className="text-xs">Emergency type</Label>
              <Select value={emergencyType} onValueChange={setEmergencyType}>
                <SelectTrigger id="em-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMERGENCY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcount" className="text-xs">Number of people</Label>
              <Input
                id="pcount"
                type="number"
                min={1}
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sos-desc" className="text-xs">Short description (optional)</Label>
            <Textarea
              id="sos-desc"
              rows={2}
              maxLength={500}
              placeholder="e.g. 'Family stranded near swollen stream, water rising fast.'"
              value={sosDescription}
              onChange={(e) => setSosDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Urgent needs (optional)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NEED_OPTIONS.map((n) => (
                <label
                  key={n.value}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox checked={needs.includes(n.value)} onCheckedChange={() => toggleNeed(n.value)} />
                  {n.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-phone" className="text-xs">Your contact phone (optional)</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+91-XXXXXXXXXX"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Location override (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Latitude"
                value={latOverride}
                onChange={(e) => setLatOverride(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Longitude"
                value={lngOverride}
                onChange={(e) => setLngOverride(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              If left blank, we'll capture GPS, fall back to last-known, then to the app's selected location.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sos-attach" className="text-xs">Photo / audio attachment (optional)</Label>
            <Input
              id="sos-attach"
              type="file"
              accept="image/*,audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setAttachmentName(f.name)
                  toast.info(`Attachment queued: ${f.name} (not uploaded in MVP)`)
                }
              }}
            />
            {attachmentName && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> {attachmentName} · attachment queued
              </div>
            )}
          </div>

          {/* Confirm dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="lg" className="w-full text-base h-12 font-bold gap-2">
                <Siren className="h-5 w-5" /> Send SOS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Confirm Send SOS
                </DialogTitle>
                <DialogDescription>
                  You are about to submit a simulated SOS. This will share:
                </DialogDescription>
              </DialogHeader>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Your location (GPS / last-known / manual)</li>
                <li>• Emergency type: <strong className="text-foreground">{emergencyType}</strong></li>
                <li>• People count: <strong className="text-foreground">{peopleCount || 1}</strong></li>
                {needs.length > 0 && <li>• Needs: <strong className="text-foreground">{needs.join(', ')}</strong></li>}
                {contactPhone.trim() && <li>• Your contact phone</li>}
              </ul>
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
                <AlertTitle className="text-amber-800 dark:text-amber-300">SIMULATED</AlertTitle>
                <AlertDescription className="text-xs">
                  No real government or emergency service will be notified. In a real emergency call your local
                  authority directly (e.g. 112 in India).
                </AlertDescription>
              </Alert>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleSubmitSos} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
                  Send SOS now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delivery stepper */}
          {submitResult && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Incident code</div>
                  <div className="font-mono text-lg font-bold">{submitResult.incidentCode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SimulationBadge />
                  {submitResult.stage === 'QUEUED' && <DemoBadge />}
                </div>
              </div>
              <ol className="space-y-2">
                {DELIVERY_STEPS.map((step, idx) => {
                  const reached = idx <= currentStageIdx
                  const current = idx === currentStageIdx
                  return (
                    <li key={step.key} className="flex items-start gap-2">
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          reached
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted text-muted-foreground border',
                          current && 'ring-2 ring-emerald-400 ring-offset-1'
                        )}
                      >
                        {reached ? '✓' : idx + 1}
                      </div>
                      <div className="text-xs">
                        <div className={cn('font-semibold', reached ? 'text-foreground' : 'text-muted-foreground')}>
                          {step.label}
                        </div>
                        <div className="text-muted-foreground">{step.desc}</div>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <Progress value={((currentStageIdx + 1) / DELIVERY_STEPS.length) * 100} className="h-1.5" />
              {submitResult.incidentId && (
                <Button variant="outline" size="sm" onClick={() => openIncidentDetail(submitResult.incidentId)}>
                  View status timeline <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Official emergency services card */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-destructive" />
              <Label className="text-sm font-semibold">Contact official emergency services directly</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Numbers shown are demo placeholders. In a real emergency, contact your local authority directly.
            </p>
            <Button asChild variant="destructive" size="sm" className="gap-1.5">
              <a href="tel:112">
                <PhoneCall className="h-3.5 w-3.5" /> Call 112
                <span className="text-[10px] font-normal opacity-90">(demo placeholder number)</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: My incidents ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> My incidents
          </CardTitle>
          <CardDescription>Recent SOS submissions (demo shows all recent SOS records).</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIncidents ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No SOS submitted yet.</div>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {incidents.map((inc) => (
                <li
                  key={inc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold">{inc.incidentCode}</span>
                      <StatusBadge status={inc.status} />
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase">{inc.priority}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{inc.locationKind}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {inc.description || '(no description)'} · {inc.peopleCount} ppl · {formatRelativeTime(inc.createdAt)}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openIncidentDetail(inc.id)}>
                    View status <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Incident timeline sheet ──────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Siren className="h-4 w-4" /> Incident timeline
            </SheetTitle>
            <SheetDescription>
              {selectedIncident
                ? `${selectedIncident.incident.incidentCode} · ${selectedIncident.incident.incidentType}`
                : 'Loading incident…'}
            </SheetDescription>
          </SheetHeader>
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : selectedIncident ? (
            <div className="p-4 space-y-4">
              <div className="rounded-md border p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{selectedIncident.incident.incidentCode}</span>
                  <StatusBadge status={selectedIncident.incident.status} />
                  <SimulationBadge />
                </div>
                <div className="text-muted-foreground">
                  <MapPin className="inline h-3 w-3" /> {selectedIncident.incident.lat.toFixed(5)}, {selectedIncident.incident.lng.toFixed(5)} ({selectedIncident.incident.locationKind})
                </div>
                <div className="text-muted-foreground">
                  <Clock className="inline h-3 w-3" /> Reported {formatRelativeTime(selectedIncident.incident.createdAt)}
                </div>
                <div className="text-muted-foreground">
                  People: {selectedIncident.incident.peopleCount} · Priority: {selectedIncident.incident.priority}
                </div>
                {selectedIncident.incident.description && (
                  <div className="text-foreground pt-1">{selectedIncident.incident.description}</div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Timeline ({selectedIncident.events.length})
                </h4>
                {selectedIncident.events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events recorded.</p>
                ) : (
                  <ol className="space-y-3 border-l pl-4 ml-1">
                    {selectedIncident.events.map((ev) => (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <div className="text-xs font-semibold">
                          {ev.eventType.replace(/_/g, ' ')}
                          {ev.toStatus && <span className="text-muted-foreground"> → {ev.toStatus}</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(ev.createdAt)}
                        </div>
                        {ev.note && <div className="text-xs text-foreground/80 mt-0.5">{ev.note}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {selectedIncident.assignments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Assignments ({selectedIncident.assignments.length})
                    </h4>
                    <ul className="space-y-1 text-xs">
                      {selectedIncident.assignments.map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span>{a.assignedBy ? `By ${a.assignedBy}` : 'Team assigned'}</span>
                          <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {selectedIncident.deliveries.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Notification deliveries ({selectedIncident.deliveries.length})
                    </h4>
                    <ul className="space-y-1 text-xs">
                      {selectedIncident.deliveries.map((d: any) => (
                        <li key={d.id} className="flex items-center justify-between gap-2">
                          <span>{d.recipient} · {d.channel}</span>
                          <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
