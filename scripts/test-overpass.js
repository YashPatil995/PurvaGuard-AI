const query = `
[out:json][timeout:12];
(
  node["amenity"="hospital"](around:20000, 26.1445, 91.7362);
  way["amenity"="hospital"](around:20000, 26.1445, 91.7362);
  node["amenity"="clinic"](around:20000, 26.1445, 91.7362);
  node["amenity"="shelter"](around:20000, 26.1445, 91.7362);
  node["amenity"="police"](around:20000, 26.1445, 91.7362);
);
out center 20;
`;

async function testOverpass() {
  console.log('Querying Overpass API for Guwahati / Assam emergency facilities...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PurvaGuard-AI/1.0 (disaster-response-safety-platform)',
    },
    body: 'data=' + encodeURIComponent(query),
  });

  if (!res.ok) {
    console.error('Overpass HTTP error:', res.status, res.statusText);
    return;
  }

  const data = await res.json();
  console.log('Overpass elements received:', data.elements ? data.elements.length : 0);
  if (data.elements && data.elements.length > 0) {
    data.elements.slice(0, 5).forEach((el, idx) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const tags = el.tags || {};
      console.log(`${idx + 1}. [${tags.amenity || 'facility'}] ${tags.name || tags['name:en'] || 'Unnamed'} (lat: ${lat}, lon: ${lon})`);
      if (tags['addr:full'] || tags['addr:street']) {
        console.log(`   Address: ${tags['addr:full'] || tags['addr:street']}`);
      }
      if (tags.phone || tags['contact:phone']) {
        console.log(`   Phone: ${tags.phone || tags['contact:phone']}`);
      }
    });
  }
}

testOverpass().catch(console.error);
