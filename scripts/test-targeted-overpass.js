const query = `[out:json][timeout:8];(node["amenity"~"hospital|clinic|shelter|police|fire_station"](around:15000,26.1445,91.7362););out 15;`;

async function testTargeted() {
  const url = 'https://overpass.kumi.systems/api/interpreter';
  console.log('Sending targeted query to', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PurvaGuard-AI/1.0',
      },
      signal: AbortSignal.timeout(6000),
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Elements:', data.elements.length);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testTargeted();
