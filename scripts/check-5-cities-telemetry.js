require('dotenv').config()

const cities = [
  { name: 'Gangtok, Sikkim', lat: 27.338, lng: 88.606 },
  { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong, Meghalaya', lat: 25.5788, lng: 91.8933 },
  { name: 'Itanagar, Arunachal', lat: 27.0844, lng: 93.6053 },
  { name: 'Ziro, Arunachal', lat: 27.595, lng: 93.832 },
]

async function inspectCities() {
  for (const c of cities) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m&hourly=precipitation,precipitation_probability,rain,showers,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,temperature_2m,wind_speed_10m&past_days=1&forecast_days=2&timezone=auto`
    const res = await fetch(url)
    const d = await res.json()
    const cur = d.current || {}
    const hourly = d.hourly || {}
    const elev = d.elevation
    const s1 = hourly.soil_moisture_0_to_1cm?.[24]
    const s2 = hourly.soil_moisture_3_to_9cm?.[24]
    const totalRain24 = hourly.precipitation ? hourly.precipitation.slice(24, 48).reduce((a, b) => a + (b || 0), 0) : null
    const peakProb = hourly.precipitation_probability ? Math.max(...hourly.precipitation_probability.slice(24, 48)) : null
    const peakHourly = hourly.precipitation ? Math.max(...hourly.precipitation.slice(24, 48)) : null

    console.log(`=== ${c.name} ===`)
    console.log(`  Elevation: ${elev}m`)
    console.log(`  Current Temp: ${cur.temperature_2m}°C, Humidity: ${cur.relative_humidity_2m}%`)
    console.log(`  Soil 0-1cm: ${s1}, 3-9cm: ${s2}`)
    console.log(`  24h Forecast Rain: ${totalRain24?.toFixed(1)} mm, Peak Hourly: ${peakHourly?.toFixed(1)} mm/h, Peak Prob: ${peakProb}%`)
    console.log(`  Hourly Precipitation Array Length: ${hourly.precipitation?.length}`)
    console.log(`  Hourly Soil Array Length: ${hourly.soil_moisture_0_to_1cm?.length}`)
  }
}

inspectCities().catch(console.error)
