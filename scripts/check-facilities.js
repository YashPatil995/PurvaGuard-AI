const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const facilities = await prisma.facility.findMany();
  console.log('Total facilities in DB:', facilities.length);
  for (const f of facilities) {
    console.log(`[${f.facilityType}] ${f.name} (${f.source})`);
  }
}

main().finally(() => prisma.$disconnect());
