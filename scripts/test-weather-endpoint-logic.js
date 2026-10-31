require('dotenv').config()

async function testWeatherEndpointLogic(lat, lng, accuracy = 15) {
  console.log(`Testing coordinates: lat=${lat}, lng=${lng}`)

  // 1. Fetch Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation,precipitation_probability,rain,showers,temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2&timezone=auto`
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  const d = await res.json()
  const cur = d.current || {}
  const hourly = d.hourly || {}

  // 24h rain forecast
  const next24Precip = (hourly.precipitation || []).slice(0, 24)
  const next24RainMm = Math.round(next24Precip.reduce((acc, v) => acc + (v || 0), 0) * 10) / 10
  const peakHourlyMm = Math.round(Math.max(0, ...next24Precip.map(v => v || 0)) * 10) / 10

  // 2. Reverse geocode
  let locality = 'Current Location'
  let state = ''
  try {
    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: AbortSignal.timeout(3500) })
    if (geoRes.ok) {
      const geoData = await geoRes.json()
      locality = geoData.locality || geoData.city || geoData.principalSubdivision || 'Current Location'
      state = geoData.principalSubdivision || ''
    }
  } catch (e) {
    console.warn('Geocode fallback:', e.message)
  }

  console.log('Result:', {
    location: `${locality}${state ? `, ${state}` : ''} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    accuracy: `±${Math.round(accuracy)}m`,
    temp: `${cur.temperature_2m}°C`,
    humidity: `${cur.relative_humidity_2m}%`,
    wind: `${cur.wind_speed_10m} km/h`,
    currentRain: `${cur.precipitation} mm`,
    forecast24hRain: `${next24RainMm} mm`,
    peakHourly: `${peakHourlyMm} mm/h`,
    weatherCode: cur.weather_code,
  })
}

async function run() {
  console.log('=== TEST 1: Guwahati Coordinates ===')
  await testWeatherEndpointLogic(26.1445, 91.7362, 12)
  console.log('\n=== TEST 2: Gangtok Coordinates ===')
  await testWeatherEndpointLogic(27.338, 88.606, 25)
}

run()
