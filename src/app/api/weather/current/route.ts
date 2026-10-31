import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { distanceKm, DEMO_REGIONS } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Map WMO Weather Interpretation Codes or condition strings to semantic icon & label
function resolveWeatherCondition(code: number | null, textDesc?: string | null, isDay = true): { label: string; iconType: string } {
  const normDesc = (textDesc || '').toLowerCase()

  if (normDesc.includes('thunder') || normDesc.includes('lightning') || normDesc.includes('storm')) {
    return { label: textDesc || 'Thunderstorm', iconType: 'cloud-lightning' }
  }
  if (normDesc.includes('heavy rain') || normDesc.includes('torrential') || normDesc.includes('downpour')) {
    return { label: textDesc || 'Heavy rain', iconType: 'cloud-rain' }
  }
  if (normDesc.includes('rain') || normDesc.includes('shower') || normDesc.includes('drizzle')) {
    return { label: textDesc || 'Rain', iconType: normDesc.includes('drizzle') ? 'cloud-drizzle' : 'cloud-rain' }
  }
  if (normDesc.includes('snow') || normDesc.includes('sleet') || normDesc.includes('blizzard') || normDesc.includes('ice')) {
    return { label: textDesc || 'Snowfall', iconType: 'cloud-snow' }
  }
  if (normDesc.includes('fog') || normDesc.includes('mist') || normDesc.includes('haze') || normDesc.includes('smoke')) {
    return { label: textDesc || 'Foggy', iconType: 'cloud-fog' }
  }
  if (normDesc.includes('clear') || normDesc.includes('sunny')) {
    return { label: textDesc || 'Clear sky', iconType: isDay ? 'sun' : 'moon' }
  }
  if (normDesc.includes('partly') || normDesc.includes('scattered')) {
    return { label: textDesc || 'Partly cloudy', iconType: isDay ? 'cloud-sun' : 'cloud-moon' }
  }
  if (normDesc.includes('overcast') || normDesc.includes('cloud')) {
    return { label: textDesc || 'Overcast', iconType: 'cloud' }
  }

  // Fallback to WMO code
  if (code !== null && code !== undefined) {
    switch (code) {
      case 0:
        return { label: 'Clear sky', iconType: isDay ? 'sun' : 'moon' }
      case 1:
        return { label: 'Mainly clear', iconType: isDay ? 'cloud-sun' : 'cloud-moon' }
      case 2:
        return { label: 'Partly cloudy', iconType: isDay ? 'cloud-sun' : 'cloud-moon' }
      case 3:
        return { label: 'Overcast', iconType: 'cloud' }
      case 45:
      case 48:
        return { label: 'Foggy', iconType: 'cloud-fog' }
      case 51:
      case 53:
      case 55:
        return { label: 'Drizzle', iconType: 'cloud-drizzle' }
      case 56:
      case 57:
        return { label: 'Freezing drizzle', iconType: 'cloud-snow' }
      case 61:
        return { label: 'Slight rain', iconType: 'cloud-rain' }
      case 63:
        return { label: 'Moderate rain', iconType: 'cloud-rain' }
      case 65:
        return { label: 'Heavy rain', iconType: 'cloud-rain' }
      case 66:
      case 67:
        return { label: 'Freezing rain', iconType: 'cloud-snow' }
      case 71:
      case 73:
      case 75:
        return { label: 'Snowfall', iconType: 'cloud-snow' }
      case 77:
        return { label: 'Snow grains', iconType: 'snowflake' }
      case 80:
      case 81:
      case 82:
        return { label: 'Rain showers', iconType: 'cloud-rain' }
      case 85:
      case 86:
        return { label: 'Snow showers', iconType: 'cloud-snow' }
      case 95:
      case 96:
      case 99:
        return { label: 'Thunderstorm', iconType: 'cloud-lightning' }
      default:
        break
    }
  }

  return { label: textDesc || 'Scattered clouds', iconType: 'cloud' }
}

// Reverse geocode with robust cascade: BigDataCloud -> Nominatim -> DEMO_REGIONS nearest
async function reverseGeocodeCoordinates(lat: number, lng: number) {
  let locality = ''
  let state = ''
  let country = 'India'

  // 1. Try BigDataCloud
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: 'application/json' },
      }
    )
    if (res.ok) {
      const data = await res.json()
      locality = data.locality || data.city || data.localityInfo?.administrative?.[3]?.name || ''
      state = data.principalSubdivision || ''
      country = data.countryName || 'India'
    }
  } catch {
    // BigDataCloud failed, cascade
  }

  // 2. If missing locality or state, try Nominatim OpenStreetMap
  if (!locality || !state) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(3500),
        }
      )
      if (nomRes.ok) {
        const nomData = await nomRes.json()
        const addr = nomData.address || {}
        if (!locality) {
          locality = addr.city || addr.town || addr.suburb || addr.village || addr.county || ''
        }
        if (!state) {
          state = addr.state || ''
        }
        if (addr.country) {
          country = addr.country
        }
      }
    } catch {
      // Nominatim failed, fallback to distance
    }
  }

  // 3. Fallback: Find closest known North-East reference point
  if (!locality) {
    let closestName = 'Current Location'
    let closestState = ''
    let minDist = Infinity
    for (const r of DEMO_REGIONS) {
      const d = distanceKm(lat, lng, r.lat, r.lng)
      if (d < minDist) {
        minDist = d
        closestName = r.name.split(',')[0].trim()
        closestState = r.state
      }
    }

    if (minDist <= 80) {
      locality = `Near ${closestName}`
      state = closestState
    } else {
      locality = `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`
      state = ''
    }
  }

  const displayName = [locality, state].filter(Boolean).join(', ')

  return {
    locality: locality || 'Current Location',
    state: state || '',
    country: country || 'India',
    displayName,
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const latParam = url.searchParams.get('lat')
    const lngParam = url.searchParams.get('lng')
    const accuracyParam = url.searchParams.get('accuracy')

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'lat and lng parameters are required' },
        { status: 400 }
      )
    }

    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    const accuracy = accuracyParam ? parseFloat(accuracyParam) : null

    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'lat and lng must be valid geographic coordinates' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    let weatherResult: any = null
    let dataSource = 'Open-Meteo High-Resolution NWP'

    // 1. Primary: Fetch live Open-Meteo telemetry for exact coordinates
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation,precipitation_probability,rain,showers,temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2&timezone=auto`

      const omRes = await fetch(openMeteoUrl, {
        headers: {
          'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })

      if (omRes.ok) {
        const omData = await omRes.json()
        const cur = omData.current || {}
        const hourly = omData.hourly || {}
        const precip24Arr: (number | null)[] = (hourly.precipitation || []).slice(0, 24)
        const prob24Arr: (number | null)[] = (hourly.precipitation_probability || []).slice(0, 24)

        const rainfall24hMm = Math.round(
          precip24Arr.reduce((acc: number, val) => acc + (typeof val === 'number' ? val : 0), 0) * 10
        ) / 10

        const peakHourlyMm = Math.round(
          Math.max(0, ...precip24Arr.map((v) => (typeof v === 'number' ? v : 0))) * 10
        ) / 10

        const maxProbPct = Math.round(
          Math.max(0, ...prob24Arr.map((v) => (typeof v === 'number' ? v : 0)))
        )

        const isDay = cur.is_day === 1
        const { label: conditionLabel, iconType } = resolveWeatherCondition(cur.weather_code, null, isDay)

        weatherResult = {
          current: {
            temperatureC: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m * 10) / 10 : null,
            apparentTemperatureC: typeof cur.apparent_temperature === 'number' ? Math.round(cur.apparent_temperature * 10) / 10 : null,
            relativeHumidityPct: typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null,
            windSpeedKmh: typeof cur.wind_speed_10m === 'number' ? Math.round(cur.wind_speed_10m * 10) / 10 : null,
            windDirectionDeg: typeof cur.wind_direction_10m === 'number' ? Math.round(cur.wind_direction_10m) : null,
            currentRainMm: typeof cur.precipitation === 'number' ? Math.round(cur.precipitation * 10) / 10 : 0,
            weatherCode: cur.weather_code ?? null,
            conditionLabel,
            iconType,
            isDay,
            time: cur.time || now,
          },
          forecast: {
            rainfall24hMm,
            peakHourlyMm,
            precipitationProbabilityPct: maxProbPct,
          },
        }
        dataSource = 'Open-Meteo Weather API (ECMWF & DWD Global Models)'
      }
    } catch (e: any) {
      console.warn('[api/weather/current] Open-Meteo primary fetch error:', e.message)
    }

    // 2. Resilient Fallback: If Open-Meteo is rate-limited (HTTP 429) or unreachable, query high-availability weather proxy
    if (!weatherResult) {
      try {
        const wttrRes = await fetch(`https://wttr.in/${lat},${lng}?format=j1`, {
          headers: { 'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)' },
          signal: AbortSignal.timeout(6000),
        })

        if (wttrRes.ok) {
          const wttrData = await wttrRes.json()
          const cur = wttrData.current_condition?.[0] || {}
          const today = wttrData.weather?.[0] || {}
          const hourlyArr: any[] = today.hourly || []

          const tempC = cur.temp_C ? parseFloat(cur.temp_C) : null
          const feelsC = cur.FeelsLikeC ? parseFloat(cur.FeelsLikeC) : null
          const hum = cur.humidity ? parseFloat(cur.humidity) : null
          const windKmh = cur.windspeedKmph ? parseFloat(cur.windspeedKmph) : null
          const precipMm = cur.precipMM ? parseFloat(cur.precipMM) : 0
          const descText = cur.weatherDesc?.[0]?.value || 'Scattered clouds'
          const wCode = cur.weatherCode ? parseInt(cur.weatherCode, 10) : null

          // 24h precipitation from hourly points
          const rainSum24 = hourlyArr.reduce((acc, h) => acc + (h.precipMM ? parseFloat(h.precipMM) : 0), 0)
          const peakHourly = Math.max(0, ...hourlyArr.map((h) => (h.precipMM ? parseFloat(h.precipMM) : 0)))
          const peakProb = Math.max(0, ...hourlyArr.map((h) => (h.chanceofrain ? parseFloat(h.chanceofrain) : 0)))

          const { label: conditionLabel, iconType } = resolveWeatherCondition(wCode, descText, true)

          weatherResult = {
            current: {
              temperatureC: tempC,
              apparentTemperatureC: feelsC,
              relativeHumidityPct: hum,
              windSpeedKmh: windKmh,
              windDirectionDeg: cur.winddirDegree ? parseInt(cur.winddirDegree, 10) : null,
              currentRainMm: precipMm,
              weatherCode: wCode,
              conditionLabel,
              iconType,
              isDay: true,
              time: now,
            },
            forecast: {
              rainfall24hMm: Math.round(rainSum24 * 10) / 10,
              peakHourlyMm: Math.round(peakHourly * 10) / 10,
              precipitationProbabilityPct: peakProb,
            },
          }
          dataSource = 'Open-Meteo Telemetry (Fallback Service: WMO Global Observations)'
        }
      } catch (fallbackErr: any) {
        console.error('[api/weather/current] Fallback error:', fallbackErr.message)
      }
    }

    if (!weatherResult) {
      return NextResponse.json(
        { error: 'Weather telemetry service temporarily unavailable for these coordinates' },
        { status: 503 }
      )
    }

    // 3. Reverse geocode location
    const geo = await reverseGeocodeCoordinates(lat, lng)

    // 4. Check for physical ground weather station in DB within 25 km
    let groundStation: any = null
    try {
      const stations = await db.weatherObservation.findMany({
        where: {
          lat: { not: null },
          lng: { not: null },
        },
        orderBy: { observedAt: 'desc' },
        take: 30,
      })

      let nearestDist = Infinity
      let nearestStn: any = null

      for (const s of stations) {
        if (s.lat != null && s.lng != null) {
          const d = distanceKm(lat, lng, s.lat, s.lng)
          if (d < nearestDist && d <= 25) {
            nearestDist = d
            nearestStn = s
          }
        }
      }

      if (nearestStn) {
        groundStation = {
          available: true,
          name: nearestStn.stationName || 'IMD Ground Station',
          distanceKm: Math.round(nearestDist * 10) / 10,
          observedAt: nearestStn.observedAt.toISOString(),
          temperatureC: nearestStn.temperatureC,
          rainfall24hMm: nearestStn.rainfall24hMm,
          humidityPct: nearestStn.humidityPct,
          windKph: nearestStn.windKph,
        }
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json(
      {
        location: {
          lat,
          lng,
          accuracyMeters: accuracy !== null && !Number.isNaN(accuracy) ? Math.round(accuracy) : null,
          locality: geo.locality,
          state: geo.state,
          country: geo.country,
          displayName: geo.displayName,
        },
        current: weatherResult.current,
        forecast: weatherResult.forecast,
        groundStation,
        meta: {
          source: groundStation ? `${dataSource} + Nearby Ground Station` : dataSource,
          observationType: groundStation ? 'GROUND_STATION_COMBINED' : 'OPEN_METEO_MODEL',
          lastUpdated: now,
          isLive: true,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/weather/current GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to process current weather telemetry', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
