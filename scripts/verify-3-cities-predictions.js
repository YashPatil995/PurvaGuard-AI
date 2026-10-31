require('dotenv').config()

const cities = [
  { name: 'Gangtok, Sikkim', lat: 27.338, lng: 88.606 },
  { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong, Meghalaya', lat: 25.5788, lng: 91.8933 }
]

async function run() {
  console.log('=== VERIFYING AI PREDICTION ENGINE FOR 3 NORTH-EAST CITIES ===\n')

  const results = []

  for (const city of cities) {
    const url = `http://localhost:3000/api/prediction?lat=${city.lat}&lng=${city.lng}&_t=${Date.now()}`
    console.log(`Fetching: ${city.name} (${city.lat}, ${city.lng})...`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`HTTP error ${res.status}: ${await res.text()}`)
      continue
    }
    const data = await res.json()
    results.push({ city, data })
  }

  console.log('\n================ DATA COMPARISON ACROSS CITIES ================')
  for (const { city, data } of results) {
    console.log(`\n--- [${data.currentLocation.name}] ---`)
    console.log(`Coordinates: (${data.currentLocation.lat}, ${data.currentLocation.lng}) | Elevation: ${data.currentLocation.elevationM}m MSL`)
    console.log('Live Predictions:')
    for (const p of data.predictions) {
      console.log(`  - ${p.hazardType}: Score=${p.riskScore}/100, Level=${p.riskLevel}, Status=${p.status}, ID=${p.id}`)
      if (p.topFeatures && p.topFeatures.length > 0) {
        console.log(`    Top Feature: ${p.topFeatures[0].feature} = ${p.topFeatures[0].value} (contrib: ${p.topFeatures[0].contribution}%)`)
      }
    }
    console.log('Live Input Features snapshot:')
    for (const f of data.inputFeatures) {
      console.log(`  * ${f.feature}: "${f.value}" [${f.tier}] (${f.source})`)
    }
    console.log(`Behavior Analysis:\n  "${data.disasterBehaviorAnalysis}"`)
  }

  // Cross-city uniqueness check
  console.log('\n================ INTEGRITY & UNIQUENESS AUDIT ================')
  const elevations = results.map(r => r.data.currentLocation.elevationM)
  const temperatures = results.map(r => r.data.inputFeatures.find(f => f.feature === 'Ambient temperature')?.value)
  const soils = results.map(r => r.data.inputFeatures.find(f => f.feature === 'Volumetric soil moisture')?.value)
  const quakes = results.map(r => r.data.inputFeatures.find(f => f.feature === 'Seismic telemetry proxy')?.value)
  const slopes = results.map(r => r.data.inputFeatures.find(f => f.feature === 'Geomorphic slope classification')?.value)
  const landCovers = results.map(r => r.data.inputFeatures.find(f => f.feature === 'Regional land cover')?.value)
  const predIds = results.flatMap(r => r.data.predictions.map(p => p.id))

  const uniqueElevs = new Set(elevations).size
  const uniqueTemps = new Set(temperatures).size
  const uniqueSoils = new Set(soils).size
  const uniqueQuakes = new Set(quakes).size
  const uniqueSlopes = new Set(slopes).size
  const uniqueLandCovers = new Set(landCovers).size
  const uniquePredIds = new Set(predIds).size

  console.log(`Cities tested: ${results.length}`)
  console.log(`Unique elevations: ${uniqueElevs} / 3 (${uniqueElevs === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Unique ambient temperatures: ${uniqueTemps} / 3 (${uniqueTemps === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Unique volumetric soil moistures: ${uniqueSoils} / 3 (${uniqueSoils === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Unique seismic telemetry: ${uniqueQuakes} / 3 (${uniqueQuakes === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Unique geomorphic slopes: ${uniqueSlopes} / 3 (${uniqueSlopes === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Unique regional land covers: ${uniqueLandCovers} / 3 (${uniqueLandCovers === 3 ? 'PASS' : 'FAIL'})`)
  console.log(`Total prediction IDs generated: ${predIds.length}, Unique IDs: ${uniquePredIds} (${uniquePredIds === predIds.length ? 'PASS - Zero ID collision' : 'FAIL'})`)

  // Check if any Gangtok data leaked to Guwahati or Shillong
  const gangtokData = JSON.stringify(results[0].data.inputFeatures)
  const guwahatiData = JSON.stringify(results[1].data.inputFeatures)
  const shillongData = JSON.stringify(results[2].data.inputFeatures)

  console.log(`Gangtok vs Guwahati identical: ${gangtokData === guwahatiData ? 'YES (BUG)' : 'NO (PASSED - Distinct)'}`)
  console.log(`Guwahati vs Shillong identical: ${guwahatiData === shillongData ? 'YES (BUG)' : 'NO (PASSED - Distinct)'}`)
  console.log(`Gangtok vs Shillong identical: ${gangtokData === shillongData ? 'YES (BUG)' : 'NO (PASSED - Distinct)'}`)
}

run().catch(console.error)
