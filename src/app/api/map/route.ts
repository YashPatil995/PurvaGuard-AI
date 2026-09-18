import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Live Map data endpoint — returns all small seeded datasets in a single call.
// Query params: lat, lng (optional) — the user's currently selected location.
// We accept them for cache-keying / future proximity filtering but return all
// records because the dataset is intentionally small for the demo.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const latParam = url.searchParams.get('lat')
    const lngParam = url.searchParams.get('lng')
    const lat = latParam ? Number(latParam) : null
    const lng = lngParam ? Number(lngParam) : null
    const selected =
      lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : null

    const [facilities, incidents, alerts, hazardZones, reports, regions] = await Promise.all([
      db.facility.findMany({
        select: {
          id: true,
          name: true,
          facilityType: true,
          lat: true,
          lng: true,
          status: true,
          capacity: true,
          availableUnits: true,
        },
        orderBy: { name: 'asc' },
      }),
      db.incident.findMany({
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          priority: true,
          status: true,
          lat: true,
          lng: true,
          description: true,
          createdAt: true,
          verificationStatus: true,
          simulationMode: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.alert.findMany({
        select: {
          id: true,
          title: true,
          alertType: true,
          severity: true,
          verificationStatus: true,
          lat: true,
          lng: true,
          radiusKm: true,
          issuedAt: true,
          expiresAt: true,
          status: true,
          simulationMode: true,
          body: true,
        },
        orderBy: { issuedAt: 'desc' },
      }),
      db.hazardZone.findMany({
        select: {
          id: true,
          name: true,
          hazardType: true,
          lat: true,
          lng: true,
          radiusKm: true,
          baselineLevel: true,
          source: true,
        },
      }),
      db.communityReport.findMany({
        select: {
          id: true,
          category: true,
          description: true,
          lat: true,
          lng: true,
          severity: true,
          status: true,
          createdAt: true,
          verificationStatus: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.region.findMany({
        select: {
          id: true,
          canonicalName: true,
          localName: true,
          regionType: true,
          lat: true,
          lng: true,
          coverageStatus: true,
        },
      }),
    ])

    // Filter out any rows with non-finite lat/lng (alerts/facilities have nullable coords).
    const cleanFacilities = facilities.filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng))
    const cleanAlerts = alerts.filter((a) => a.lat != null && a.lng != null && Number.isFinite(a.lat) && Number.isFinite(a.lng))

    return NextResponse.json({
      selected,
      facilities: cleanFacilities,
      incidents,
      alerts: cleanAlerts,
      hazardZones,
      reports,
      regions,
    })
  } catch (err) {
    console.error('[api/map] error:', err)
    return NextResponse.json(
      {
        error: 'Failed to load map data',
        facilities: [],
        incidents: [],
        alerts: [],
        hazardZones: [],
        reports: [],
        regions: [],
        selected: null,
      },
      { status: 500 }
    )
  }
}
