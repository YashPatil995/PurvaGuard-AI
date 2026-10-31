// PurvaGuard AI — North-East India Disaster Intelligence Aggregator
// Official sources:
// 1. NDMA SACHET (Common Alerting Protocol CAP v1.2)
// 2. NESAC / NER-DRR (Seismic telemetry, FLEWS)

export const NE_STATES = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
] as const

export type NeState = (typeof NE_STATES)[number]

export const NE_STATE_CODES: Record<string, NeState> = {
  AS: 'Assam',
  AR: 'Arunachal Pradesh',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  SK: 'Sikkim',
  TR: 'Tripura',
}

// Bounding box for North-East India (approx: Lat 21.5°N - 29.5°N, Lng 88.0°E - 97.5°E)
export const NE_BOUNDS = {
  minLat: 21.5,
  maxLat: 29.6,
  minLng: 87.8,
  maxLng: 97.6,
}

// Common district & geographic keywords per state for deep text/areaDesc matching
export const NE_DISTRICTS: Record<NeState, string[]> = {
  Assam: [
    'assam', 'guwahati', 'kamrup', 'dibrugarh', 'silchar', 'cachar', 'dhubri',
    'south salmara', 'goalpara', 'barpeta', 'nagaon', 'jorhat', 'sonitpur',
    'tezpur', 'tinsukia', 'dhemaji', 'lakhimpur', 'morigaon', 'karbi anglong',
    'dima hasao', 'haflong', 'karimganj', 'hailakandi', 'baksa', 'chirang',
    'kokrajhar', 'udalguri', 'charaideo', 'biswanath', 'majuli', 'brahmaputra',
    'barak', 'asdma',
  ],
  'Arunachal Pradesh': [
    'arunachal', 'itanagar', 'tawang', 'west kameng', 'bomdila', 'east kameng',
    'papum pare', 'lower subansiri', 'ziro', 'upper subansiri', 'west siang',
    'east siang', 'pasighat', 'upper siang', 'pangin', 'changlang', 'tirap',
    'longding', 'lohit', 'tezu', 'anjaw', 'dibang valley', 'kurung kumey',
  ],
  Manipur: [
    'manipur', 'imphal', 'churachandpur', 'senapati', 'ukhrul', 'chandel',
    'tamenglong', 'thoubal', 'bishnupur', 'kangpokpi', 'jiribam', 'tengnoupal',
    'kamjong', 'noney', 'pherzawl',
  ],
  Meghalaya: [
    'meghalaya', 'shillong', 'sohra', 'cherrapunji', 'east khasi', 'west khasi',
    'south west khasi', 'ri bhoi', 'umiam', 'west garo', 'tura', 'east garo',
    'south garo', 'north garo', 'south west garo', 'east jaintia', 'west jaintia',
  ],
  Mizoram: [
    'mizoram', 'aizawl', 'lunglei', 'saiha', 'champhai', 'kolasib', 'serchhip',
    'lawngtlai', 'mamit', 'hnahthial', 'khawzawl', 'saitual',
  ],
  Nagaland: [
    'nagaland', 'kohima', 'dimapur', 'mokokchung', 'tuensang', 'wokh', 'zunheboto',
    'phek', 'mon', 'peren', 'longleng', 'kiphire', 'noklak', 'chumoukedima',
    'niuland', 'tseminyu',
  ],
  Sikkim: [
    'sikkim', 'gangtok', 'mangan', 'chungthang', 'namchi', 'gyalshing',
    'pakyong', 'soreng', 'teesta', 'rangpo', 'singtam', 'lachung', 'lamten',
  ],
  Tripura: [
    'tripura', 'agartala', 'west tripura', 'sepahijala', 'khowai', 'gomati',
    'south tripura', 'dhalai', 'unakoti', 'north tripura', 'dharmanagar',
  ],
}

/**
 * Checks if a given point is within the geographic North-East bounding box.
 */
export function isPointInNorthEast(lat: number, lng: number): boolean {
  return (
    lat >= NE_BOUNDS.minLat &&
    lat <= NE_BOUNDS.maxLat &&
    lng >= NE_BOUNDS.minLng &&
    lng <= NE_BOUNDS.maxLng
  )
}

/**
 * Identifies which North-East states are affected by a given alert,
 * inspecting both geographic coordinates and rich CAP areaDesc / text content.
 */
export function matchNeStates(data: {
  title?: string
  body?: string
  areaDesc?: string
  issuerName?: string
  lat?: number | null
  lng?: number | null
}): NeState[] {
  const matched = new Set<NeState>()

  const fullText = `${data.title || ''} ${data.body || ''} ${data.areaDesc || ''} ${data.issuerName || ''}`.toLowerCase()

  // 1. District and State keyword matching
  for (const [state, keywords] of Object.entries(NE_DISTRICTS) as [NeState, string[]][]) {
    for (const kw of keywords) {
      // Word boundary match
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      if (regex.test(fullText)) {
        matched.add(state)
        break
      }
    }
  }

  // 2. Coordinate fallback (if coordinates exist and land strictly in NE bounds)
  if (data.lat != null && data.lng != null && isPointInNorthEast(data.lat, data.lng)) {
    // If not matched to a specific state by keyword yet, include NE general
    if (matched.size === 0) {
      // Rough coordinate partition
      if (data.lng <= 89.0) matched.add('Sikkim')
      else if (data.lat >= 27.0 && data.lng >= 91.5) matched.add('Arunachal Pradesh')
      else if (data.lat <= 24.5 && data.lng <= 92.5) matched.add('Tripura')
      else if (data.lat <= 24.5 && data.lng >= 92.5 && data.lng <= 93.5) matched.add('Mizoram')
      else if (data.lat >= 24.5 && data.lat <= 25.8 && data.lng >= 93.5) matched.add('Manipur')
      else if (data.lat >= 25.5 && data.lng >= 93.5) matched.add('Nagaland')
      else if (data.lat >= 25.0 && data.lat <= 26.0 && data.lng >= 90.0 && data.lng <= 92.8) matched.add('Meghalaya')
      else matched.add('Assam')
    }
  }

  return Array.from(matched)
}
