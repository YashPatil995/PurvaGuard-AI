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
  | 'prediction'
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
  { id: 'prediction', label: 'AI Prediction', icon: 'BrainCircuit', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'risk', label: 'Risk & Forecast', icon: 'Activity', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'alerts', label: 'Alerts', icon: 'BellRing', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'sos', label: 'SOS / Get Help', icon: 'Siren', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'safe-places', label: 'Safe Places & Routes', icon: 'ShieldCheck', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'reports', label: 'Report a Hazard', icon: 'Megaphone', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'volunteer', label: 'Volunteer / NGO', icon: 'HandHeart', roles: ['PUBLIC', 'VOLUNTEER', 'ADMIN', 'DISTRICT_OPERATOR', 'STATE_OPERATOR'], group: 'public' },
  { id: 'preparedness', label: 'Preparedness', icon: 'BookOpen', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'news', label: 'News & Updates', icon: 'Newspaper', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'public' },
  { id: 'admin', label: 'Admin Dashboard', icon: 'LayoutDashboard', roles: ['PUBLIC', 'DISTRICT_OPERATOR', 'ADMIN', 'VOLUNTEER', 'STATE_OPERATOR', 'ANALYST'], group: 'operations' },
]

export const HAZARD_META: Record<HazardType, { label: string; color: string; icon: string; image: string }> = {
  LANDSLIDE: { label: 'Landslide', color: 'amber', icon: 'Mountain', image: '/hazard-landslide.png' },
  FLASH_FLOOD: { label: 'Flash Flood', color: 'cyan', icon: 'Waves', image: '/hazard-flood.png' },
  HEAVY_RAIN: { label: 'Heavy Rain', color: 'sky', icon: 'CloudRain', image: '/hazard-rain.png' },
  EARTHQUAKE: { label: 'Earthquake', color: 'violet', icon: 'Activity', image: '/hazard-earthquake.png' },
  ROAD_BLOCK: { label: 'Road Block', color: 'orange', icon: 'Route', image: '/hazard-landslide.png' },
  GENERAL: { label: 'General', color: 'slate', icon: 'Info', image: '/hero-himalaya.png' },
}

// Images used throughout the site
export const SITE_IMAGES = {
  hero: '/hero-himalaya.png',
  mapBg: '/map-ne-india.png',
  rescue: '/rescue-shelter.png',
  emergencyKit: '/emergency-kit.png',
  localityTown: '/locality-town.png',
} as const

// The 6 SMS recipients the user specified (demo sample numbers)
export const DEFAULT_SMS_RECIPIENTS = [
  { phone: '917666891772', name: 'Recipient 1' },
  { phone: '919236075390', name: 'Recipient 2' },
  { phone: '918233709073', name: 'Recipient 3' },
  { phone: '919149882790', name: 'Recipient 4' },
  { phone: '918439410976', name: 'Recipient 5' },
  { phone: '917667585166', name: 'Recipient 6' },
] as const

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

// North Eastern Region focus — all 8 NE states + Sikkim
export const DEMO_REGIONS = [
  { name: 'Mangan, Sikkim', state: 'Sikkim', lat: 27.494, lng: 88.533, localName: 'मङ्गन' },
  { name: 'Gangtok, Sikkim', state: 'Sikkim', lat: 27.338, lng: 88.606, localName: 'गान्तोक' },
  { name: 'Chungthang, Sikkim', state: 'Sikkim', lat: 27.595, lng: 88.641, localName: 'चुंगथाङ' },
  { name: 'Itanagar, Arunachal Pradesh', state: 'Arunachal Pradesh', lat: 27.084, lng: 93.605, localName: 'ईटानगर' },
  { name: 'Tawang, Arunachal Pradesh', state: 'Arunachal Pradesh', lat: 27.586, lng: 91.659, localName: 'तवांग' },
  { name: 'Bomdila, Arunachal Pradesh', state: 'Arunachal Pradesh', lat: 27.264, lng: 92.416, localName: 'बोमडिला' },
  { name: 'Ziro, Arunachal Pradesh', state: 'Arunachal Pradesh', lat: 27.545, lng: 93.837, localName: 'जीरो' },
  { name: 'Guwahati, Assam', state: 'Assam', lat: 26.144, lng: 91.736, localName: 'গুৱাহাটী' },
  { name: 'Dibrugarh, Assam', state: 'Assam', lat: 27.472, lng: 94.912, localName: 'ডিব্ৰুগড়' },
  { name: 'Silchar, Assam', state: 'Assam', lat: 24.833, lng: 92.778, localName: 'শিলচৰ' },
  { name: 'Haflong, Assam', state: 'Assam', lat: 25.169, lng: 93.014, localName: 'হাফলং' },
  { name: 'Shillong, Meghalaya', state: 'Meghalaya', lat: 25.578, lng: 91.893, localName: 'Shillong' },
  { name: 'Sohra (Cherrapunji), Meghalaya', state: 'Meghalaya', lat: 25.27, lng: 91.73, localName: 'Sohra' },
  { name: 'Tura, Meghalaya', state: 'Meghalaya', lat: 25.519, lng: 90.22, localName: 'Tura' },
  { name: 'Kohima, Nagaland', state: 'Nagaland', lat: 25.675, lng: 94.108, localName: 'Kohima' },
  { name: 'Dimapur, Nagaland', state: 'Nagaland', lat: 25.909, lng: 93.727, localName: 'Dimapur' },
  { name: 'Imphal, Manipur', state: 'Manipur', lat: 24.817, lng: 93.936, localName: 'Imphal' },
  { name: 'Churachandpur, Manipur', state: 'Manipur', lat: 24.327, lng: 93.686, localName: 'Churachandpur' },
  { name: 'Aizawl, Mizoram', state: 'Mizoram', lat: 23.727, lng: 92.718, localName: 'Aizawl' },
  { name: 'Agartala, Tripura', state: 'Tripura', lat: 23.831, lng: 91.286, localName: 'অগৰতলা' },
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
// Bounds cover North East India only (per user focus)
export const MAP_BOUNDS = { minLat: 21, maxLat: 29, minLng: 88, maxLng: 97 }

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
