// PurvaGuard AI — Real Road Route Navigation API
// Queries OSRM (Open Source Routing Machine) for road geometry, real distances, and ETAs.
// Provides Google Maps turn-by-turn fallback and transparent safety disclaimers.

import { NextRequest, NextResponse } from 'next/server'
import { distanceKm } from '@/lib/constants'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const originLat = Number(searchParams.get('originLat'))
    const originLng = Number(searchParams.get('originLng'))
    const destLat = Number(searchParams.get('destLat'))
    const destLng = Number(searchParams.get('destLng'))
    const profile = searchParams.get('profile') || 'driving' // driving | walking | cycling

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLng) ||
      !Number.isFinite(destLat) ||
      !Number.isFinite(destLng)
    ) {
      return NextResponse.json(
        { error: 'Valid originLat, originLng, destLat, and destLng are required' },
        { status: 400 }
      )
    }

    // Google Maps external fallback link
    const travelMode = profile === 'walking' ? 'walking' : 'driving'
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat.toFixed(6)},${originLng.toFixed(6)}&destination=${destLat.toFixed(6)},${destLng.toFixed(6)}&travelmode=${travelMode}`

    const osrmProfile = profile === 'walking' ? 'foot' : profile === 'cycling' ? 'bike' : 'driving'
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`

    try {
      const osrmRes = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'PurvaGuard-AI/1.0' },
        signal: AbortSignal.timeout(7000),
      })

      if (osrmRes.ok) {
        const data = await osrmRes.json()
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0]
          const distanceInKm = Math.round((route.distance / 1000) * 100) / 100
          const durationInMin = Math.max(1, Math.round((route.duration / 60) * 10) / 10)

          // Extract key steps/maneuvers
          const steps: Array<{ instruction: string; distanceM: number }> = []
          if (route.legs && route.legs[0]?.steps) {
            for (const s of route.legs[0].steps) {
              const name = s.name ? ` onto ${s.name}` : ''
              const type = s.maneuver?.type || 'continue'
              const modifier = s.maneuver?.modifier ? ` ${s.maneuver.modifier}` : ''
              steps.push({
                instruction: `${type.toUpperCase()}${modifier}${name}`,
                distanceM: Math.round(s.distance),
              })
            }
          }

          return NextResponse.json({
            ok: true,
            provider: 'OSRM (Open Source Routing Machine)',
            isIllustrative: false,
            distanceKm: distanceInKm,
            durationMin: durationInMin,
            geometry: route.geometry?.coordinates || [], // [[lng, lat], ...]
            steps: steps.slice(0, 10),
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
            googleMapsUrl,
            disclaimer:
              'Road routing is an informational aid. Real-time disaster conditions (inundation, landslides, debris) can alter road viability. Never cross flooded roads.',
          })
        }
      }
    } catch (osrmErr: any) {
      console.warn('[Routing] OSRM request failed, using straight-line fallback:', osrmErr.message)
    }

    // Fallback: Illustrative straight-line calculation if road graph fails
    const straightLineKm = Math.round(distanceKm(originLat, originLng, destLat, destLng) * 100) / 100
    const estSpeedKph = profile === 'walking' ? 4.5 : 30
    const estDurationMin = Math.max(1, Math.round((straightLineKm / estSpeedKph) * 60))

    return NextResponse.json({
      ok: true,
      provider: 'Illustrative Straight-Line (OSRM Fallback)',
      isIllustrative: true,
      warning:
        'Official road routing was unreachable for these exact coordinates. Showing approximate straight-line reference.',
      distanceKm: straightLineKm,
      durationMin: estDurationMin,
      geometry: [
        [originLng, originLat],
        [destLng, destLat],
      ],
      steps: [
        {
          instruction: 'Proceed toward destination along safe verified paths',
          distanceM: Math.round(straightLineKm * 1000),
        },
      ],
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      googleMapsUrl,
      disclaimer:
        'Straight-line representation only. Terrain and obstacles are not accounted for. Follow emergency authority guidance.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate navigation route', detail: err.message },
      { status: 500 }
    )
  }
}
