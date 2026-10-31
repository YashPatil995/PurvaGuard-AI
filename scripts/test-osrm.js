async function testOsrm() {
  // From Guwahati (26.1445, 91.7362) to Dispur (26.1539, 91.7820)
  const origin = { lat: 26.1445, lng: 91.7362 };
  const dest = { lat: 26.1539, lng: 91.7820 };
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;

  console.log('Testing OSRM routing URL:', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      console.log('✓ OSRM responded with code:', data.code);
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        console.log(`✓ Distance: ${(route.distance / 1000).toFixed(2)} km`);
        console.log(`✓ Duration: ${(route.duration / 60).toFixed(1)} min`);
        console.log(`✓ Coordinates points count: ${route.geometry.coordinates.length}`);
      }
    } else {
      console.log('OSRM HTTP status:', res.status);
    }
  } catch (err) {
    console.error('OSRM fetch error:', err.message);
  }
}

testOsrm();
