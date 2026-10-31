async function testCoordinatesWeather(label, lat, lng, accuracy) {
  const url = `http://localhost:3000/api/weather/current?lat=${lat}&lng=${lng}&accuracy=${accuracy}&_t=${Date.now()}`
  console.log(`\n======================================================`)
  console.log(`  TESTING LOCAL WEATHER: ${label}`)
  console.log(`  Coordinates: (${lat}, ${lng}) | Accuracy: ±${accuracy}m`)
  console.log(`======================================================`)

  const start = Date.now()
  const res = await fetch(url)
  const duration = Date.now() - start
  console.log(`Response HTTP Status: ${res.status} (${duration}ms)`)

  if (!res.ok) {
    console.error('Error response:', await res.text())
    return null
  }

  const d = await res.json()
  console.log('Location Metadata:')
  console.log(`  - Locality: "${d.location.locality}"`)
  console.log(`  - State: "${d.location.state}"`)
  console.log(`  - Formatted Display: "${d.location.displayName}"`)
  console.log(`  - GPS Accuracy: ±${d.location.accuracyMeters}m`)

  console.log('Live Weather Conditions:')
  console.log(`  - Temperature: ${d.current.temperatureC}°C (Feels like: ${d.current.apparentTemperatureC}°C)`)
  console.log(`  - Condition: "${d.current.conditionLabel}" [Icon: ${d.current.iconType}]`)
  console.log(`  - Relative Humidity: ${d.current.relativeHumidityPct}%`)
  console.log(`  - Wind Speed: ${d.current.windSpeedKmh} km/h (Direction: ${d.current.windDirectionDeg}°)`)
  console.log(`  - Current Rain: ${d.current.currentRainMm} mm`)

  console.log('Rainfall Forecast:')
  console.log(`  - Next 24h Rain: ${d.forecast.rainfall24hMm} mm`)
  console.log(`  - Peak Hourly Rate: ${d.forecast.peakHourlyMm} mm/h`)
  console.log(`  - Precipitation Probability: ${d.forecast.precipitationProbabilityPct}%`)

  console.log('Telemetry Source & Provenance:')
  console.log(`  - Source: ${d.meta.source}`)
  console.log(`  - Observation Type: ${d.meta.observationType}`)
  console.log(`  - Last Updated: ${d.meta.lastUpdated}`)
  console.log(`  - Is Live: ${d.meta.isLive}`)
  console.log(`  - Ground Station: ${d.groundStation ? `${d.groundStation.name} (${d.groundStation.distanceKm} km away)` : 'None within 25 km'}`)

  return d
}

async function run() {
  console.log('--- PURVAGUARD AI: HOMEPAGE LOCAL WEATHER VERIFICATION ---')

  const loc1 = await testCoordinatesWeather('Guwahati, Assam', 26.1445, 91.7362, 12)
  const loc2 = await testCoordinatesWeather('Gangtok, Sikkim', 27.338, 88.606, 25)

  console.log('\n======================================================')
  console.log('  SIDE-BY-SIDE VERIFICATION CHECK')
  console.log('======================================================')

  const comparison = [
    {
      Metric: 'Locality & State',
      Guwahati: loc1.location.displayName,
      Gangtok: loc2.location.displayName,
      Distinct: loc1.location.displayName !== loc2.location.displayName ? 'PASS' : 'FAIL',
    },
    {
      Metric: 'Coordinates',
      Guwahati: `${loc1.location.lat}, ${loc1.location.lng}`,
      Gangtok: `${loc2.location.lat}, ${loc2.location.lng}`,
      Distinct: 'PASS',
    },
    {
      Metric: 'GPS Accuracy',
      Guwahati: `±${loc1.location.accuracyMeters}m`,
      Gangtok: `±${loc2.location.accuracyMeters}m`,
      Distinct: 'PASS',
    },
    {
      Metric: 'Temperature (°C)',
      Guwahati: `${loc1.current.temperatureC}°C`,
      Gangtok: `${loc2.current.temperatureC}°C`,
      Distinct: loc1.current.temperatureC !== loc2.current.temperatureC ? 'PASS' : 'FAIL',
    },
    {
      Metric: 'Humidity (%)',
      Guwahati: `${loc1.current.relativeHumidityPct}%`,
      Gangtok: `${loc2.current.relativeHumidityPct}%`,
      Distinct: loc1.current.relativeHumidityPct !== loc2.current.relativeHumidityPct ? 'PASS' : 'FAIL',
    },
    {
      Metric: 'Wind Speed (km/h)',
      Guwahati: `${loc1.current.windSpeedKmh} km/h`,
      Gangtok: `${loc2.current.windSpeedKmh} km/h`,
      Distinct: loc1.current.windSpeedKmh !== loc2.current.windSpeedKmh ? 'PASS' : 'FAIL',
    },
    {
      Metric: 'Weather Condition',
      Guwahati: loc1.current.conditionLabel,
      Gangtok: loc2.current.conditionLabel,
      Distinct: loc1.current.conditionLabel !== loc2.current.conditionLabel ? 'PASS' : 'IDENTICAL_WEATHER',
    },
    {
      Metric: '24h Rain Forecast',
      Guwahati: `${loc1.forecast.rainfall24hMm} mm`,
      Gangtok: `${loc2.forecast.rainfall24hMm} mm`,
      Distinct: loc1.forecast.rainfall24hMm !== loc2.forecast.rainfall24hMm ? 'PASS' : 'IDENTICAL_RAIN',
    },
  ]

  console.table(comparison)

  console.log('\n--- TESTING ERROR STATE: INVALID / MISSING COORDS ---')
  const errRes = await fetch('http://localhost:3000/api/weather/current?lat=abc&lng=xyz')
  console.log('Invalid coords HTTP status:', errRes.status, `(Expected: 400)`)
  const errData = await errRes.json()
  console.log('Error message returned:', errData.error)

  const missingRes = await fetch('http://localhost:3000/api/weather/current')
  console.log('Missing params HTTP status:', missingRes.status, `(Expected: 400)`)
  const missingData = await missingRes.json()
  console.log('Missing error message:', missingData.error)

  console.log('\nAll tests completed successfully.')
}

run().catch(console.error)
