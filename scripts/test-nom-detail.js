async function testNom() {
  const url = 'https://nominatim.openstreetmap.org/search?q=hospital+near+Guwahati&format=json&addressdetails=1&limit=5';
  const res = await fetch(url, { headers: { 'User-Agent': 'PurvaGuard-AI/1.0' } });
  const data = await res.json();
  data.forEach((item, i) => {
    console.log(`${i + 1}. ${item.display_name} (type: ${item.type}, lat: ${item.lat}, lon: ${item.lon})`);
  });
}
testNom();
