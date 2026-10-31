const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function determineFacilityType(name, existingType, address) {
  const n = (name || '').toLowerCase();
  const a = (address || '').toLowerCase();

  // 1. Erroneous road / non-facility filter
  if (name === 'SH12' || name === 'MDR' || /^nh\s*\d+/i.test(name) || /^state highway/i.test(name)) {
    return 'DELETE';
  }

  // 2. Police
  if (n.includes('police') || n.includes('thana') || n.includes('outpost') || existingType === 'POLICE_STATION') {
    if (!n.includes('hospital') && !n.includes('clinic')) return 'POLICE_STATION';
  }

  // 3. Fire
  if (n.includes('fire') || existingType === 'FIRE_STATION') {
    return 'FIRE_STATION';
  }

  // 4. Shelter
  if (n.includes('shelter') || n.includes('ashray') || n.includes('refuge') || existingType === 'SHELTER') {
    return 'SHELTER';
  }

  // 5. Relief Center
  if (n.includes('relief') || n.includes('community centre') || n.includes('community center') || existingType === 'RELIEF_CENTER') {
    return 'RELIEF_CENTER';
  }

  // 6. Clinic / Dispensary / Diagnostic
  if (
    n.includes('clinic') ||
    n.includes('dispensary') ||
    n.includes('diagnostic') ||
    n.includes('homeo') ||
    n.includes('dental') ||
    n.includes('optical') ||
    n.includes('eye care') ||
    n.includes('health care') ||
    n.includes('health centre') ||
    n.includes('health center') ||
    n.includes('phc') ||
    n.includes('sub-centre') ||
    n.includes('doctor')
  ) {
    // If it's a major hospital with a clinic wing, e.g. "Hospital & Research Centre"
    if (n.includes('hospital') && !n.includes('clinic')) {
      return 'HOSPITAL';
    }
    return 'CLINIC';
  }

  // 7. Hospital
  if (n.includes('hospital') || n.includes('chikitsalaya') || n.includes('medical college') || n.includes('nursing home') || n.includes('blood bank')) {
    return 'HOSPITAL';
  }

  return existingType || 'CLINIC';
}

async function fixFacilities() {
  const all = await prisma.facility.findMany();
  console.log(`Processing ${all.length} facilities...`);

  for (const f of all) {
    const newType = determineFacilityType(f.name, f.facilityType, f.address);
    if (newType === 'DELETE') {
      console.log(`Deleting erroneous entry: ${f.name}`);
      await prisma.facility.delete({ where: { id: f.id } });
    } else if (newType !== f.facilityType) {
      console.log(`Updating [${f.facilityType} -> ${newType}]: ${f.name}`);
      await prisma.facility.update({
        where: { id: f.id },
        data: { facilityType: newType },
      });
    } else {
      console.log(`Retaining [${f.facilityType}]: ${f.name}`);
    }
  }

  console.log('Update complete.');
}

fixFacilities().finally(() => prisma.$disconnect());
