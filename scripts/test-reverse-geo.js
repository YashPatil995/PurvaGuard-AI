async function testGeocode() {
  const lat = 26.1445, lng = 91.7362 // Guwahati
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
    console.log('BigDataCloud status:', res.status)
    const data = await res.json()
    console.log('BigDataCloud result:', {
      locality: data.locality || data.city,
      principalSubdivision: data.principalSubdivision,
      countryName: data.countryName
    })
  } catch (e) {
    console.error('BigDataCloud err:', e.message)
  }

  try {
    const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { 'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)' }
    })
    console.log('Nominatim status:', res2.status)
    const data2 = await res2.json()
    console.log('Nominatim address:', data2.address)
  } catch (e) {
    console.error('Nominatim err:', e.message)
  }
}

testGeocode()
