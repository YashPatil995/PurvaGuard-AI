// PurvaGuard AI — shared domain types & constants

export type Role = 'PUBLIC' | 'DISTRICT_OPERATOR' | 'ADMIN' | 'VOLUNTEER' | 'STATE_OPERATOR' | 'ANALYST'

export type ViewId =
  | 'home'
  | 'map'
  | 'risk'
  | 'alerts'
  | 'sos'
  | 'safe-places'
  | 'reports'
  | 'volunteer'
  | 'preparedness'
  | 'news'
  | 'assistant'
  | 'operations'
  | 'admin'

export type Severity = 'INFORMATIONAL' | 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY'
export type ModelRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
export type HazardType = 'LANDSLIDE' | 'FLASH_FLOOD' | 'HEAVY_RAIN' | 'EARTHQUAKE' | 'ROAD_BLOCK' | 'GENERAL'

export interface NavItem {
  id: ViewId
  label: string
  icon: string
  roles: Role[]
  group: 'public' | 'operations'
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'Home', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'map', label: 'Live Map', icon: 'Map', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'risk', label: 'Risk & Forecast', icon: 'Activity', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'alerts', label: 'Alerts', icon: 'BellRing', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'sos', label: 'SOS / Get Help', icon: 'Siren', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'safe-places', label: 'Safe Places & Routes', icon: 'ShieldCheck', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'reports', label: 'Community Reports', icon: 'Megaphone', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'volunteer', label: 'Volunteer / NGO', icon: 'HandHeart', roles: ['PUBLIC', 'VOLUNTEER', 'ADMIN', 'DISTRICT_OPERATOR', 'STATE_OPERATOR'], group: 'public' },
  { id: 'preparedness', label: 'Preparedness', icon: 'BookOpen', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'news', label: 'News & Updates', icon: 'Newspaper', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'assistant', label: 'AI Assistant', icon: 'Bot', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'operations', label: 'Operations Dashboard', icon: 'LayoutDashboard', roles: ['DISTRICT_OPERATOR', 'ADMIN', 'STATE_OPERATOR'], group: 'operations' },
  { id: 'admin', label: 'Admin Console', icon: 'Settings', roles: ['ADMIN'], group: 'operations' },
]

export const HAZARD_META: Record<HazardType, { label: string; color: string; icon: string }> = {
  LANDSLIDE: { label: 'Landslide', color: 'amber', icon: 'Mountain' },
  FLASH_FLOOD: { label: 'Flash Flood', color: 'cyan', icon: 'Waves' },
  HEAVY_RAIN: { label: 'Heavy Rain', color: 'sky', icon: 'CloudRain' },
  EARTHQUAKE: { label: 'Earthquake', color: 'violet', icon: 'Activity' },
  ROAD_BLOCK: { label: 'Road Block', color: 'orange', icon: 'Road' },
  GENERAL: { label: 'General', color: 'slate', icon: 'Info' },
}

export const SEVERITY_META: Record<Severity, { label: string; badgeClass: string; dotClass: string }> = {
  INFORMATIONAL: { label: 'Informational', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dotClass: 'bg-slate-400' },
  ADVISORY: { label: 'Advisory', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800', dotClass: 'bg-yellow-500' },
  WATCH: { label: 'Watch', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', dotClass: 'bg-orange-500' },
  WARNING: { label: 'Warning', badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', dotClass: 'bg-red-500' },
  EMERGENCY: { label: 'Emergency', badgeClass: 'bg-red-600 text-white border-red-700', dotClass: 'bg-red-500' },
}

export const MODEL_RISK_META: Record<ModelRiskLevel, { label: string; badgeClass: string; ringClass: string }> = {
  LOW: { label: 'Low', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', ringClass: 'ring-emerald-400' },
  MODERATE: { label: 'Moderate', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800', ringClass: 'ring-yellow-400' },
  HIGH: { label: 'High', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', ringClass: 'ring-orange-400' },
  VERY_HIGH: { label: 'Very High', badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', ringClass: 'ring-red-400' },
}

export const VERIFICATION_META: Record<string, { label: string; badgeClass: string }> = {
  OFFICIAL: { label: 'Official', badgeClass: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900' },
  DISTRICT_VERIFIED: { label: 'District Verified', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800' },
  PLATFORM: { label: 'Platform Model', badgeClass: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800' },
  COMMUNITY: { label: 'Community', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' },
  DEMO: { label: 'DEMO', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700' },
  UNVERIFIED: { label: 'Unverified', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
}

export const DEMO_REGIONS = [
  { name: 'Mangan, Sikkim', state: 'Sikkim', lat: 27.494, lng: 88.533, localName: 'मङ्गन' },
  { name: 'Gangtok, Sikkim', state: 'Sikkim', lat: 27.338, lng: 88.606, localName: 'गान्तोक' },
  { name: 'Joshimath, Uttarakhand', state: 'Uttarakhand', lat: 30.554, lng: 79.565, localName: 'जोशीमठ' },
  { name: 'Mandi, Himachal Pradesh', state: 'Himachal Pradesh', lat: 31.71, lng: 76.532, localName: 'मंडी' },
  { name: 'Itanagar, Arunachal Pradesh', state: 'Arunachal Pradesh', lat: 27.084, lng: 93.605, localName: 'ईटानगर' },
  { name: 'Guwahati, Assam', state: 'Assam', lat: 26.144, lng: 91.736, localName: 'গুৱাহাটী' },
  { name: 'Shillong, Meghalaya', state: 'Meghalaya', lat: 25.578, lng: 91.893, localName: 'Shillong' },
  { name: 'Kohima, Nagaland', state: 'Nagaland', lat: 25.675, lng: 94.108, localName: 'Kohima' },
  { name: 'Imphal, Manipur', state: 'Manipur', lat: 24.817, lng: 93.936, localName: 'Imphal' },
  { name: 'Leh, Ladakh', state: 'Ladakh', lat: 34.152, lng: 77.577, localName: 'लेह' },
] as const

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
] as const

export type LanguageCode = typeof LANGUAGES[number]['code']

// Map projection helper: project lat/lng to x/y percentages within a bounding box.
// Bounds cover northern Himalayan / NE region.
export const MAP_BOUNDS = { minLat: 23, maxLat: 35, minLng: 76, maxLng: 96 }

export function projectLatLng(lat: number, lng: number, bounds = MAP_BOUNDS) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100
  return { x, y }
}

// Haversine distance in km
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
