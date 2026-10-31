async function testWttrCoords() {
  const lat = 26.1445, lng = 91.7362
  const res = await fetch(`https://wttr.in/${lat},${lng}?format=j1`, {
    headers: { 'User-Agent': 'PurvaGuard-AI/1.0' }
  })
  console.log('Status:', res.status)
  const d = await res.json()
  const cur = d.current_condition?.[0]
  console.log('Current:', {
    tempC: cur?.temp_C,
    feelsLikeC: cur?.FeelsLikeC,
    humidity: cur?.humidity,
    windKph: cur?.windspeedKmph,
    precipMM: cur?.precipMM,
    desc: cur?.weatherDesc?.[0]?.value,
    weatherCode: cur?.weatherCode,
  })
  const today = d.weather?.[0]
  console.log('Today:', {
    maxtempC: today?.maxtempC,
    mintempC: today?.mintempC,
    totalSnow_cm: today?.totalSnow_cm,
    hourlyCount: today?.hourly?.length,
    sampleHour: today?.hourly?.[0]
  })
}
testWttrCoords()
