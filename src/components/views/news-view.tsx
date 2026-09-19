'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Newspaper, RefreshCw, Search, ExternalLink, Pin, AlertTriangle,
  Clock, Radio, Loader2, Megaphone, Flag, FileWarning,
} from 'lucide-react'

import { apiGet } from '@/lib/api-client'
import { formatRelativeTime } from '@/lib/constants'
import { cn } from '@/lib/utils'

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DemoBadge } from '@/components/shared/badges'

interface NewsItem {
  id: string
  title: string
  summary: string
  publisher: string
  sourceUrl: string
  publishedAt: string
  fetchedAt: string
  regionId?: string | null
  categories: string
  language: string
  status: string
  pinned: boolean
  aiSummary?: string | null
  demoLabel: boolean
}

interface NewsResponse {
  items: NewsItem[]
}

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All categories' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'GEOLOGY', label: 'Geology' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TRANSPORT', label: 'Transport' },
] as const

const CATEGORY_TONES: Record<string, string> = {
  WEATHER: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  GEOLOGY: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  ADMIN: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  TRANSPORT: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  GENERAL: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

export default function NewsView() {
  const [items, setItems] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [category, setCategory] = React.useState<string>('ALL')
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<NewsResponse>('/api/news?limit=20')
      setItems(res.items ?? [])
    } catch (e: any) {
      // graceful: route may not exist yet
      setError(e?.message ?? 'News feed unavailable')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const pinned = React.useMemo(() => items.filter((i) => i.pinned), [items])
  const feed = React.useMemo(() => {
    let list = items.filter((i) => !i.pinned)
    if (category !== 'ALL') {
      list = list.filter((i) => (i.categories || 'GENERAL').toUpperCase().includes(category))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        (i.publisher ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, category, search])

  const newestFetch = items.reduce((max, i) => {
    const t = new Date(i.fetchedAt).getTime()
    return Number.isFinite(t) && t > max ? t : max
  }, 0)
  const stale = newestFetch > 0 && Date.now() - newestFetch > 6 * 3600000

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">News & Updates</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Aggregated official & community news items, labeled with provenance.
            Feeds: DEMO sample articles labeled.
            <span className={cn('ml-1', stale ? 'text-amber-700 dark:text-amber-400 font-medium' : '')}>
              {stale ? 'Stale-feed warning: last fetch > 6h.' : 'Stale-feed warning if fetch > 6h.'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          <Badge variant="outline" className="text-[11px] inline-flex items-center gap-1">
            <Radio className="h-3 w-3" />
            {items.length} items
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search headlines, summaries, publishers…"
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground hidden sm:inline">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {/* Error / Empty */}
      {!loading && error && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">News feed unavailable</p>
              <p className="text-xs text-muted-foreground">
                The <code className="font-mono text-[11px]">/api/news</code> route may not be ready yet.
                A retry will fetch articles as soon as they are published.
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-2">Detail: {error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty (loaded, no error, no items) */}
      {!loading && !error && items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">No news articles published yet.</p>
            <p className="text-xs text-muted-foreground">
              Articles will appear here once the news ingestion pipeline publishes them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pinned */}
      {!loading && !error && pinned.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Pin className="h-3.5 w-3.5" /> Pinned by editors
          </div>
          <div className="grid gap-3">
            {pinned.map((item) => (
              <NewsCard key={item.id} item={item} pinned />
            ))}
          </div>
          <Separator className="my-2" />
        </div>
      )}

      {/* News feed */}
      {!loading && !error && feed.length > 0 && (
        <div className="grid gap-3">
          {feed.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {!loading && !error && feed.length === 0 && items.length > 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No articles match the current filters.
          </CardContent>
        </Card>
      )}

      {/* Footer correction report */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Spot something inaccurate? Help improve the feed.
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs"
          onClick={() => toast.success('Correction report submitted (demo)')}
        >
          <Flag className="h-3.5 w-3.5" /> Report a correction
        </Button>
      </div>
    </div>
  )
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-xs', className)} {...props} />
}

function NewsCard({ item, pinned }: { item: NewsItem; pinned?: boolean }) {
  const categories = (item.categories || 'GENERAL').split(',').map((c) => c.trim()).filter(Boolean)
  const isStale = Date.now() - new Date(item.fetchedAt).getTime() > 6 * 3600000

  return (
    <Card className={cn('hover:shadow-md transition-shadow', pinned && 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900')}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {pinned && (
                <Badge className="gap-1 text-[10px] bg-amber-500 text-white border-amber-600 hover:bg-amber-500">
                  <Pin className="h-3 w-3" /> PINNED
                </Badge>
              )}
              {categories.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className={cn('text-[10px] uppercase font-semibold', CATEGORY_TONES[c.toUpperCase()] ?? CATEGORY_TONES.GENERAL)}
                >
                  {c}
                </Badge>
              ))}
              {item.aiSummary && (
                <Badge variant="outline" className="text-[10px] uppercase bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900">
                  AI summary
                </Badge>
              )}
              {item.demoLabel && <DemoBadge />}
            </div>
            <CardTitle className="text-sm leading-tight">
              <a
                href={item.sourceUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline inline-flex items-start gap-1"
              >
                {item.title}
                <ExternalLink className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
              </a>
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {item.aiSummary ? item.aiSummary : item.summary}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3 w-3" />
            <span className="font-medium text-foreground">{item.publisher}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Published {formatRelativeTime(item.publishedAt)}
          </span>
          <span className={cn('inline-flex items-center gap-1', isStale && 'text-amber-700 dark:text-amber-400')}>
            <RefreshCw className="h-3 w-3" />
            Fetched {formatRelativeTime(item.fetchedAt)}
            {isStale && ' (stale)'}
          </span>
          {item.regionId && (
            <Badge variant="outline" className="text-[10px]">Region: {item.regionId.slice(-6)}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
