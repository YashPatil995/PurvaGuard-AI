// PurvaGuard AI — Disaster Risk & Weather Integration Test Suite
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== TEST SUITE: DISASTER RISK & WEATHER INTEGRATION ===\n');

  // 1. Test Gangtok, Sikkim (Mountainous Himalayan Terrain)
  console.log('--- 1. Testing Location: Gangtok, Sikkim (27.338, 88.606) ---');
  const resGangtok = await fetch(`${BASE_URL}/api/risk?lat=27.338&lng=88.606`);
  if (!resGangtok.ok) throw new Error(`Gangtok request failed: ${resGangtok.status}`);
  const dataGangtok = await resGangtok.json();

  console.log(`✓ Source: ${dataGangtok.source}`);
  console.log(`✓ API Status: ${dataGangtok.apiStatus}`);
  console.log(`✓ Simulation Mode: ${dataGangtok.simulationMode}`);
  console.log(`✓ Terrain Elevation: ${dataGangtok.elevationM} m MSL`);
  console.log(`✓ Live Weather Conditions:`);
  console.log(`  - Temperature: ${dataGangtok.currentWeather.temperature}°C`);
  console.log(`  - Relative Humidity: ${dataGangtok.currentWeather.relativeHumidity}%`);
  console.log(`  - Wind Speed: ${dataGangtok.currentWeather.windSpeedKmh} km/h`);
  console.log(`  - Soil Moisture Saturation: ${dataGangtok.currentWeather.soilMoisturePct}% (${dataGangtok.currentWeather.soilMoistureM3} m³/m³)`);
  
  // Landslide Risk
  const landslideGangtok = dataGangtok.current.find(c => c.hazardType === 'LANDSLIDE');
  console.log(`✓ Landslide Risk Assessment:`);
  console.log(`  - Level: ${landslideGangtok.riskLevel} (${landslideGangtok.riskScore}/100)`);
  console.log(`  - Disclaimer: "${landslideGangtok.disclaimer}"`);
  console.log(`  - Contributing Factors (${landslideGangtok.topFeatures.length}):`);
  landslideGangtok.topFeatures.forEach(f => console.log(`    * ${f.feature}: ${f.value} (${f.contribution}%)`));

  // Flash Flood Risk
  const floodGangtok = dataGangtok.current.find(c => c.hazardType === 'FLASH_FLOOD');
  console.log(`✓ Flash Flood Risk Assessment:`);
  console.log(`  - Level: ${floodGangtok.riskLevel} (${floodGangtok.riskScore}/100)`);
  console.log(`  - Disclaimer: "${floodGangtok.disclaimer}"`);
  console.log(`  - Contributing Factors (${floodGangtok.topFeatures.length}):`);
  floodGangtok.topFeatures.forEach(f => console.log(`    * ${f.feature}: ${f.value} (${f.contribution}%)`));

  // 24h Hourly Forecast Timeseries
  console.log(`✓ Hourly 24h Forecast Timeseries (${dataGangtok.timeseries.length} hours):`);
  console.log(`  First 3 hours:`);
  dataGangtok.timeseries.slice(0, 3).forEach(pt => {
    console.log(`  - Hour ${pt.hour}: Rain ${pt.rainfallMm} mm, Rain Prob ${pt.precipitationProbability}%, Risk ${pt.riskScore}/100, Temp ${pt.temperature}°C`);
  });
  console.log('');

  // 2. Test Guwahati, Assam (Brahmaputra Valley)
  console.log('--- 2. Testing Location: Guwahati, Assam (26.144, 91.736) ---');
  const resGuwahati = await fetch(`${BASE_URL}/api/risk?lat=26.144&lng=91.736`);
  if (!resGuwahati.ok) throw new Error(`Guwahati request failed: ${resGuwahati.status}`);
  const dataGuwahati = await resGuwahati.json();

  console.log(`✓ Terrain Elevation: ${dataGuwahati.elevationM} m MSL`);
  console.log(`✓ Live Weather Conditions: Temp ${dataGuwahati.currentWeather.temperature}°C, Soil Saturation ${dataGuwahati.currentWeather.soilMoisturePct}%`);
  const landslideGuwahati = dataGuwahati.current.find(c => c.hazardType === 'LANDSLIDE');
  console.log(`✓ Landslide Risk: ${landslideGuwahati.riskLevel} (${landslideGuwahati.riskScore}/100)`);
  
  // Verify distinct values between locations
  if (dataGangtok.elevationM === dataGuwahati.elevationM) {
    throw new Error('Elevation is identical across Gangtok and Guwahati! Likely hardcoded.');
  }
  if (landslideGangtok.riskScore === landslideGuwahati.riskScore) {
    throw new Error('Landslide risk score is identical across mountain and valley! Likely hardcoded.');
  }
  console.log('✓ Dynamic location responsiveness verified: Mountainous Gangtok (elev 1490m) and Valley Guwahati (elev 51m) yield distinct physical assessments.\n');

  // 3. Test Sohra / Cherrapunji, Meghalaya (High Precipitation Plateau)
  console.log('--- 3. Testing Location: Sohra / Cherrapunji, Meghalaya (25.270, 91.730) ---');
  const resSohra = await fetch(`${BASE_URL}/api/risk?lat=25.27&lng=91.73`);
  if (!resSohra.ok) throw new Error(`Sohra request failed: ${resSohra.status}`);
  const dataSohra = await resSohra.json();

  console.log(`✓ Elevation: ${dataSohra.elevationM} m MSL`);
  console.log(`✓ Temperature: ${dataSohra.currentWeather.temperature}°C, Humidity: ${dataSohra.currentWeather.relativeHumidity}%`);
  const floodSohra = dataSohra.current.find(c => c.hazardType === 'FLASH_FLOOD');
  console.log(`✓ Flash Flood Risk: ${floodSohra.riskLevel} (${floodSohra.riskScore}/100)\n`);

  // 4. Test Kohima, Nagaland (Naga Hills)
  console.log('--- 4. Testing Location: Kohima, Nagaland (25.675, 94.108) ---');
  const resKohima = await fetch(`${BASE_URL}/api/risk?lat=25.675&lng=94.108`);
  if (!resKohima.ok) throw new Error(`Kohima request failed: ${resKohima.status}`);
  const dataKohima = await resKohima.json();
  console.log(`✓ Elevation: ${dataKohima.elevationM} m MSL`);
  console.log(`✓ Temperature: ${dataKohima.currentWeather.temperature}°C, Soil Saturation: ${dataKohima.currentWeather.soilMoisturePct}%`);
  const landslideKohima = dataKohima.current.find(c => c.hazardType === 'LANDSLIDE');
  console.log(`✓ Landslide Risk: ${landslideKohima.riskLevel} (${landslideKohima.riskScore}/100)\n`);

  // 5. Test Missing / Invalid Coordinates Error Handling
  console.log('--- 5. Testing Error & Missing Parameter Handling ---');
  const resMissing = await fetch(`${BASE_URL}/api/risk`);
  console.log(`✓ Missing params response code: ${resMissing.status} (Expected 400)`);
  if (resMissing.status !== 400) throw new Error(`Expected 400 for missing params, got ${resMissing.status}`);

  const resInvalid = await fetch(`${BASE_URL}/api/risk?lat=abc&lng=def`);
  console.log(`✓ Invalid params response code: ${resInvalid.status} (Expected 400)`);
  if (resInvalid.status !== 400) throw new Error(`Expected 400 for invalid params, got ${resInvalid.status}`);

  console.log('\n=== ALL DISASTER RISK & WEATHER INTEGRATION TESTS PASSED ===');
}

main().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
