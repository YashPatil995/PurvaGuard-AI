// PurvaGuard AI — AI Prediction Audit & Integration Test Suite
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== TEST SUITE: AI PREDICTION PAGE AUDIT & VERIFICATION ===\n');

  // 1. Test Gangtok Prediction Endpoint
  console.log('--- 1. Testing Location: Gangtok, Sikkim (27.338, 88.606) ---');
  const resGangtok = await fetch(`${BASE_URL}/api/prediction?lat=27.338&lng=88.606`);
  if (!resGangtok.ok) throw new Error(`Gangtok request failed: ${resGangtok.status}`);
  const dataGangtok = await resGangtok.json();

  console.log(`✓ Location Name: "${dataGangtok.currentLocation.name}"`);
  console.log(`  Coordinates: (${dataGangtok.currentLocation.lat.toFixed(3)}, ${dataGangtok.currentLocation.lng.toFixed(3)})`);
  console.log(`  Elevation: ${dataGangtok.currentLocation.elevationM} m MSL`);
  
  // Verify no duplicate coordinates in name
  if (dataGangtok.currentLocation.name.includes('27.338') && dataGangtok.currentLocation.name.includes('88.606')) {
    throw new Error('Duplicate coordinates found in location name!');
  }
  console.log('✓ Verified: No duplicate coordinates in location header.');

  // Verify Prediction Cards
  console.log(`\n✓ Active Predictions Count: ${dataGangtok.predictions.length}`);
  for (const p of dataGangtok.predictions) {
    console.log(`  - [${p.hazardType}] Status: ${p.status} | Level: ${p.riskLevel} | Score: ${p.riskScore !== null ? `${p.riskScore}/100` : 'N/A (Insufficient)'}`);
    if (p.status === 'INSUFFICIENT_DATA') {
      if (p.riskScore !== null) throw new Error(`Violated: INSUFFICIENT_DATA has a non-null riskScore: ${p.riskScore}`);
      console.log(`    * Correctly flagged as Insufficient Data without fabricated score.`);
    } else {
      if (typeof p.riskScore !== 'number') throw new Error(`Active prediction missing valid numeric riskScore`);
      console.log(`    * Valid prediction ID: ${p.id} (Coverage: ${p.dataCoveragePct}%, Confidence: ${p.confidence})`);
      console.log(`    * Top Factors: ${p.topFeatures.map(f => `${f.feature} (${f.value})`).join(', ')}`);
    }
  }

  // 2. Verify Live Input Features & Provenance
  console.log('\n--- 2. Auditing Live Input Features & Data Tiers ---');
  console.log(`Total input features returned: ${dataGangtok.inputFeatures.length}`);
  for (const f of dataGangtok.inputFeatures) {
    console.log(`  - ${f.feature.padEnd(32)}: ${f.value.padEnd(35)} [${f.tier}] (${f.source})`);
    
    // Check against forbidden hardcoded values
    if (f.value.includes('76 mm') || f.value.includes('recent M4+')) {
      throw new Error(`Violated: Hardcoded demo value detected in feature "${f.feature}": ${f.value}`);
    }
  }
  console.log('✓ Verified: Hardcoded "76 mm" and "M4+" readings are completely eliminated.');

  // 3. Verify Model Info & Regional Coverage
  console.log('\n--- 3. Auditing Model Info & Regional Coverage Wording ---');
  console.log(`✓ Supported Hazards: ${dataGangtok.modelInfo.supportedHazards.join(', ')}`);
  console.log(`✓ Supported Regions: "${dataGangtok.modelInfo.supportedRegions}"`);
  if (dataGangtok.modelInfo.supportedRegions !== 'North-Eastern India — 8 states, including Sikkim') {
    throw new Error(`Violated: Incorrect regional wording "${dataGangtok.modelInfo.supportedRegions}". Expected "North-Eastern India — 8 states, including Sikkim"`);
  }
  console.log('✓ Verified: Exact regional coverage wording confirmed.');

  // Verify Model Metrics Disclaimers
  console.log(`✓ Model Metrics Target Status: ${dataGangtok.modelInfo.evaluationStatus}`);
  console.log(`  Metrics Disclaimer: "${dataGangtok.modelInfo.metrics.disclaimer}"`);
  if (!dataGangtok.modelInfo.metrics.disclaimer.includes('Synthetic demonstration benchmark')) {
    throw new Error('Violated: Model metrics are not clearly labeled as synthetic demonstration benchmark.');
  }
  console.log('✓ Verified: Target metrics are transparently labeled as synthetic demonstration targets.');

  // 4. Verify Behavior Analysis Truthfulness
  console.log('\n--- 4. Auditing Behavior Analysis Truthfulness ---');
  console.log(`Gangtok Analysis: "${dataGangtok.disasterBehaviorAnalysis}"\n`);
  
  // Test Guwahati (Low Risk)
  const resGuwahati = await fetch(`${BASE_URL}/api/prediction?lat=26.144&lng=91.736`);
  const dataGuwahati = await resGuwahati.json();
  console.log(`Guwahati Analysis: "${dataGuwahati.disasterBehaviorAnalysis}"`);
  if (dataGuwahati.disasterBehaviorAnalysis.toLowerCase().includes('moderate hazard probability')) {
    throw new Error('Violated: Low-risk Guwahati claimed "moderate hazard probability"!');
  }
  console.log('✓ Verified: Low-risk locations truthfully state low baseline risk without false moderate claims.');

  // 5. Verify Database Persistence in Supabase
  console.log('\n--- 5. Verifying Database Persistence in Supabase PostgreSQL ---');
  const dbPredictions = await prisma.riskPrediction.findMany({
    where: {
      modelVersion: 'purvaguard-physical-v1',
    },
    orderBy: { generatedAt: 'desc' },
    take: 5,
  });

  console.log(`✓ Found ${dbPredictions.length} physical predictions stored in Supabase RiskPrediction table.`);
  if (dbPredictions.length === 0) {
    throw new Error('No physical predictions persisted in Supabase!');
  }
  const sampleDb = dbPredictions[0];
  console.log(`  Sample DB Record:`);
  console.log(`  - ID: ${sampleDb.id}`);
  console.log(`  - Hazard: ${sampleDb.hazardType} (${sampleDb.riskLevel}, Score: ${sampleDb.riskScore})`);
  console.log(`  - Coordinates: (${sampleDb.lat.toFixed(3)}, ${sampleDb.lng.toFixed(3)})`);
  console.log(`  - Model Version: ${sampleDb.modelVersion}`);
  console.log(`  - Simulation Mode: ${sampleDb.simulationMode}`);
  
  const parsedSnapshot = JSON.parse(sampleDb.inputSnapshot || '{}');
  console.log(`  - Input Snapshot Telemetry: Temp ${parsedSnapshot.temperature}°C, Rain ${parsedSnapshot.rainfall24h}mm, Source: ${parsedSnapshot.source}`);
  if (!parsedSnapshot.source || !parsedSnapshot.source.includes('Open-Meteo')) {
    throw new Error('Input snapshot missing real Open-Meteo telemetry source!');
  }
  console.log('✓ Verified: Prediction outputs and input snapshots are genuinely persisted in Supabase PostgreSQL.');

  // 6. Verify Error States
  console.log('\n--- 6. Testing Error & Edge-Case States ---');
  const resNoParams = await fetch(`${BASE_URL}/api/prediction`);
  console.log(`✓ Missing params response code: ${resNoParams.status} (Expected 400)`);
  if (resNoParams.status !== 400) throw new Error('Expected 400 for missing params');

  const resInvalid = await fetch(`${BASE_URL}/api/prediction?lat=bad&lng=bad`);
  console.log(`✓ Invalid params response code: ${resInvalid.status} (Expected 400)`);
  if (resInvalid.status !== 400) throw new Error('Expected 400 for invalid params');

  console.log('\n=== ALL PREDICTION AUDIT TESTS PASSED SUCCESSFULLY ===');
}

main()
  .catch(err => {
    console.error('Audit Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
