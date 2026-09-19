'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  HandHeart, MapPin, ShieldAlert, CheckCircle2, Clock, LogIn, LogOut,
  Phone, Languages as LanguagesIcon, Wrench, Truck, Loader2,
  HeartPulse, Building2, User2, Send,
} from 'lucide-react'

import { useApp } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { LANGUAGES, formatRelativeTime } from '@/lib/constants'
import { cn } from '@/lib/utils'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  VerificationBadge, StatusBadge, DemoBadge,
} from '@/components/shared/badges'

// ── Types ────────────────────────────────────────────────────────────
interface VolunteerProfile {
  id: string
  userId: string
  userName: string
  userEmail: string
  skills: string[]
  languages: string[]
  serviceRegions: string[]
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  equipment: any
  vehicle: any
  training: any
  verificationStatus: string
  approvedAt: string | null
  updatedAt: string
}

interface TaskAssignment {
  id: string
  volunteerId: string
  volunteerName: string
  status: string
  assignedAt: string
  acceptedAt: string | null
  checkinAt: string | null
  checkoutAt: string | null
  completionNote: string | null
}

interface ResponseTaskItem {
  id: string
  title: string
  taskType: string
  description: string
  lat: number
  lng: number
  regionId: string | null
  requiredSkills: string[]
  capacity: number
  status: string
  startAt: string | null
  endAt: string | null
  safetyConstraints: any
  createdAt: string
  updatedAt: string
  coordinator: { id: string; name: string } | null
  assignments: TaskAssignment[]
}

interface VolunteersResponse {
  profile: VolunteerProfile | null
  tasks: ResponseTaskItem[]
}

const SKILL_OPTIONS = [
  'first-aid', 'search-rescue', 'translation', 'medical', 'logistics',
  'shelter-support', 'transport', 'mapping', 'communication', 'cooking',
  'childcare', 'electrical', 'civil-engineering',
]

const AVAILABILITY_OPTIONS: { value: VolunteerProfile['availabilityStatus']; label: string; tone: string }[] = [
  { value: 'AVAILABLE', label: 'Available', tone: 'bg-emerald-500' },
  { value: 'BUSY', label: 'Busy', tone: 'bg-orange-500' },
  { value: 'OFFLINE', label: 'Offline', tone: 'bg-slate-400' },
]

// ── Component ────────────────────────────────────────────────────────
export default function VolunteerView() {
  const { role } = useApp()
  const [tab, setTab] = React.useState<'workspace' | 'onboard' | 'ngo'>('workspace')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HandHeart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Volunteer / NGO</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Community response coordination — accept welfare-check & supply tasks, log check-in/out,
            and onboard as a verified volunteer. Volunteer performance is operational history, not a public rating.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          <Badge variant="outline" className="text-[11px]">
            Role: {role}
          </Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="workspace">Volunteer Workspace</TabsTrigger>
          <TabsTrigger value="onboard">Register / Onboard</TabsTrigger>
          <TabsTrigger value="ngo">NGO Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="mt-4">
          <WorkspaceTab />
        </TabsContent>
        <TabsContent value="onboard" className="mt-4">
          <OnboardTab />
        </TabsContent>
        <TabsContent value="ngo" className="mt-4">
          <NgoDashboardTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Workspace Tab ────────────────────────────────────────────────────
function WorkspaceTab() {
  const [data, setData] = React.useState<VolunteersResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [radiusKm, setRadiusKm] = React.useState(15)
  const [availability, setAvailability] = React.useState<VolunteerProfile['availabilityStatus']>('AVAILABLE')
  const [acting, setActing] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<VolunteersResponse>('/api/volunteers')
      setData(res)
      if (res.profile?.availabilityStatus) {
        setAvailability(res.profile.availabilityStatus)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  async function handleAction(taskId: string, assignmentId: string, action: 'accept' | 'checkin' | 'checkout' | 'complete', label: string) {
    setActing(`${taskId}:${action}`)
    try {
      // When accepting an OPEN task without an existing assignment, omit assignmentId
      // so the server auto-creates one for the demo volunteer.
      const payload: Record<string, unknown> = { action }
      if (assignmentId && assignmentId !== '__accept__') {
        payload.assignmentId = assignmentId
      }
      await apiPatch(`/api/tasks/${taskId}`, payload)
      toast.success(label)
      await load()
    } catch (e: any) {
      toast.error(`Action failed: ${e?.message ?? 'unknown error'}`)
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Failed to load volunteer workspace: {error}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const profile = data?.profile ?? null
  const tasks = data?.tasks ?? []
  const acceptedTasks = tasks.filter((t) => t.assignments.some((a) => isMyAssignment(a, profile)))
  const openTasks = tasks.filter((t) => t.status === 'OPEN')

  return (
    <div className="grid gap-4">
      {/* Availability & Profile banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-primary" />
            Volunteer Status
          </CardTitle>
          <CardDescription>
            {profile
              ? `Signed in as ${profile.userName} · ${profile.userEmail}`
              : 'No volunteer profile loaded for the demo session.'}
          </CardDescription>
          {profile && (
            <CardAction>
              <VerificationBadge status={profile.verificationStatus} />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Availability */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Availability
                </Label>
                <Badge
                  variant="outline"
                  className={cn('gap-1.5 text-[11px] font-semibold', availabilityTone(availability).badge)}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', availabilityTone(availability).dot)} />
                  {availability}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={availability === 'AVAILABLE'}
                  onCheckedChange={(c) => setAvailability(c ? 'AVAILABLE' : 'OFFLINE')}
                  disabled={!profile}
                />
                <span className="text-xs text-muted-foreground">
                  Toggle availability (demo — updates local state).
                </span>
              </div>
              <div className="flex items-center gap-2">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={availability === opt.value ? 'default' : 'outline'}
                    className="h-7 text-[11px]"
                    onClick={() => setAvailability(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Service radius */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service radius
                </Label>
                <Badge variant="outline" className="text-[11px]">{radiusKm} km</Badge>
              </div>
              <Slider
                value={[radiusKm]}
                min={1}
                max={100}
                step={1}
                onValueChange={(v) => setRadiusKm(v[0] ?? radiusKm)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tasks within ~{radiusKm} km of your service region will be highlighted for accept.
              </p>
            </div>
          </div>

          {profile && (
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="flex items-center gap-2">
                <LanguagesIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Languages:</span>
                <span className="font-medium">{profile.languages.join(', ') || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Skills:</span>
                <span className="font-medium">{profile.skills.join(', ') || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Regions:</span>
                <span className="font-medium">{profile.serviceRegions.join(', ') || '—'}</span>
              </div>
            </div>
          )}

          {/* Escalation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  I am unsafe / need assistance
                </p>
                <p className="text-xs text-red-700/80 dark:text-red-300/80">
                  Escalate immediately to your task coordinator and district operator.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.success('Escalation sent to coordinator (demo)')}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Escalate now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Active Assignments
          </CardTitle>
          <CardDescription>
            Tasks you have accepted or are currently checked-in on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {acceptedTasks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active assignments. Accept an open task below to begin.
            </p>
          )}
          {acceptedTasks.map((t) => {
            const assignment = t.assignments.find((a) => isMyAssignment(a, profile))!
            return (
              <TaskCard
                key={t.id}
                task={t}
                assignment={assignment}
                acting={acting}
                onAction={handleAction}
              />
            )
          })}
        </CardContent>
      </Card>

      {/* Open tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HandHeart className="h-4 w-4 text-primary" />
            Open Tasks
          </CardTitle>
          <CardDescription>
            Coordinator-published tasks awaiting volunteer acceptance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTasks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No open tasks right now. New tasks will appear here when published by coordinators.
            </p>
          )}
          {openTasks.map((t) => (
            <TaskCard key={t.id} task={t} assignment={null} acting={acting} onAction={handleAction} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function isMyAssignment(a: TaskAssignment, profile: VolunteerProfile | null): boolean {
  if (!profile) return false
  return a.volunteerId === profile.userId && a.status !== 'DECLINED'
}

function availabilityTone(status: VolunteerProfile['availabilityStatus']) {
  if (status === 'AVAILABLE') return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' }
  if (status === 'BUSY') return { badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', dot: 'bg-orange-500' }
  return { badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' }
}

function locationLabel(lat: number, lng: number): string {
  // Demo reverse-geocode: just produce a friendly label
  return `near ${lat.toFixed(3)}, ${lng.toFixed(3)}`
}

function TaskCard({
  task, assignment, acting, onAction,
}: {
  task: ResponseTaskItem
  assignment: TaskAssignment | null
  acting: string | null
  onAction: (taskId: string, assignmentId: string, action: 'accept' | 'checkin' | 'checkout' | 'complete', label: string) => void
}) {
  const actingHere = !!acting && acting.startsWith(`${task.id}:`)
  const hasAssignment = !!assignment
  const coordinator = task.coordinator?.name ?? 'Unassigned coordinator'

  return (
    <div className="rounded-lg border p-3 space-y-3 hover:bg-muted/40 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold leading-tight">{task.title}</h4>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            <MapPin className="inline h-3 w-3 mr-1 align-text-bottom" />
            {locationLabel(task.lat, task.lng)}
            <span className="mx-2">·</span>
            <Badge variant="outline" className="text-[10px] uppercase">{task.taskType.replace(/_/g, ' ')}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {task.requiredSkills.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] font-medium">
              {s}
            </Badge>
          ))}
          {task.requiredSkills.length === 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">No specific skills required</Badge>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {task.description}
        </p>
      )}

      {/* Safety constraints */}
      {task.safetyConstraints ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-2 text-[11px] text-amber-900 dark:text-amber-200">
          <ShieldAlert className="inline h-3 w-3 mr-1 align-text-bottom" />
          <span className="font-semibold">Safety brief:</span>{' '}
          {typeof task.safetyConstraints === 'string'
            ? task.safetyConstraints
            : Object.entries(task.safetyConstraints).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
        </div>
      ) : null}

      {/* Coordinator */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <User2 className="h-3 w-3" />
        <span>Coordinator: <span className="text-foreground font-medium">{coordinator}</span></span>
        <span className="mx-1">·</span>
        <span>Created {formatRelativeTime(task.createdAt)}</span>
      </div>

      {/* Assignment timestamps */}
      {hasAssignment && assignment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
          <TimestampChip label="Assigned" value={assignment.assignedAt} icon={<Clock className="h-3 w-3" />} />
          <TimestampChip label="Accepted" value={assignment.acceptedAt} icon={<CheckCircle2 className="h-3 w-3" />} />
          <TimestampChip label="Check-in" value={assignment.checkinAt} icon={<LogIn className="h-3 w-3" />} />
          <TimestampChip label="Check-out" value={assignment.checkoutAt} icon={<LogOut className="h-3 w-3" />} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!hasAssignment && task.status === 'OPEN' && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={actingHere}
            onClick={() => {
              // Accept flow: auto-create assignment via the demo volunteer (server-side fallback).
              onAction(task.id, '__accept__', 'accept', 'Task accepted — coordinator notified')
            }}
          >
            {actingHere ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Accept
          </Button>
        )}

        {hasAssignment && assignment && (
          <>
            {assignment.status === 'ASSIGNED' && (
              <Button
                size="sm"
                variant="default"
                disabled={actingHere}
                onClick={() => onAction(task.id, assignment.id, 'accept', 'Task accepted — coordinator notified')}
              >
                {actingHere ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Accept
              </Button>
            )}
            {(assignment.status === 'ACCEPTED' || assignment.status === 'ASSIGNED') && (
              <Button
                size="sm"
                variant="secondary"
                disabled={actingHere}
                onClick={() => onAction(task.id, assignment.id, 'checkin', 'Checked-in to task')}
              >
                {actingHere ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                Check-in
              </Button>
            )}
            {assignment.status === 'CHECKED_IN' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actingHere}
                  onClick={() => onAction(task.id, assignment.id, 'checkout', 'Checked-out — shift ended')}
                >
                  {actingHere ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  Check-out
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  disabled={actingHere}
                  onClick={() => onAction(task.id, assignment.id, 'complete', 'Task marked complete')}
                >
                  {actingHere ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Complete
                </Button>
              </>
            )}
            {assignment.status === 'COMPLETED' && (
              <Badge variant="outline" className="text-[11px] text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                Completed
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TimestampChip({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/60 dark:bg-muted/30 px-2 py-1 flex items-center gap-1">
      {icon}
      <span className="font-medium">{label}:</span>
      <span>{value ? formatRelativeTime(value) : '—'}</span>
    </div>
  )
}

// ── Onboard Tab ──────────────────────────────────────────────────────
function OnboardTab() {
  const { role } = useApp()
  const [form, setForm] = React.useState({
    legalName: '',
    organizationName: '',
    serviceArea: '',
    contact: '',
    training: '',
    vehicle: '',
    equipment: '',
    accessibility: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  })
  const [languages, setLanguages] = React.useState<string[]>(['en'])
  const [skills, setSkills] = React.useState<string[]>([])
  const [consents, setConsents] = React.useState({ code: false, privacy: false, safety: false })
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<{ verificationStatus: string } | null>(null)

  function toggleLanguage(code: string) {
    setLanguages((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }
  function toggleSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consents.code || !consents.privacy || !consents.safety) {
      toast.error('Please accept all three acknowledgements to submit.')
      return
    }
    if (!form.legalName.trim()) {
      toast.error('Legal name is required.')
      return
    }
    if (languages.length === 0) {
      toast.error('Select at least one language.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        legalName: form.legalName.trim(),
        organizationName: form.organizationName.trim() || undefined,
        skills,
        languages,
        serviceRegions: form.serviceArea ? form.serviceArea.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
        availability: form.availability,
        equipment: form.equipment ? { description: form.equipment.trim() } : null,
        vehicle: form.vehicle ? { description: form.vehicle.trim() } : null,
        training: form.training ? { description: form.training.trim() } : null,
        contact: form.contact.trim() || undefined,
        accessibility: form.accessibility.trim() || undefined,
      }
      const res = await apiPost<{ verificationStatus: string; id: string }>('/api/volunteers', payload)
      setSubmitted({ verificationStatus: res.verificationStatus })
      toast.success('Application submitted — pending admin approval')
    } catch (e: any) {
      toast.error(`Submission failed: ${e?.message ?? 'unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Application Submitted
          </CardTitle>
          <CardDescription>
            Your volunteer profile has been recorded for the demo user (volunteer.demo@purvaguard.in).
          </CardDescription>
          <CardAction>
            <VerificationBadge status={submitted.verificationStatus} />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verification status is <strong className="text-foreground">PENDING</strong> until an
            administrator reviews your skills, references, and acknowledgement checks.
            You can browse open tasks in the Workspace tab meanwhile.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSubmitted(null)}>
              Edit application
            </Button>
            <Badge variant="outline" className="text-[11px]">Role: {role}</Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User2 className="h-4 w-4 text-primary" />
            Personal & Contact Details
          </CardTitle>
          <CardDescription>
            All information is stored against the seeded volunteer demo user. Real deployments use authenticated user IDs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal name *</Label>
            <Input
              id="legalName"
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              placeholder="e.g. Riya Tamang"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization / NGO name (optional)</Label>
            <Input
              id="orgName"
              value={form.organizationName}
              onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              placeholder="e.g. Himalaya Response Collective"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceArea">Service area / regions (separate with ; or ,)</Label>
            <Input
              id="serviceArea"
              value={form.serviceArea}
              onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
              placeholder="Sikkim; Uttarakhand"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact number / email</Label>
            <Input
              id="contact"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="+91-XXXXX-XXXXX"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LanguagesIcon className="h-4 w-4 text-primary" />
            Languages
          </CardTitle>
          <CardDescription>Select all languages you can support field operations in.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={languages.includes(l.code)} onCheckedChange={() => toggleLanguage(l.code)} />
              <span>{l.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-primary" />
            Skills
          </CardTitle>
          <CardDescription>Tick all that apply — these are matched against task requirements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={skills.includes(s)} onCheckedChange={() => toggleSkill(s)} />
              <span className="capitalize">{s.replace(/-/g, ' ')}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />
            Equipment, Vehicle & Training
          </CardTitle>
          <CardDescription>Optional — improves task-match quality.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="equipment">Equipment available</Label>
            <Input
              id="equipment"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              placeholder="First-aid kit, rope, walkie-talkie"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle">Vehicle</Label>
            <Input
              id="vehicle"
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              placeholder="4x4, capacity 4"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="training">Training / certifications</Label>
            <Input
              id="training"
              value={form.training}
              onChange={(e) => setForm({ ...form, training: e.target.value })}
              placeholder="NDRF basic, first-responder, CPR"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accessibility">Accessibility capability (e.g. wheelchair, sensory support)</Label>
            <Input
              id="accessibility"
              value={form.accessibility}
              onChange={(e) => setForm({ ...form, accessibility: e.target.value })}
              placeholder="Wheelchair accessible transport"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availability">Default availability</Label>
            <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v as any })}>
              <SelectTrigger id="availability" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="BUSY">Busy</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Acknowledgements
          </CardTitle>
          <CardDescription>All three are required to submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={consents.code}
              onCheckedChange={(v) => setConsents({ ...consents, code: !!v })}
              className="mt-0.5"
            />
            <span>
              I have read and agree to the <strong>Volunteer Code of Conduct</strong> — impartial aid,
              non-discrimination, and respect for affected communities.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={consents.privacy}
              onCheckedChange={(v) => setConsents({ ...consents, privacy: !!v })}
              className="mt-0.5"
            />
            <span>
              I consent to <strong>privacy & data-handling practices</strong> — my contact details
              may be shared with the assigned coordinator and task leads only.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={consents.safety}
              onCheckedChange={(v) => setConsents({ ...consents, safety: !!v })}
              className="mt-0.5"
            />
            <span>
              I acknowledge the <strong>safety disclaimer</strong> — I will follow safety briefs,
              avoid restricted zones, and use the escalate button when unsafe.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setForm({
          legalName: '', organizationName: '', serviceArea: '', contact: '',
          training: '', vehicle: '', equipment: '', accessibility: '',
          availability: 'AVAILABLE',
        })}>
          Reset
        </Button>
        <Button type="submit" disabled={submitting} className="gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit application
        </Button>
      </div>
    </form>
  )
}

// ── NGO Dashboard Tab ─────────────────────────────────────────────────
function NgoDashboardTab() {
  const [data, setData] = React.useState<VolunteersResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<VolunteersResponse>('/api/volunteers')
      setData(res)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64 sm:col-span-3" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Failed to load NGO dashboard: {error}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const profile = data.profile
  const roster = profile ? [profile] : []
  const tasks = data.tasks

  const skillCounts: Record<string, number> = {}
  roster.forEach((v) => v.skills.forEach((s) => { skillCounts[s] = (skillCounts[s] || 0) + 1 }))
  const availCounts = {
    AVAILABLE: roster.filter((v) => v.availabilityStatus === 'AVAILABLE').length,
    BUSY: roster.filter((v) => v.availabilityStatus === 'BUSY').length,
    OFFLINE: roster.filter((v) => v.availabilityStatus === 'OFFLINE').length,
  }
  const taskStatusCounts = {
    OPEN: tasks.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    ASSIGNED: tasks.filter((t) => t.status === 'ASSIGNED').length,
    COMPLETED: tasks.filter((t) => t.assignments.some((a) => a.status === 'COMPLETED')).length,
  }
  const completedTotal = tasks.reduce(
    (sum, t) => sum + t.assignments.filter((a) => a.status === 'COMPLETED').length,
    0
  )

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Verified Volunteers"
          value={roster.filter((v) => v.verificationStatus === 'VERIFIED').length}
          sub={`of ${roster.length} registered (demo)`}
          icon={<HeartPulse className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          title="Active Tasks"
          value={taskStatusCounts.OPEN + taskStatusCounts.IN_PROGRESS + taskStatusCounts.ASSIGNED}
          sub={`${taskStatusCounts.OPEN} open · ${taskStatusCounts.IN_PROGRESS} in progress`}
          icon={<Clock className="h-4 w-4" />}
          tone="orange"
        />
        <StatCard
          title="Completed Assignments"
          value={completedTotal}
          sub="lifetime (demo session)"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          title="Languages Covered"
          value={Array.from(new Set(roster.flatMap((v) => v.languages))).length}
          sub={`across ${roster.length} volunteers`}
          icon={<LanguagesIcon className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Roster */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="h-4 w-4 text-primary" />
              Roster Summary
            </CardTitle>
            <CardDescription>Active volunteer roster (demo).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roster.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No verified volunteers in roster.</p>
            )}
            {roster.map((v) => (
              <div key={v.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{v.userName}</p>
                    <p className="text-[11px] text-muted-foreground">{v.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <VerificationBadge status={v.verificationStatus} />
                    <Badge variant="outline" className={cn('text-[10px] font-semibold gap-1', availabilityTone(v.availabilityStatus).badge)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', availabilityTone(v.availabilityStatus).dot)} />
                      {v.availabilityStatus}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.skills.length === 0 ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">No skills listed</Badge>
                  ) : (
                    v.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] capitalize">{s.replace(/-/g, ' ')}</Badge>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.serviceRegions.join(', ') || 'No regions'}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><LanguagesIcon className="h-3 w-3" /> {v.languages.join(', ') || 'en'}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Availability + skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Availability & Skills
            </CardTitle>
            <CardDescription>Live capability snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Availability</Label>
              <div className="space-y-2">
                {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((k) => {
                  const total = roster.length || 1
                  const val = availCounts[k]
                  const pct = Math.round((val / total) * 100)
                  return (
                    <div key={k} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', availabilityTone(k).dot)} />
                          {k.charAt(0) + k.slice(1).toLowerCase()}
                        </span>
                        <span className="font-medium">{val}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Top Skills</Label>
              <div className="space-y-1">
                {Object.keys(skillCounts).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No skill data yet.</p>
                ) : (
                  Object.entries(skillCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{s.replace(/-/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px]">{n}</Badge>
                      </div>
                    ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task status + supplies + notes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Task Status Counts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <StatusCount label="Open" value={taskStatusCounts.OPEN} tone="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" />
            <StatusCount label="Assigned" value={taskStatusCounts.ASSIGNED} tone="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" />
            <StatusCount label="In Progress" value={taskStatusCounts.IN_PROGRESS} tone="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" />
            <StatusCount label="Completed" value={taskStatusCounts.COMPLETED} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Supplies Placeholder
            </CardTitle>
            <CardDescription>Live inventory integration pending.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Water (litres)</span>
              <Badge variant="outline">— pending</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Food packets</span>
              <Badge variant="outline">— pending</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>First-aid kits</span>
              <Badge variant="outline">— pending</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Tarps / tents</span>
              <Badge variant="outline">— pending</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Incident Notes
            </CardTitle>
            <CardDescription>Coordinator-visible scratchpad (demo).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="e.g. Need extra translators for Nepali/Hindi welfare checks near Mangan…"
              className="text-xs min-h-[120px]"
            />
            <Button size="sm" variant="outline" className="w-full" onClick={() => toast.success('Note saved locally (demo)')}>
              Save note (demo)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title, value, sub, icon, tone,
}: {
  title: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  tone: 'emerald' | 'orange' | 'blue' | 'violet'
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  } as const
  return (
    <Card>
      <CardContent className="py-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</Label>
          <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md', tones[tone])}>
            {icon}
          </span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function StatusCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-md p-2 space-y-0.5', tone)}>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
