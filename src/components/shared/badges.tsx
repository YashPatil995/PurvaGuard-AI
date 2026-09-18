'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  SEVERITY_META, MODEL_RISK_META, VERIFICATION_META, HAZARD_META,
  type Severity, type ModelRiskLevel, type HazardType,
} from '@/lib/constants'
import { Mountain, Waves, CloudRain, Activity, Route, Info } from 'lucide-react'

const HAZARD_ICONS: Record<HazardType, React.ComponentType<{ className?: string }>> = {
  LANDSLIDE: Mountain, FLASH_FLOOD: Waves, HEAVY_RAIN: CloudRain, EARTHQUAKE: Activity, ROAD_BLOCK: Route, GENERAL: Info,
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.INFORMATIONAL
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-semibold border', meta.badgeClass, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </Badge>
  )
}

export function ModelRiskBadge({ level, className }: { level: ModelRiskLevel; className?: string }) {
  const meta = MODEL_RISK_META[level] ?? MODEL_RISK_META.LOW
  return (
    <Badge variant="outline" className={cn('font-semibold border', meta.badgeClass, className)}>
      Model: {meta.label}
    </Badge>
  )
}

export function VerificationBadge({ status, className }: { status: string; className?: string }) {
  const meta = VERIFICATION_META[status] ?? VERIFICATION_META.UNVERIFIED
  return (
    <Badge variant="outline" className={cn('font-medium border', meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  )
}

export function HazardIcon({ type, className }: { type: HazardType | string; className?: string }) {
  const Icon = HAZARD_ICONS[(type as HazardType)] ?? Info
  return <Icon className={className} />
}

export function HazardBadge({ type, className }: { type: HazardType | string; className?: string }) {
  const meta = HAZARD_META[(type as HazardType)] ?? HAZARD_META.GENERAL
  const Icon = HAZARD_ICONS[(type as HazardType)] ?? Info
  return (
    <Badge variant="outline" className={cn('gap-1 border', className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

export function SimulationBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1 border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700 font-semibold', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      SIMULATED
    </Badge>
  )
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 text-[10px] font-bold uppercase', className)}>
      DEMO
    </Badge>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    TRIAGED: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800',
    VERIFIED: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
    ASSIGNED: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800',
    RESPONDING: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
    RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    RECEIVED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
    REJECTED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
    OPEN: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    IN_PROGRESS: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
    ACTIVE: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
    EXPIRED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    DEGRADED: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
    ERROR: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  }
  const cls = tone[status] ?? tone.DRAFT
  return (
    <Badge variant="outline" className={cn('font-semibold border', cls, className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
