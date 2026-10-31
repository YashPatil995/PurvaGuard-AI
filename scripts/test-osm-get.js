async function testGet() {
  const q = encodeURIComponent(`[out:json][timeout:15];node["amenity"="hospital"](26.1,91.7,26.2,91.8);out 5;`);
  const urls = [
    `https://overpass-api.de/api/interpreter?data=${q}`,
    `https://nominatim.openstreetmap.org/search?q=hospital+near+Guwahati&format=json&limit=5`,
  ];
  for (const u of urls) {
    try {
      console.log('Testing GET:', u.slice(0, 60));
      const res = await fetch(u, {
        headers: { 'User-Agent': 'PurvaGuard-AI/1.0 (contact@purvaguard.in)' },
        signal: AbortSignal.timeout(10000)
      });
      console.log('Status:', res.status);
      if (res.ok) {
        const d = await res.json();
        console.log('Results length:', Array.isArray(d) ? d.length : d.elements?.length);
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}
testGet();
