async function testUrls() {
  const urls = [
    'https://api.open-meteo.com/v1/forecast?latitude=26.1445&longitude=91.7362&current=temperature_2m',
    'https://api.open-meteo.com/v1/dwd-icon?latitude=26.1445&longitude=91.7362&current=temperature_2m',
    'https://api.open-meteo.com/v1/ecmwf?latitude=26.1445&longitude=91.7362&current=temperature_2m',
    'https://api.open-meteo.com/v1/gfs?latitude=26.1445&longitude=91.7362&current=temperature_2m',
    'https://wttr.in/Guwahati?format=j1',
    'https://geocoding-api.open-meteo.com/v1/search?name=Guwahati'
  ]

  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) })
      console.log(u.slice(0, 50), '->', res.status)
      if (res.status === 200) {
        const text = await res.text()
        console.log('   Sample:', text.slice(0, 100))
      }
    } catch (e) {
      console.log(u.slice(0, 50), '-> ERR:', e.message)
    }
  }
}
testUrls()
