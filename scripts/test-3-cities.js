async function test3() {
  const cities = [
    { name: 'Gangtok, Sikkim', lat: 27.338, lng: 88.606 },
    { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
    { name: 'Shillong, Meghalaya', lat: 25.5788, lng: 91.8933 },
  ];
  for (const c of cities) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m&hourly=precipitation,precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,temperature_2m,wind_speed_10m&past_days=1&forecast_days=2&timezone=auto`;
    const res = await fetch(url, { headers: { 'User-Agent': 'PurvaGuard-AI/1.0' } });
    const d = await res.json();
    console.log(`=== ${c.name} (${c.lat}, ${c.lng}) ===`);
    console.log(`Elevation: ${d.elevation} m MSL`);
    console.log(`Current Temp: ${d.current?.temperature_2m}°C, Humidity: ${d.current?.relative_humidity_2m}%, Wind: ${d.current?.wind_speed_10m} km/h`);
    console.log(`Soil moisture (0-1cm): ${d.hourly?.soil_moisture_0_to_1cm?.[24]}, (3-9cm): ${d.hourly?.soil_moisture_3_to_9cm?.[24]}`);
    const precipNext24 = d.hourly?.precipitation?.slice(24, 48) || [];
    const sumNext24 = precipNext24.reduce((a, b) => a + (b || 0), 0);
    console.log(`Next 24h Rain sum: ${sumNext24.toFixed(1)} mm\n`);
  }
}
test3();
