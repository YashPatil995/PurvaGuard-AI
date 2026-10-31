require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const testCities = [
  { name: 'Gangtok, Sikkim', lat: 27.338, lng: 88.606 },
  { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong, Meghalaya', lat: 25.5788, lng: 91.8933 },
  { name: 'Itanagar, Arunachal Pradesh', lat: 27.084, lng: 93.605 },
  { name: 'Ziro, Arunachal Pradesh', lat: 27.545, lng: 93.837 },
]

async function main() {
  console.log('=================================================================')
  console.log('   AI PREDICTION ENGINE: CONFIDENCE & COVERAGE AUDIT SUITE       ')
  console.log('=================================================================\n')

  const cityResponses = []

  for (const city of testCities) {
    const url = `http://localhost:3000/api/prediction?lat=${city.lat}&lng=${city.lng}&_t=${Date.now()}`
    console.log(`[API REQUEST] Fetching ${city.name} (${city.lat}, ${city.lng})...`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`Error: HTTP ${res.status}: ${await res.text()}`)
      continue
    }
    const data = await res.json()
    cityResponses.push({ city, data })
  }

  console.log('\n--- CITY-BY-CITY CONFIDENCE & COVERAGE COMPARISON ---')
  const comparisonRows = []

  for (const { city, data } of cityResponses) {
    const elev = data.currentLocation.elevationM
    const preds = data.predictions
    const landslide = preds.find(p => p.hazardType === 'LANDSLIDE')
    const flood = preds.find(p => p.hazardType === 'FLASH_FLOOD')
    const rain = preds.find(p => p.hazardType === 'HEAVY_RAIN')

    comparisonRows.push({
      city: city.name,
      elev: `${elev}m`,
      landslideConf: landslide?.confidence !== null ? `${Math.round(landslide.confidence * 100)}%` : 'N/A',
      landslideCov: landslide?.dataCoveragePct !== null ? `${Math.round(landslide.dataCoveragePct)}%` : 'N/A',
      floodConf: flood?.confidence !== null ? `${Math.round(flood.confidence * 100)}%` : 'N/A',
      floodCov: flood?.dataCoveragePct !== null ? `${Math.round(flood.dataCoveragePct)}%` : 'N/A',
      rainConf: rain?.confidence !== null ? `${Math.round(rain.confidence * 100)}%` : 'N/A',
      rainCov: rain?.dataCoveragePct !== null ? `${Math.round(rain.dataCoveragePct)}%` : 'N/A',
      landslideScore: landslide?.riskScore,
      floodScore: flood?.riskScore,
      rainScore: rain?.riskScore,
      landslideId: landslide?.id,
    })
  }

  console.table(comparisonRows.map(r => ({
    'City': r.city,
    'Elev': r.elev,
    'LS Conf': r.landslideConf,
    'LS Cov': r.landslideCov,
    'FF Conf': r.floodConf,
    'FF Cov': r.floodCov,
    'HR Conf': r.rainConf,
    'HR Cov': r.rainCov,
  })))

  // 1. Audit Itanagar vs Ziro specifically (the user's reported problem)
  console.log('\n--- AUDITING ITANAGAR VS ZIRO METRIC DIFFERENTIATION ---')
  const itanagar = comparisonRows.find(r => r.city.includes('Itanagar'))
  const ziro = comparisonRows.find(r => r.city.includes('Ziro'))

  console.log(`Itanagar (Elev: ${itanagar.elev}):`)
  console.log(`  - Landslide: Confidence=${itanagar.landslideConf}, Coverage=${itanagar.landslideCov}`)
  console.log(`  - Flash Flood: Confidence=${itanagar.floodConf}, Coverage=${itanagar.floodCov}`)
  console.log(`  - Heavy Rain: Confidence=${itanagar.rainConf}, Coverage=${itanagar.rainCov}`)

  console.log(`Ziro (Elev: ${ziro.elev}):`)
  console.log(`  - Landslide: Confidence=${ziro.landslideConf}, Coverage=${ziro.landslideCov}`)
  console.log(`  - Flash Flood: Confidence=${ziro.floodConf}, Coverage=${ziro.floodCov}`)
  console.log(`  - Heavy Rain: Confidence=${ziro.rainConf}, Coverage=${ziro.rainCov}`)

  const isIdentical = (
    itanagar.landslideConf === ziro.landslideConf &&
    itanagar.floodConf === ziro.floodConf &&
    itanagar.rainConf === ziro.rainConf
  )
  console.log(`Are Itanagar and Ziro metrics still identical? ${isIdentical ? 'FAIL (STILL IDENTICAL)' : 'PASS (DIFFERENTIATED)'}`)

  const areHardcoded = (
    itanagar.landslideConf === '88%' &&
    itanagar.floodConf === '90%' &&
    itanagar.rainConf === '92%'
  )
  console.log(`Are Itanagar metrics using old hardcoded 88%/90%/92%? ${areHardcoded ? 'FAIL (HARDCODED)' : 'PASS (DYNAMICALLY CALCULATED)'}`)

  // 2. Database verification in Supabase PostgreSQL
  console.log('\n--- VERIFYING PERSISTENCE IN SUPABASE (RiskPrediction TABLE) ---')
  const dbRecords = await prisma.riskPrediction.findMany({
    where: {
      modelVersion: 'purvaguard-physical-v2',
    },
    orderBy: { generatedAt: 'desc' },
    take: 15,
  })

  console.log(`Found ${dbRecords.length} records in Supabase with modelVersion 'purvaguard-physical-v2':`)
  for (const rec of dbRecords) {
    console.log(`  - [ID: ${rec.id}] Hazard: ${rec.hazardType}, Lat: ${rec.lat}, Lng: ${rec.lng}, Score: ${rec.riskScore}, Confidence: ${rec.confidence} (${Math.round((rec.confidence || 0) * 100)}%), Coverage: ${rec.dataCoveragePct}%, GeneratedAt: ${rec.generatedAt.toISOString()}`)
  }

  // 3. Test unavailable coordinates fallback
  console.log('\n--- TESTING UNAVAILABLE / OUT-OF-BOUNDS TELEMETRY FALLBACK ---')
  const outRes = await fetch('http://localhost:3000/api/prediction?lat=0.0&lng=0.0&_t=' + Date.now())
  const outData = await outRes.json()
  console.log(`Querying Null Island (0.0, 0.0):`)
  for (const p of outData.predictions) {
    console.log(`  - Hazard: ${p.hazardType}, Status: ${p.status}, Conf: ${p.confidence}, Cov: ${p.dataCoveragePct}%, Note: "${p.note || 'None'}"`)
  }

  console.log('\nAudit complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
