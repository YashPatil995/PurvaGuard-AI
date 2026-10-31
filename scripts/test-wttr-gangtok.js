async function testGangtok() {
  const res = await fetch(`https://wttr.in/27.338,88.606?format=j1`, {
    headers: { 'User-Agent': 'PurvaGuard-AI/1.0' }
  })
  const d = await res.json()
  const cur = d.current_condition?.[0]
  console.log('Gangtok Weather:', {
    tempC: cur?.temp_C,
    feelsLikeC: cur?.FeelsLikeC,
    humidity: cur?.humidity,
    windKph: cur?.windspeedKmph,
    precipMM: cur?.precipMM,
    desc: cur?.weatherDesc?.[0]?.value,
  })
}
testGangtok()
