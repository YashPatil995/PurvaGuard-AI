const capitals = [
  { name: 'Gangtok, Sikkim', lat: 27.338, lng: 88.606 },
  { name: 'Guwahati, Assam', lat: 26.144, lng: 91.736 },
  { name: 'Shillong, Meghalaya', lat: 25.578, lng: 91.893 },
  { name: 'Itanagar, Arunachal Pradesh', lat: 27.084, lng: 93.605 },
  { name: 'Kohima, Nagaland', lat: 25.675, lng: 94.108 },
  { name: 'Aizawl, Mizoram', lat: 23.727, lng: 92.718 },
  { name: 'Agartala, Tripura', lat: 23.831, lng: 91.286 },
  { name: 'Imphal, Manipur', lat: 24.817, lng: 93.936 }
];

async function check() {
  console.log('Testing Open-Meteo across all 8 North-Eastern states...');
  for (const c of capitals) {
    const t0 = Date.now();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m&hourly=precipitation,precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm&past_days=1&forecast_days=2&timezone=auto`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'PurvaGuard-AI/1.0' } });
      const data = await res.json();
      const elapsed = Date.now() - t0;
      console.log(`✓ ${c.name.padEnd(30)}: HTTP ${res.status} (${elapsed}ms) | Temp: ${data.current?.temperature_2m}°C | Elev: ${data.elevation}m | Soil: ${data.hourly?.soil_moisture_0_to_1cm?.[0]}`);
    } catch (err) {
      console.error(`✗ ${c.name}: ${err.message}`);
    }
  }
}

check();
