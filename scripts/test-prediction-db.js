require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPersistence() {
  console.log('Testing RiskPrediction query & creation...');
  const count = await prisma.riskPrediction.count();
  console.log(`Current RiskPrediction count: ${count}`);

  const testRec = await prisma.riskPrediction.create({
    data: {
      lat: 27.338,
      lng: 88.606,
      hazardType: 'LANDSLIDE',
      horizonMinutes: 1440,
      riskLevel: 'HIGH',
      riskScore: 57.0,
      confidence: 0.88,
      dataCoveragePct: 96.0,
      topFeatures: JSON.stringify([
        { feature: 'Cumulative 24h Rain', value: '8.9 mm', contribution: 9 },
        { feature: 'Soil Moisture Saturation', value: '88%', contribution: 46 },
      ]),
      inputSnapshot: JSON.stringify({
        temperature: 14.4,
        humidity: 88,
        rainfall24h: 8.9,
        elevationM: 1490,
        source: 'Open-Meteo NWP',
      }),
      modelVersion: 'Open-Meteo Physical (v1)',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      simulationMode: false,
    },
  });

  console.log(`✓ Successfully saved prediction: ${testRec.id}`);
  
  // Clean up test record
  await prisma.riskPrediction.delete({ where: { id: testRec.id } });
  console.log('✓ Cleaned up test record.');
}

testPersistence().finally(() => prisma.$disconnect());
