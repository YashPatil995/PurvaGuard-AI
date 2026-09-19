'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import {
  BookOpen, Download, Volume2, Printer, ShieldCheck, AlertTriangle,
  RefreshCw, FileText, CalendarClock, BadgeCheck, Loader2, X,
} from 'lucide-react'

import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'
import { formatRelativeTime } from '@/lib/constants'
import { cn } from '@/lib/utils'

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { HazardBadge, DemoBadge, StatusBadge } from '@/components/shared/badges'

interface GuideItem {
  id: string
  slug: string
  title: string
  body: string
  hazardType: string
  contentType: string
  language: string
  version: number
  status: string
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  nextReviewAt: string | null
  updatedAt: string
}

interface GuidesResponse {
  items: GuideItem[]
  language: string
}

const HAZARD_FILTERS = [
  { value: 'ALL', label: 'All Hazards' },
  { value: 'LANDSLIDE', label: 'Landslide' },
  { value: 'FLASH_FLOOD', label: 'Flash Flood' },
  { value: 'EARTHQUAKE', label: 'Earthquake' },
  { value: 'GENERAL', label: 'General' },
] as const

export default function PreparednessView() {
  const { language } = useApp()
  const [guides, setGuides] = React.useState<GuideItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<string>('ALL')
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<GuidesResponse>('/api/preparedness?language=en')
      setGuides(res.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load guides')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = React.useMemo(() => {
    if (filter === 'ALL') return guides
    return guides.filter((g) => g.hazardType === filter)
  }, [guides, filter])

  const selected = React.useMemo(() => {
    if (!selectedSlug) return null
    return guides.find((g) => g.slug === selectedSlug) ?? null
  }, [guides, selectedSlug])

  const showTranslationBanner = language !== 'en'

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Preparedness Library</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Verified, regularly-reviewed guides for before / during / after disaster scenarios.
            Reviewed by authorized administrators only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          <Badge variant="outline" className="text-[11px]">
            {guides.length} guides
          </Badge>
        </div>
      </div>

      {/* Top tip banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Landslide warning signs</p>
          <p className="text-xs mt-0.5">
            New ground cracks, tilting trees/poles, unusual water seepage, rumbling sounds, sudden stream changes —
            move away immediately and follow official instructions.
          </p>
        </div>
      </div>

      {showTranslationBanner && (
        <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
          Translation for this language is pending review — showing English.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filter by hazard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {HAZARD_FILTERS.map((f) => {
                const active = filter === f.value
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'w-full text-left rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </aside>

        {/* Main grid */}
        <div className="space-y-4">
          {loading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          )}

          {!loading && error && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Failed to load guides: {error}
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && filtered.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No guides published for this hazard filter yet.
              </CardContent>
            </Card>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((g) => (
                <GuideCard key={g.id} guide={g} onOpen={() => setSelectedSlug(g.slug)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedSlug} onOpenChange={(o) => !o && setSelectedSlug(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          {selected && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <SheetTitle className="text-base leading-tight">{selected.title}</SheetTitle>
                  <button
                    onClick={() => setSelectedSlug(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SheetDescription className="sr-only">Guide body and metadata</SheetDescription>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <HazardBadge type={selected.hazardType} />
                  <Badge variant="outline" className="text-[10px] uppercase">{selected.contentType.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className="text-[10px]">v{selected.version}</Badge>
                  <StatusBadge status={selected.status} />
                  <DemoBadge />
                </div>
              </SheetHeader>

              <div className="px-5 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Reviewed by: <span className="text-foreground font-medium">{selected.reviewedByName ?? selected.reviewedBy ?? 'Admin'}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {selected.reviewedAt ? formatRelativeTime(selected.reviewedAt) : '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next review: {selected.nextReviewAt ? formatRelativeTime(selected.nextReviewAt) : '—'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b">
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5"
                  onClick={() => toast.success('Guide PDF queued for offline download (demo)')}
                >
                  <Download className="h-3.5 w-3.5" /> Download low-size guide
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5"
                  onClick={() => toast.success('Audio playback (demo)')}
                >
                  <Volume2 className="h-3.5 w-3.5" /> Audio playback
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5"
                  onClick={() => { if (typeof window !== 'undefined') window.print() }}
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{selected.body}</ReactMarkdown>
                </div>
              </ScrollArea>

              <div className="px-5 py-3 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                This guide is general preparedness information, not an official warning.
                Always follow instructions from local authorities and on-ground responders.
              </div>
            </>
          )}
          {!selected && selectedSlug && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading guide…
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function GuideCard({ guide, onOpen }: { guide: GuideItem; onOpen: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <CardHeader>
        <CardTitle className="text-sm leading-tight">{guide.title}</CardTitle>
        <CardDescription className="text-xs">
          {previewFromMarkdown(guide.body)}
        </CardDescription>
        <CardAction>
          <HazardBadge type={guide.hazardType} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] uppercase">{guide.contentType.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline" className="text-[10px]">v{guide.version}</Badge>
          <DemoBadge />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="space-y-0.5">
            <Label className="text-[10px] uppercase tracking-wide">Reviewed</Label>
            <p className="font-medium text-foreground truncate">
              {guide.reviewedByName ?? guide.reviewedBy ?? 'Admin'}
            </p>
            <p>{guide.reviewedAt ? formatRelativeTime(guide.reviewedAt) : '—'}</p>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] uppercase tracking-wide">Next review</Label>
            <p className="font-medium text-foreground">
              {guide.nextReviewAt ? formatRelativeTime(guide.nextReviewAt) : '—'}
            </p>
            <p className="text-[10px]">Updated {formatRelativeTime(guide.updatedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function previewFromMarkdown(md: string): string {
  // Strip markdown syntax for a short preview
  const lines = md.split('\n').map((l) => l.trim()).filter(Boolean)
  const firstParagraph = lines.find((l) => !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('>')) ?? lines[0] ?? ''
  return firstParagraph.replace(/[#>*`_-]/g, '').slice(0, 140) + (firstParagraph.length > 140 ? '…' : '')
}
