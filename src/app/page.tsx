'use client'

import * as React from 'react'
import {
  Home, Map, Activity, BellRing, Siren, ShieldCheck, Megaphone, BookOpen,
  Newspaper, Bot, LayoutDashboard, Settings, Menu, X, Sun, Moon, Wifi, WifiOff,
  Globe, Mountain, Accessibility, AlertTriangle, ChevronDown, Search, Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useApp } from '@/lib/store'
import { NAV_ITEMS, DEMO_REGIONS, LANGUAGES, type Role, type ViewId } from '@/lib/constants'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { Toaster as SonnerToaster } from 'sonner'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Map, Activity, BellRing, Siren, ShieldCheck, Megaphone, BookOpen,
  Newspaper, Bot, LayoutDashboard, Settings,
}

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'PUBLIC', label: 'Public Resident', desc: 'Community member' },
  { id: 'DISTRICT_OPERATOR', label: 'District Operator', desc: 'District disaster mgmt' },
  { id: 'STATE_OPERATOR', label: 'State Operator', desc: 'Regional operations' },
  { id: 'ADMIN', label: 'Platform Admin', desc: 'Full system control' },
  { id: 'VOLUNTEER', label: 'Volunteer', desc: 'Registered volunteer' },
  { id: 'ANALYST', label: 'AI / Data Analyst', desc: 'Model & data quality' },
]

function Header() {
  const { role, setRole, view, setView, location, setLocation, language, setLanguage, connectivity } = useApp()
  const { theme, toggleTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  const navItems = NAV_ITEMS.filter((i) => i.roles.includes(role))

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Brand */}
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 shrink-0 group"
          aria-label="PurvaGuard AI home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Mountain className="h-5 w-5" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">PurvaGuard AI</span>
            <span className="text-[10px] text-muted-foreground">Disaster Intelligence</span>
          </div>
        </button>

        <Separator orientation="vertical" className="hidden sm:block h-6 mx-1" />

        {/* Location selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 max-w-[180px] sm:max-w-none">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate font-medium">{location.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto scrollbar-thin">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Select a pilot locality</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEMO_REGIONS.map((r) => (
              <DropdownMenuItem
                key={r.name}
                onClick={() => setLocation({ name: r.name, lat: r.lat, lng: r.lng, localName: r.localName })}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">{r.localName} · {r.state}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2 flex-1 overflow-x-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] ?? Home
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          {/* Connectivity */}
          <Badge
            variant="outline"
            className={cn(
              'hidden sm:inline-flex gap-1 text-[11px] font-medium',
              connectivity === 'ONLINE'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                : connectivity === 'WEAK'
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
            )}
          >
            {connectivity === 'OFFLINE' ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
            {connectivity === 'ONLINE' ? 'Online' : connectivity === 'WEAK' ? 'Weak' : 'Offline'}
          </Badge>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Select language">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGES.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)} className={cn(language === l.code && 'bg-muted')}>
                  <span className="text-sm">{l.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* SOS quick */}
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5 font-semibold h-8 px-3"
            onClick={() => setView('sos')}
          >
            <Siren className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SOS</span>
          </Button>

          {/* Role switcher */}
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="hidden md:flex h-8 w-[150px] text-xs gap-1" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="py-2">
                  <div className="flex flex-col gap-0">
                    <span className="text-[13px] font-medium">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mobile nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Mountain className="h-4 w-4" />
                  </div>
                  PurvaGuard AI
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col p-2 overflow-y-auto scrollbar-thin max-h-[calc(100vh-4rem)]">
                {navItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? Home
                  const active = view === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setMobileNavOpen(false) }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  )
                })}
                <Separator className="my-2" />
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Demo role</div>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="h-9 mx-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Alert ticker bar */}
      <AlertTicker />
    </header>
  )
}

function AlertTicker() {
  const { view, setView } = useApp()
  const [items] = React.useState([
    { sev: 'WARNING', text: 'Flash Flood Warning — Teesta basin. Move to higher ground if advised.' },
    { sev: 'WATCH', text: 'Landslide Watch — NH-10 saturated slopes, avoid night movement.' },
    { sev: 'ADVISORY', text: 'Heavy Rain Advisory — 80-110mm expected in next 24h across Sikkim.' },
  ])
  const sevColor =
    items[0].sev === 'EMERGENCY' || items[0].sev === 'WARNING' ? 'bg-red-600'
    : items[0].sev === 'WATCH' ? 'bg-orange-500'
    : 'bg-yellow-500'
  return (
    <div className="flex items-center gap-2 border-t border-border/60 bg-muted/40 overflow-hidden h-8">
      <div className={cn('flex items-center gap-1.5 h-full px-2.5 text-white text-[11px] font-bold uppercase tracking-wide shrink-0', sevColor)}>
        <AlertTriangle className="h-3 w-3" />
        Live Alerts
      </div>
      <div className="relative flex-1 overflow-hidden h-full">
        <div className="flex items-center h-full whitespace-nowrap animate-ticker">
          {[...items, ...items].map((it, i) => (
            <button
              key={i}
              onClick={() => setView('alerts')}
              className="inline-flex items-center gap-2 px-6 text-[12px] text-foreground/80 hover:text-foreground"
            >
              <span className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                it.sev === 'WARNING' || it.sev === 'EMERGENCY' ? 'bg-red-500' : it.sev === 'WATCH' ? 'bg-orange-500' : 'bg-yellow-500'
              )} />
              {it.text}
            </button>
          ))}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="h-7 mr-1 text-[11px] shrink-0 hidden sm:flex" onClick={() => setView('alerts')}>
        View all
      </Button>
    </div>
  )
}

function Footer() {
  const { setView } = useApp()
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mountain className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">PurvaGuard AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Decision-support & community preparedness platform for the Himalayan & North Eastern Region. Not an official warning authority.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Product</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => setView('map')} className="hover:text-foreground text-muted-foreground">Live Map</button></li>
              <li><button onClick={() => setView('risk')} className="hover:text-foreground text-muted-foreground">Risk & Forecast</button></li>
              <li><button onClick={() => setView('alerts')} className="hover:text-foreground text-muted-foreground">Alerts</button></li>
              <li><button onClick={() => setView('sos')} className="hover:text-foreground text-muted-foreground">SOS / Get Help</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Resources</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => setView('preparedness')} className="hover:text-foreground text-muted-foreground">Preparedness Library</button></li>
              <li><button onClick={() => setView('safe-places')} className="hover:text-foreground text-muted-foreground">Safe Places & Routes</button></li>
              <li><button onClick={() => setView('volunteer')} className="hover:text-foreground text-muted-foreground">Volunteer / NGO</button></li>
              <li><button onClick={() => setView('assistant')} className="hover:text-foreground text-muted-foreground">AI Assistant</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">About</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Smart India Hackathon 2026 · PS 2601</li>
              <li>Sponsor: MDoNER</li>
              <li className="flex items-center gap-1.5"><Accessibility className="h-3 w-3" /> WCAG 2.2 AA target</li>
              <li className="flex items-center gap-1.5"><Heart className="h-3 w-3 text-red-500" /> Built for resilience</li>
            </ul>
          </div>
        </div>
        <Separator className="my-5" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>
            <strong className="text-foreground/80">Disclaimer:</strong> Emergency numbers shown are demo placeholders. In a real emergency, contact your local authority directly. All simulated integrations are visibly labeled.
          </p>
          <p className="shrink-0">© 2026 PurvaGuard AI · Demo build</p>
        </div>
      </div>
    </footer>
  )
}

// Mobile bottom nav (Public)
function MobileBottomNav() {
  const { view, setView, role } = useApp()
  const items: { id: ViewId; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'sos', icon: Siren, label: 'SOS' },
    { id: 'alerts', icon: BellRing, label: 'Alerts' },
    { id: 'assistant', icon: Bot, label: 'Assistant' },
  ]
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-stretch justify-around h-14 px-1">
        {items.map((it) => {
          const active = view === it.id
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {it.id === 'sos' ? (
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-full', active ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive')}>
                  <Siren className="h-4 w-4" />
                </div>
              ) : (
                <it.icon className="h-4 w-4" />
              )}
              <span className="text-[10px] font-medium">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Lazy-load all view components
const HomeView = React.lazy(() => import('@/components/views/home-view'))
const MapView = React.lazy(() => import('@/components/views/map-view'))
const RiskView = React.lazy(() => import('@/components/views/risk-view'))
const AlertsView = React.lazy(() => import('@/components/views/alerts-view'))
const SosView = React.lazy(() => import('@/components/views/sos-view'))
const SafePlacesView = React.lazy(() => import('@/components/views/safe-places-view'))
const ReportsView = React.lazy(() => import('@/components/views/reports-view'))
const VolunteerView = React.lazy(() => import('@/components/views/volunteer-view'))
const PreparednessView = React.lazy(() => import('@/components/views/preparedness-view'))
const NewsView = React.lazy(() => import('@/components/views/news-view'))
const AssistantView = React.lazy(() => import('@/components/views/assistant-view'))
const OperationsView = React.lazy(() => import('@/components/views/operations-view'))
const AdminView = React.lazy(() => import('@/components/views/admin-view'))

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )
}

function ViewRouter() {
  const { view } = useApp()
  const map: Record<ViewId, React.ComponentType> = {
    home: HomeView,
    map: MapView,
    risk: RiskView,
    alerts: AlertsView,
    sos: SosView,
    'safe-places': SafePlacesView,
    reports: ReportsView,
    volunteer: VolunteerView,
    preparedness: PreparednessView,
    news: NewsView,
    assistant: AssistantView,
    operations: OperationsView,
    admin: AdminView,
  }
  const Component = map[view] ?? HomeView
  return (
    <React.Suspense fallback={<ViewLoader />}>
      <Component />
    </React.Suspense>
  )
}

export default function Page() {
  React.useEffect(() => {
    // mount sonner toaster for toasts used by views
  }, [])
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SonnerToaster position="top-right" richColors closeButton />
      <Header />
      <main className="flex-1 w-full">
        <ViewRouter />
      </main>
      <Footer />
      <MobileBottomNav />
      {/* spacer so content isn't hidden behind mobile bottom nav */}
      <div className="lg:hidden h-14" aria-hidden />
    </div>
  )
}
