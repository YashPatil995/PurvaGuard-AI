// PurvaGuard AI — OpenStreetMap Emergency Facilities Client
// Fetches genuine hospitals, clinics, shelters, police & fire stations via Overpass / OSM
// and persists them in the Supabase PostgreSQL Facility table.

import { db } from '@/lib/db'
import { distanceKm } from '@/lib/constants'

export interface RealFacility {
  id: string
  name: string
  facilityType: 'HOSPITAL' | 'CLINIC' | 'SHELTER' | 'RELIEF_CENTER' | 'POLICE_STATION' | 'FIRE_STATION' | 'ASSEMBLY_POINT'
  lat: number
  lng: number
  address: string | null
  phone: string | null
  hours: string | null
  status: string
  verifiedAt: string | null
  source: string
  distanceKm: number
}

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

/**
 * Fetch facilities from OpenStreetMap Overpass API using fast mirror racing
 */
async function fetchFromOverpass(lat: number, lng: number, radiusM: number): Promise<any[]> {
  const query = `[out:json][timeout:5];(node["amenity"~"hospital|clinic|shelter|police|fire_station"](around:${radiusM},${lat},${lng}););out 25;`

  const promises = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(3500),
    })
    if (res.ok) {
      const json = await res.json()
      if (json && Array.isArray(json.elements) && json.elements.length > 0) {
        return json.elements
      }
    }
    throw new Error('No elements')
  })

  try {
    return await Promise.any(promises)
  } catch {
    return []
  }
}

/**
 * Fallback to OpenStreetMap Nominatim for emergency amenities with parallel category queries
 */
async function fetchFromNominatim(lat: number, lng: number): Promise<any[]> {
  const categories = ['hospital', 'clinic', 'police station', 'fire station', 'shelter']
  const delta = 0.35 // ~35km bounding box
  const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`

  const fetchPromises = categories.map(async (cat) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cat)}&format=json&addressdetails=1&extratags=1&viewbox=${viewbox}&bounded=1&limit=6`
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)',
        },
        signal: AbortSignal.timeout(3500),
      })
      if (res.ok) {
        const items = await res.json()
        if (Array.isArray(items)) return items
      }
    } catch {}
    return []
  })

  const results = await Promise.all(fetchPromises)
  return results.flat()
}

function mapOsmAmenityToFacilityType(
  amenity: string,
  typeTag?: string,
  name?: string
): 'HOSPITAL' | 'CLINIC' | 'SHELTER' | 'RELIEF_CENTER' | 'POLICE_STATION' | 'FIRE_STATION' | 'ASSEMBLY_POINT' {
  const norm = (amenity || typeTag || '').toLowerCase()
  const n = (name || '').toLowerCase()

  // 1. Police
  if (norm.includes('police') || n.includes('police') || n.includes('thana') || n.includes('outpost')) {
    if (!n.includes('hospital') && !n.includes('clinic')) return 'POLICE_STATION'
  }

  // 2. Fire
  if (norm.includes('fire') || n.includes('fire station') || n.includes('fire brigade') || n.includes('fire service')) {
    return 'FIRE_STATION'
  }

  // 3. Shelters
  if (norm.includes('shelter') || norm.includes('social_facility') || n.includes('shelter') || n.includes('ashray')) {
    return 'SHELTER'
  }

  // 4. Relief & Community Centers
  if (norm.includes('relief') || norm.includes('community') || n.includes('relief center') || n.includes('community centre')) {
    return 'RELIEF_CENTER'
  }

  // 5. Assembly Point
  if (norm.includes('assembly_point') || n.includes('assembly point')) {
    return 'ASSEMBLY_POINT'
  }

  // 6. Clinic / Dispensary / Diagnostic Center
  // Explicit distinction from Hospitals: clinics, dispensaries, diagnostic centers, eye clinics, dental
  if (
    norm.includes('clinic') ||
    norm.includes('dispensary') ||
    norm.includes('doctor') ||
    norm.includes('dentist') ||
    norm.includes('pharmacy') ||
    n.includes('clinic') ||
    n.includes('dispensary') ||
    n.includes('diagnostic') ||
    n.includes('homeo') ||
    n.includes('dental') ||
    n.includes('optical') ||
    n.includes('eye care') ||
    n.includes('health centre') ||
    n.includes('health center') ||
    n.includes('swasthya kendra') ||
    n.includes('phc') ||
    n.includes('sub-centre') ||
    n.includes('sub centre')
  ) {
    if (n.includes('hospital') && !n.includes('clinic')) {
      return 'HOSPITAL'
    }
    return 'CLINIC'
  }

  // 7. Hospital
  if (
    norm.includes('hospital') ||
    n.includes('hospital') ||
    n.includes('chikitsalaya') ||
    n.includes('medical college') ||
    n.includes('nursing home') ||
    n.includes('blood bank')
  ) {
    return 'HOSPITAL'
  }

  // Default to CLINIC for small general medical tags, HOSPITAL if major
  return norm.includes('health') ? 'CLINIC' : 'HOSPITAL'
}

/**
 * Main facilities fetcher: Checks cache, queries OSM if needed, stores in Supabase, returns formatted rows.
 */
export async function getNearbyEmergencyFacilities(
  originLat: number,
  originLng: number,
  radiusKm = 30,
  typeFilter?: string
): Promise<{ items: RealFacility[]; source: string; isRealtime: boolean }> {
  // 1. Check local database cache first
  const existing = await db.facility.findMany()
  const matchingFromDb = existing
    .map((f) => {
      const d = distanceKm(originLat, originLng, f.lat, f.lng)
      return {
        id: f.id,
        name: f.name,
        facilityType: f.facilityType as any,
        lat: f.lat,
        lng: f.lng,
        address: f.address,
        phone: f.phone,
        hours: f.hours,
        status: f.status,
        verifiedAt: f.verifiedAt ? f.verifiedAt.toISOString() : null,
        source: f.source || 'OpenStreetMap',
        distanceKm: Math.round(d * 100) / 100,
      }
    })
    .filter((f) => f.distanceKm <= radiusKm)
    .filter((f) => !typeFilter || typeFilter === 'ALL' || f.facilityType === typeFilter)

  // If we already have 5 or more cached real facilities in this radius, return them instantly
  if (matchingFromDb.length >= 5) {
    matchingFromDb.sort((a, b) => a.distanceKm - b.distanceKm)
    return {
      items: matchingFromDb,
      source: 'OpenStreetMap (Cached in Supabase)',
      isRealtime: false,
    }
  }

  // 2. Fetch fresh real OpenStreetMap data
  let rawElements: any[] = []
  let usedSource = 'OpenStreetMap (Overpass API)'

  try {
    rawElements = await fetchFromOverpass(originLat, originLng, radiusKm * 1000)
    if (rawElements.length === 0) {
      usedSource = 'OpenStreetMap (Nominatim Geo-Index)'
      rawElements = await fetchFromNominatim(originLat, originLng)
    }
  } catch (err) {
    console.warn('[OSM Facilities] Fetch error, checking database cache fallback:', err)
  }

  // 3. Normalize and persist newly discovered facilities in Supabase
  const facilitiesToAdd: Array<{
    name: string
    facilityType: string
    lat: number
    lng: number
    address: string | null
    phone: string | null
    source: string
  }> = []

  for (const el of rawElements) {
    const lat = Number(el.lat ?? el.center?.lat)
    const lng = Number(el.lon ?? el.center?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const tags = el.tags || el.extratags || {}
    let name = tags.name || tags['name:en'] || el.name || el.display_name?.split(',')?.[0]?.trim() || ''
    if (!name || name.length < 2) continue

    // Skip road segments or highway results returned by broad query matching
    const osmClass = (el.class || tags.highway || '').toLowerCase()
    if (osmClass === 'highway' || osmClass === 'route' || /^sh\d+|^nh\d+|^mdr/i.test(name)) {
      continue
    }

    const facilityType = mapOsmAmenityToFacilityType(tags.amenity || el.type || el.class, tags.healthcare, name)

    // Build real address from OSM tags
    const addrParts = [
      tags['addr:full'],
      tags['addr:street'],
      tags['addr:suburb'] || tags['addr:district'],
      tags['addr:city'],
      tags['addr:postcode'],
    ].filter(Boolean)

    let address = addrParts.length > 0 ? addrParts.join(', ') : (el.display_name || null)
    if (address && address.length > 180) {
      address = address.slice(0, 180) + '…'
    }

    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null

    facilitiesToAdd.push({
      name,
      facilityType,
      lat,
      lng,
      address,
      phone,
      source: usedSource,
    })
  }

  // Upsert records into database (avoiding duplicate names within 500m)
  for (const item of facilitiesToAdd) {
    const dup = existing.find(
      (e) => e.name.toLowerCase() === item.name.toLowerCase() || distanceKm(e.lat, e.lng, item.lat, item.lng) < 0.2
    )
    if (!dup) {
      try {
        await db.facility.create({
          data: {
            name: item.name,
            facilityType: item.facilityType,
            lat: item.lat,
            lng: item.lng,
            address: item.address,
            phone: item.phone,
            status: 'OPEN',
            source: item.source,
            verifiedAt: new Date(),
          },
        })
      } catch {
        // Skip DB collision
      }
    }
  }

  // 4. Reload from database and return sorted by distance
  const allFacilities = await db.facility.findMany()
  const result = allFacilities
    .map((f) => {
      const d = distanceKm(originLat, originLng, f.lat, f.lng)
      return {
        id: f.id,
        name: f.name,
        facilityType: f.facilityType as any,
        lat: f.lat,
        lng: f.lng,
        address: f.address,
        phone: f.phone,
        hours: f.hours,
        status: f.status,
        verifiedAt: f.verifiedAt ? f.verifiedAt.toISOString() : null,
        source: f.source || usedSource,
        distanceKm: Math.round(d * 100) / 100,
      }
    })
    .filter((f) => f.distanceKm <= radiusKm)
    .filter((f) => !typeFilter || typeFilter === 'ALL' || f.facilityType === typeFilter)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  return {
    items: result,
    source: usedSource,
    isRealtime: rawElements.length > 0,
  }
}
