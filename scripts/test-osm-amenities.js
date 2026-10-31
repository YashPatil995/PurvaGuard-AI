async function testOsmAmenities(lat, lng) {
  const categories = ['hospital', 'clinic', 'police', 'fire station', 'shelter'];
  console.log(`Searching OSM amenities around ${lat}, ${lng}...`);

  for (const cat of categories) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cat)}&format=json&addressdetails=1&extratags=1&viewbox=${lng - 0.25},${lat + 0.25},${lng + 0.25},${lat - 0.25}&bounded=1&limit=6`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PurvaGuard-Disaster-Platform/1.0 (contact@purvaguard.in)' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const items = await res.json();
        console.log(`[${cat.toUpperCase()}] Found ${items.length} real facilities:`);
        items.slice(0, 2).forEach(it => {
          console.log(`  - ${it.name || it.display_name.split(',')[0]} (lat: ${it.lat}, lon: ${it.lon})`);
        });
      } else {
        console.log(`[${cat.toUpperCase()}] HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`[${cat.toUpperCase()}] Error: ${e.message}`);
    }
  }
}

testOsmAmenities(26.1445, 91.7362);
