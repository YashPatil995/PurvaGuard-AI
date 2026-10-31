async function testOpenMeteo() {
  const lat = 26.1445, lng = 91.7362
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation,precipitation_probability,rain,showers,temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=2&timezone=auto`
  const res = await fetch(url)
  const d = await res.json()
  console.log('Current:', d.current)
  const next24 = d.hourly.precipitation.slice(0, 24)
  const sum24 = next24.reduce((a, b) => a + (b || 0), 0)
  console.log('Next 24h Rain Sum:', sum24.toFixed(1), 'mm')
}
testOpenMeteo()
