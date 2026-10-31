require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const predictions = await prisma.riskPrediction.findMany({
    include: { region: true },
    orderBy: { generatedAt: 'desc' },
  });
  console.log(`Total RiskPrediction records in DB: ${predictions.length}`);
  for (const p of predictions.slice(0, 15)) {
    console.log(`- [${p.hazardType}] ${p.modelVersion} | Risk: ${p.riskScore} (${p.riskLevel}) | Region: ${p.region?.canonicalName || 'N/A'} (${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}) | Generated: ${p.generatedAt.toISOString()}`);
  }
}

main().finally(() => prisma.$disconnect());
