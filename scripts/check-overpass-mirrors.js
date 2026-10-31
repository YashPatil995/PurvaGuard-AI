const query = `
[out:json][timeout:10];
(
  node["amenity"="hospital"](around:20000, 26.1445, 91.7362);
  node["amenity"="clinic"](around:20000, 26.1445, 91.7362);
);
out center 10;
`;

const mirrors = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

async function checkMirrors() {
  for (const url of mirrors) {
    console.log('Testing mirror:', url);
    try {
      const start = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PurvaGuard-AI/1.0',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const json = await res.json();
        console.log(`✓ ${url} responded in ${Date.now() - start}ms with ${json.elements?.length || 0} elements!`);
        return url;
      } else {
        console.log(`✗ ${url} returned status ${res.status}`);
      }
    } catch (e) {
      console.log(`✗ ${url} error: ${e.message}`);
    }
  }
}

checkMirrors().catch(console.error);
