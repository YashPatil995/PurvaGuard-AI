'use client'

import * as React from 'react'
import {
  Settings, Lock, Newspaper, Building2, MapPin, Users, ShieldCheck, Save,
  Plus, Pencil, Archive, X, RefreshCw, CheckCircle2, Trash2, Power, Pin,
  PinOff, Database, AlertTriangle,
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
import { StatusBadge, SimulationBadge } from '@/components/shared/badges'
import { cn } from '@/lib/utils'

// ─── Locked card ─────────────────────────────────────────────────────
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
              <CardTitle>Admin Console</CardTitle>
              <CardDescription>Restricted to platform administrators</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Admin Console is restricted to platform administrators. Switch your demo role
            (top-right) to <strong>Platform Admin</strong> to access this view.
          </p>
          <p className="text-xs text-muted-foreground">
            Current role: <Badge variant="outline" className="font-mono">{role}</Badge>
          </p>
          <Button size="sm" onClick={() => setRole('ADMIN')}>Switch to Admin</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Overview tab ────────────────────────────────────────────────────
function OverviewTab() {
  const [counts, setCounts] = React.useState<{
    alerts: number; incidents: number; news: number; facilities: number; regions: number; volunteers: number
  } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [alerts, incidents, news, facilities, regions, volunteers] = await Promise.all([
          apiGet<{ items: any[]; total: number }>(`/api/ops/alerts`).catch(() => ({ items: [], total: 0 })),
          apiGet<{ items: any[]; total: number }>(`/api/ops/incidents?limit=500`).catch(() => ({ items: [], total: 0 })),
          apiGet<{ items: any[]; total: number }>(`/api/admin/news`).catch(() => ({ items: [], total: 0 })),
          apiGet<{ items: any[]; total: number }>(`/api/admin/facilities`).catch(() => ({ items: [], total: 0 })),
          apiGet<{ items: any[]; total: number }>(`/api/admin/regions`).catch(() => ({ items: [], total: 0 })),
          apiGet<{ items: any[]; total: number }>(`/api/admin/volunteers`).catch(() => ({ items: [], total: 0 })),
        ])
        if (cancelled) return
        setCounts({
          alerts: alerts.total,
          incidents: incidents.total,
          news: news.total,
          facilities: facilities.total,
          regions: regions.total,
          volunteers: volunteers.total,
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const cards = counts
    ? [
        { label: 'Alerts (all statuses)', value: counts.alerts, icon: Newspaper, tone: 'text-red-600 dark:text-red-300' },
        { label: 'Incidents', value: counts.incidents, icon: AlertTriangle, tone: 'text-orange-600 dark:text-orange-300' },
        { label: 'News items', value: counts.news, icon: Newspaper, tone: 'text-blue-600 dark:text-blue-300' },
        { label: 'Facilities', value: counts.facilities, icon: Building2, tone: 'text-emerald-600 dark:text-emerald-300' },
        { label: 'Regions / localities', value: counts.regions, icon: MapPin, tone: 'text-violet-600 dark:text-violet-300' },
        { label: 'Volunteers', value: counts.volunteers, icon: Users, tone: 'text-teal-600 dark:text-teal-300' },
      ]
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          demo mode: ON
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Audit logging active
        </Badge>
        <span className="text-xs text-muted-foreground">
          Simulation labels are shown on every simulated object so demo audiences can distinguish synthetic from live data.
        </span>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="py-4">
              <CardContent className="flex items-center gap-3 px-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-muted', c.tone)}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className={cn('text-2xl font-bold tabular-nums', c.tone)}>{c.value}</span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">{c.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" /> Data-source health
          </CardTitle>
          <CardDescription className="text-xs">Health summary pulled from the operations console.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataHealthInline />
        </CardContent>
      </Card>
    </div>
  )
}

function DataHealthInline() {
  const [data, setData] = React.useState<any>(null)
  React.useEffect(() => {
    apiGet<any>(`/api/ops/data-health`)
      .then(setData)
      .catch(() => {})
  }, [])
  if (!data) return <Skeleton className="h-12 w-full" />
  const s = data.freshnessSummary
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
      <Pill label="Total sources" value={s.total} />
      <Pill label="Healthy" value={s.healthy} tone="good" />
      <Pill label="Degraded" value={s.degraded} tone="warn" />
      <Pill label="Errored" value={s.errored} tone="bad" />
      <Pill label="Simulated" value={s.simulated} tone="default" />
    </div>
  )
}

function Pill({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
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

// ─── News tab ────────────────────────────────────────────────────────
function NewsTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<any | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/news`)
      setItems(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load news', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, refreshKey])

  async function togglePin(item: any) {
    try {
      await apiPatch(`/api/admin/news/${item.id}`, { pinned: !item.pinned })
      toast.success(item.pinned ? 'News unpinned' : 'News pinned', { description: 'Action logged.' })
      await load()
      onRefresh()
    } catch (e) {
      toast.error('Failed to toggle pin', { description: String(e) })
    }
  }

  async function archive(id: string) {
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`API ${res.status}`)
      toast.success('News archived', { description: 'Status set to ARCHIVED. Action logged.' })
      await load()
      onRefresh()
    } catch (e) {
      toast.error('Archive failed', { description: String(e) })
    }
  }

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Newspaper className="h-4 w-4" /> News & updates
            </CardTitle>
            <CardDescription className="text-xs">Create, edit, pin, or archive news items.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Publisher</TableHead>
                <TableHead className="text-xs">Categories</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Pinned</TableHead>
                <TableHead className="text-xs">Published</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">No news items yet.</TableCell></TableRow>
              )}
              {!loading && items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="max-w-[280px]">
                    <div className="text-xs font-medium truncate">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{n.summary}</div>
                    {n.demoLabel && <Badge variant="outline" className="mt-0.5 text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">DEMO</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{n.publisher}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{n.categories}</Badge></TableCell>
                  <TableCell><StatusBadge status={n.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => togglePin(n)} aria-label="Toggle pin">
                      {n.pinned ? <Pin className="h-3.5 w-3.5 text-amber-500" /> : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs">{n.publishedAt ? formatRelativeTime(n.publishedAt) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(n)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" aria-label="Archive">
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive “{n.title}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will soft-delete the news item (status: ARCHIVED). The row will be retained for audit. Bulk actions are not required for this MVP.
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
        <p className="text-[11px] text-muted-foreground mt-2">
          Action logged. All mutations create an AuditLog entry authored by the seeded admin user.
        </p>
      </CardContent>

      <NewsFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => { await load(); onRefresh() }}
      />
      <NewsFormDialog
        open={!!editItem}
        onOpenChange={(v) => !v && setEditItem(null)}
        existing={editItem}
        onSaved={async () => { setEditItem(null); await load(); onRefresh() }}
      />
    </Card>
  )
}

function NewsFormDialog({
  open, onOpenChange, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  existing?: any | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    title: '', summary: '', publisher: '', sourceUrl: '', categories: 'GENERAL', pinned: false, status: 'PUBLISHED',
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title ?? '',
        summary: existing.summary ?? '',
        publisher: existing.publisher ?? '',
        sourceUrl: existing.sourceUrl ?? '',
        categories: existing.categories ?? 'GENERAL',
        pinned: existing.pinned ?? false,
        status: existing.status ?? 'PUBLISHED',
      })
    } else if (open) {
      setForm({
        title: '', summary: '', publisher: '', sourceUrl: '', categories: 'GENERAL', pinned: false, status: 'PUBLISHED',
      })
    }
  }, [existing, open])

  async function save() {
    if (!form.title || !form.summary || !form.publisher || !form.sourceUrl) {
      toast.error('Title, summary, publisher and source URL are required')
      return
    }
    setSaving(true)
    try {
      if (existing) {
        await apiPatch(`/api/admin/news/${existing.id}`, form)
        toast.success('News updated', { description: 'Action logged.' })
      } else {
        await apiPost(`/api/admin/news`, form)
        toast.success('News created', { description: 'Action logged.' })
      }
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error('Failed to save news', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit news item' : 'Create news item'}</DialogTitle>
          <DialogDescription>
            News items are visible in the public News view. Mark as DRAFT to hide, PUBLISHED to show, ARCHIVED to soft-delete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="h-9 text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea className="text-sm min-h-16" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Publisher</Label>
              <Input className="h-9 text-sm" value={form.publisher} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Categories</Label>
              <Input className="h-9 text-sm" value={form.categories} onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Source URL</Label>
            <Input className="h-9 text-sm" value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" variant={form.pinned ? 'default' : 'outline'} onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}>
                {form.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                {form.pinned ? 'Pinned' : 'Pin to top'}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {existing ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Facilities tab ──────────────────────────────────────────────────
const FACILITY_TYPES = ['SHELTER', 'HOSPITAL', 'RELIEF_CENTER', 'POLICE_STATION', 'FIRE_STATION', 'ASSEMBLY_POINT']

function FacilitiesTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<any | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/facilities`)
      setItems(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load facilities', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, refreshKey])

  async function closeFacility(id: string) {
    try {
      const res = await fetch(`/api/admin/facilities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`API ${res.status}`)
      toast.success('Facility closed', { description: 'Status set to CLOSED. Action logged.' })
      await load()
      onRefresh()
    } catch (e) {
      toast.error('Close failed', { description: String(e) })
    }
  }

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Facilities
            </CardTitle>
            <CardDescription className="text-xs">Shelters, hospitals, relief centres, assembly points.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New facility
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Region</TableHead>
                <TableHead className="text-xs">Capacity</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">No facilities yet.</TableCell></TableRow>
              )}
              {!loading && items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="text-xs font-medium">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{f.lat.toFixed(3)}, {f.lng.toFixed(3)}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.facilityType}</Badge></TableCell>
                  <TableCell className="text-xs">{f.region?.canonicalName ?? '—'}</TableCell>
                  <TableCell className="text-xs">
                    {f.capacity ? `${f.availableUnits ?? 0} / ${f.capacity}` : '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(f)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" aria-label="Close facility">
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Close “{f.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Closes the facility (status: CLOSED) without deleting the record. Bulk actions are available in a future iteration.
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
        <p className="text-[11px] text-muted-foreground mt-2">Action logged. Closing a facility preserves the record for audit.</p>
      </CardContent>

      <FacilityFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => { await load(); onRefresh() }}
      />
      <FacilityFormDialog
        open={!!editItem}
        onOpenChange={(v) => !v && setEditItem(null)}
        existing={editItem}
        onSaved={async () => { setEditItem(null); await load(); onRefresh() }}
      />
    </Card>
  )
}

function FacilityFormDialog({
  open, onOpenChange, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  existing?: any | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    facilityType: 'SHELTER', name: '', lat: 27.494, lng: 88.533, address: '', phone: '',
    capacity: 100, availableUnits: 50, hours: '24x7', status: 'OPEN', regionId: '',
  })
  const [regions, setRegions] = React.useState<any[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (existing) {
      setForm({
        facilityType: existing.facilityType ?? 'SHELTER',
        name: existing.name ?? '',
        lat: existing.lat ?? 0,
        lng: existing.lng ?? 0,
        address: existing.address ?? '',
        phone: existing.phone ?? '',
        capacity: existing.capacity ?? 0,
        availableUnits: existing.availableUnits ?? 0,
        hours: existing.hours ?? '24x7',
        status: existing.status ?? 'OPEN',
        regionId: existing.regionId ?? '',
      })
    } else if (open) {
      setForm({
        facilityType: 'SHELTER', name: '', lat: 27.494, lng: 88.533, address: '', phone: '',
        capacity: 100, availableUnits: 50, hours: '24x7', status: 'OPEN', regionId: '',
      })
    }
  }, [existing, open])

  React.useEffect(() => {
    if (open) {
      apiGet<{ items: any[] }>(`/api/admin/regions`).then((r) => setRegions(r.items ?? [])).catch(() => {})
    }
  }, [open])

  async function save() {
    if (!form.name || form.lat == null || form.lng == null) {
      toast.error('Name, lat, lng are required')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        capacity: Number(form.capacity),
        availableUnits: Number(form.availableUnits),
        regionId: form.regionId || null,
      }
      if (existing) {
        await apiPatch(`/api/admin/facilities/${existing.id}`, payload)
        toast.success('Facility updated', { description: 'Action logged.' })
      } else {
        await apiPost(`/api/admin/facilities`, payload)
        toast.success('Facility created', { description: 'Action logged.' })
      }
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error('Failed to save facility', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit facility' : 'Create facility'}</DialogTitle>
          <DialogDescription>Facilities appear in the Safe Places & Routes view.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.facilityType} onValueChange={(v) => setForm((f) => ({ ...f, facilityType: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                  <SelectItem value="FULL">FULL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Name</Label>
            <Input className="h-9 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Lat</Label>
              <Input className="h-9 text-sm" type="number" step="0.0001" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Lng</Label>
              <Input className="h-9 text-sm" type="number" step="0.0001" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Capacity</Label>
              <Input className="h-9 text-sm" type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Available units</Label>
              <Input className="h-9 text-sm" type="number" value={form.availableUnits} onChange={(e) => setForm((f) => ({ ...f, availableUnits: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input className="h-9 text-sm" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-9 text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Hours</Label>
              <Input className="h-9 text-sm" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Region (optional)</Label>
            <Select value={form.regionId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, regionId: v === '__none__' ? '' : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No region</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.canonicalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {existing ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Localities (regions) tab ────────────────────────────────────────
const REGION_TYPES = ['STATE', 'DISTRICT', 'LOCALITY']
const COVERAGE_STATUSES = ['CONFIGURED', 'DATA_CONNECTED', 'DEMO', 'INACTIVE']
const LANGS = ['en', 'hi', 'ne', 'as']

function LocalitiesTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<any | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/regions`)
      setItems(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load regions', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, refreshKey])

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Localities & regions
            </CardTitle>
            <CardDescription className="text-xs">State / district / locality registry with coverage status.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New region
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Canonical name</TableHead>
                <TableHead className="text-xs">Local name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Language</TableHead>
                <TableHead className="text-xs">Coverage</TableHead>
                <TableHead className="text-xs">Coords</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">No regions yet.</TableCell></TableRow>
              )}
              {!loading && items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-medium">{r.canonicalName}</TableCell>
                  <TableCell className="text-xs">{r.localName ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.regionType}</Badge></TableCell>
                  <TableCell className="text-xs">{r.defaultLanguage}</TableCell>
                  <TableCell><StatusBadge status={r.coverageStatus} /></TableCell>
                  <TableCell className="text-[11px] font-mono text-muted-foreground">{r.lat.toFixed(3)}, {r.lng.toFixed(3)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(r)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Action logged.</p>
      </CardContent>

      <RegionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => { await load(); onRefresh() }}
      />
      <RegionFormDialog
        open={!!editItem}
        onOpenChange={(v) => !v && setEditItem(null)}
        existing={editItem}
        onSaved={async () => { setEditItem(null); await load(); onRefresh() }}
      />
    </Card>
  )
}

function RegionFormDialog({
  open, onOpenChange, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  existing?: any | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    canonicalName: '', regionType: 'LOCALITY', lat: 27.494, lng: 88.533,
    localName: '', defaultLanguage: 'en', coverageStatus: 'DEMO',
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (existing) {
      setForm({
        canonicalName: existing.canonicalName ?? '',
        regionType: existing.regionType ?? 'LOCALITY',
        lat: existing.lat ?? 0,
        lng: existing.lng ?? 0,
        localName: existing.localName ?? '',
        defaultLanguage: existing.defaultLanguage ?? 'en',
        coverageStatus: existing.coverageStatus ?? 'DEMO',
      })
    } else if (open) {
      setForm({
        canonicalName: '', regionType: 'LOCALITY', lat: 27.494, lng: 88.533,
        localName: '', defaultLanguage: 'en', coverageStatus: 'DEMO',
      })
    }
  }, [existing, open])

  async function save() {
    if (!existing && (!form.canonicalName || !form.regionType)) {
      toast.error('Canonical name and region type are required')
      return
    }
    setSaving(true)
    try {
      if (existing) {
        await apiPatch(`/api/admin/regions/${existing.id}`, {
          localName: form.localName,
          coverageStatus: form.coverageStatus,
          defaultLanguage: form.defaultLanguage,
        })
        toast.success('Region updated', { description: 'Action logged.' })
      } else {
        await apiPost(`/api/admin/regions`, {
          ...form,
          lat: Number(form.lat),
          lng: Number(form.lng),
        })
        toast.success('Region created', { description: 'Action logged.' })
      }
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error('Failed to save region', { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit region' : 'Create region'}</DialogTitle>
          <DialogDescription>
            Regions back geofenced alerts and facility mappings.
            {existing && ' Edits are limited to local name, coverage status, and default language.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!existing && (
            <>
              <div>
                <Label className="text-xs">Canonical name</Label>
                <Input className="h-9 text-sm" value={form.canonicalName} onChange={(e) => setForm((f) => ({ ...f, canonicalName: e.target.value }))} placeholder="e.g. Mangan, Sikkim" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Region type</Label>
                  <Select value={form.regionType} onValueChange={(v) => setForm((f) => ({ ...f, regionType: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Local name (local script)</Label>
                  <Input className="h-9 text-sm" value={form.localName} onChange={(e) => setForm((f) => ({ ...f, localName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Lat</Label>
                  <Input className="h-9 text-sm" type="number" step="0.0001" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Lng</Label>
                  <Input className="h-9 text-sm" type="number" step="0.0001" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: Number(e.target.value) }))} />
                </div>
              </div>
            </>
          )}
          {existing && (
            <div>
              <Label className="text-xs">Local name</Label>
              <Input className="h-9 text-sm" value={form.localName} onChange={(e) => setForm((f) => ({ ...f, localName: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Default language</Label>
              <Select value={form.defaultLanguage} onValueChange={(v) => setForm((f) => ({ ...f, defaultLanguage: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Coverage status</Label>
              <Select value={form.coverageStatus} onValueChange={(v) => setForm((f) => ({ ...f, coverageStatus: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COVERAGE_STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {existing ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Volunteers tab ─────────────────────────────────────────────────
function VolunteersTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/volunteers`)
      setItems(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load volunteers', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, refreshKey])

  async function act(id: string, action: 'approve' | 'reject') {
    try {
      await apiPatch(`/api/admin/volunteers`, { id, action })
      toast.success(`Volunteer ${action === 'approve' ? 'approved' : 'rejected'}`, { description: 'Action logged.' })
      await load()
      onRefresh()
    } catch (e) {
      toast.error(`Failed to ${action} volunteer`, { description: String(e) })
    }
  }

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Volunteer profiles
        </CardTitle>
        <CardDescription className="text-xs">Verify or reject volunteer applications.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Skills</TableHead>
                <TableHead className="text-xs">Languages</TableHead>
                <TableHead className="text-xs">Service regions</TableHead>
                <TableHead className="text-xs">Availability</TableHead>
                <TableHead className="text-xs">Verification</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">No volunteer profiles.</TableCell></TableRow>
              )}
              {!loading && items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="text-xs font-medium">{v.user?.name ?? 'Volunteer'}</div>
                    <div className="text-[10px] text-muted-foreground">{v.user?.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">{v.skills || '—'}</TableCell>
                  <TableCell className="text-xs">{v.languages || '—'}</TableCell>
                  <TableCell className="text-xs">{v.serviceRegions || '—'}</TableCell>
                  <TableCell><StatusBadge status={v.availabilityStatus} /></TableCell>
                  <TableCell><StatusBadge status={v.verificationStatus} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={v.verificationStatus === 'VERIFIED'}
                        onClick={() => act(v.id, 'approve')}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600"
                            disabled={v.verificationStatus === 'REJECTED'}
                          >
                            <X className="h-3 w-3" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject volunteer “{v.user?.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sets verification status to REJECTED. The volunteer keeps their profile for audit; they will not be assigned new tasks.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => act(v.id, 'reject')}>Reject</AlertDialogAction>
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
        <p className="text-[11px] text-muted-foreground mt-2">Action logged. approvedBy = seeded admin, approvedAt = now.</p>
      </CardContent>
    </Card>
  )
}

// ─── Settings tab ────────────────────────────────────────────────────
function SettingsTab({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ items: any[] }>(`/api/admin/settings`)
      setItems(res.items ?? [])
    } catch (e) {
      toast.error('Failed to load settings', { description: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, refreshKey])

  async function save(key: string, value: string) {
    try {
      await apiPatch(`/api/admin/settings`, { key, value })
      toast.success(`Setting “${key}” updated`, { description: 'Action logged.' })
      setEditingKey(null)
      await load()
      onRefresh()
    } catch (e) {
      toast.error('Failed to update setting', { description: String(e) })
    }
  }

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" /> System settings
        </CardTitle>
        <CardDescription className="text-xs">
          Key/value store. Includes <code className="font-mono">demo.simulationMode</code>,{' '}
          <code className="font-mono">branding.productName</code>,{' '}
          <code className="font-mono">map.defaultExtent</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[60vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Key</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs">Updated</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">No settings yet.</TableCell></TableRow>
              )}
              {!loading && items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-[11px]">{s.key}</TableCell>
                  <TableCell>
                    {editingKey === s.key ? (
                      <Textarea
                        className="text-xs min-h-12 max-w-[420px]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    ) : (
                      <span className="font-mono text-[11px] block max-w-[420px] truncate">{s.value}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{formatRelativeTime(s.updatedAt)}</TableCell>
                  <TableCell>
                    {editingKey === s.key ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => save(s.key, editValue)}>
                          <Save className="h-3 w-3" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingKey(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditingKey(s.key); setEditValue(s.value) }}
                        aria-label="Edit setting"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Tip: edit values as JSON-encoded strings (e.g. <code>true</code>,{' '}
          <code>"PurvaGuard AI"</code>, <code>{'{"minLat":23,"maxLat":35,"minLng":76,"maxLng":96}'}</code>).
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Top-level view ─────────────────────────────────────────────────
export default function AdminView() {
  const { role, setView } = useApp()
  const [tab, setTab] = React.useState('overview')
  const [refreshKey, setRefreshKey] = React.useState(0)
  const triggerRefresh = React.useCallback(() => setRefreshKey((k) => k + 1), [])

  if (role !== 'ADMIN') return <LockedCard />

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Admin Console</h1>
            <p className="text-xs text-muted-foreground">
              Platform configuration · news · facilities · localities · volunteers · settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">Role: {role}</Badge>
          <Button size="sm" variant="outline" onClick={() => setView('home')}>
            <Settings className="h-3.5 w-3.5" /> Exit
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-thin">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="news" className="text-xs">News</TabsTrigger>
          <TabsTrigger value="facilities" className="text-xs">Facilities</TabsTrigger>
          <TabsTrigger value="localities" className="text-xs">Localities</TabsTrigger>
          <TabsTrigger value="volunteers" className="text-xs">Volunteers</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="news" className="mt-4">
          <NewsTab refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>
        <TabsContent value="facilities" className="mt-4">
          <FacilitiesTab refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>
        <TabsContent value="localities" className="mt-4">
          <LocalitiesTab refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>
        <TabsContent value="volunteers" className="mt-4">
          <VolunteersTab refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab refreshKey={refreshKey} onRefresh={triggerRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
