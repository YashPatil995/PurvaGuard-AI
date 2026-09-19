// PurvaGuard AI — Facilities API
// GET: query lat,lng,type,radius(default 30km). Returns facilities sorted by distance (haversine).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { distanceKm } from '@/lib/constants'

const FACILITY_TYPES = new Set([
  'SHELTER', 'HOSPITAL', 'RELIEF_CENTER', 'POLICE_STATION', 'FIRE_STATION', 'ASSEMBLY_POINT',
])

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const type = searchParams.get('type')?.toUpperCase()
    const radius = Math.min(200, Math.max(1, Number(searchParams.get('radius') ?? '30') || 30))

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }
    if (type && !FACILITY_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid facility type' }, { status: 400 })
    }

    const where = type ? { facilityType: type } : {}
    const facilities = await db.facility.findMany({ where })

    const withDistance = facilities
      .map((f) => ({
        id: f.id,
        name: f.name,
        facilityType: f.facilityType,
        lat: f.lat,
        lng: f.lng,
        address: f.address,
        phone: f.phone,
        capacity: f.capacity,
        availableUnits: f.availableUnits,
        status: f.status,
        verifiedAt: f.verifiedAt,
        source: f.source,
        distanceKm: Math.round(distanceKm(lat, lng, f.lat, f.lng) * 100) / 100,
      }))
      .filter((f) => f.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    return NextResponse.json({
      items: withDistance,
      count: withDistance.length,
      origin: { lat, lng },
      radiusKm: radius,
      typeFilter: type ?? null,
      simulationMode: true,
    })
  } catch (err: any) {
    console.error('[api/facilities GET] error', err)
    return NextResponse.json(
      { error: 'Failed to list facilities', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
