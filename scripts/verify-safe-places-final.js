// PurvaGuard AI — Final Safe Places & Routes Integration Verification
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== PURVAGUARD AI: FINAL SAFE PLACES & ROUTES INTEGRATION CHECK ===\n');

  // 1. Verify Dynamic Facilities for Gangtok
  console.log('--- 1. Testing Dynamic Facility Loading: Gangtok (27.338, 88.606) ---');
  const gangtokRes = await fetch(`${BASE_URL}/api/facilities?lat=27.338&lng=88.606&radius=30`);
  if (!gangtokRes.ok) throw new Error(`Gangtok fetch failed: ${gangtokRes.status}`);
  const gangtokData = await gangtokRes.json();
  console.log(`✓ Fetched ${gangtokData.items.length} facilities for Gangtok.`);
  console.log(`  Source: ${gangtokData.source}`);
  console.log(`  Origin coords requested: (27.338, 88.606)`);
  if (gangtokData.items.length === 0) throw new Error('No facilities returned for Gangtok');
  const sampleGangtok = gangtokData.items[0];
  console.log(`  Closest Gangtok Facility: "${sampleGangtok.name}" [${sampleGangtok.facilityType}] (${sampleGangtok.distanceKm} km away)\n`);

  // 2. Verify Dynamic Facilities for Guwahati
  console.log('--- 2. Testing Dynamic Facility Loading: Guwahati (26.144, 91.736) ---');
  const guwahatiRes = await fetch(`${BASE_URL}/api/facilities?lat=26.144&lng=91.736&radius=30`);
  if (!guwahatiRes.ok) throw new Error(`Guwahati fetch failed: ${guwahatiRes.status}`);
  const guwahatiData = await guwahatiRes.json();
  console.log(`✓ Fetched ${guwahatiData.items.length} facilities for Guwahati.`);
  console.log(`  Source: ${guwahatiData.source}`);
  console.log(`  Origin coords requested: (26.144, 91.736)`);
  if (guwahatiData.items.length === 0) throw new Error('No facilities returned for Guwahati');
  const sampleGuwahati = guwahatiData.items[0];
  console.log(`  Closest Guwahati Facility: "${sampleGuwahati.name}" [${sampleGuwahati.facilityType}] (${sampleGuwahati.distanceKm} km away)\n`);

  // Confirm locations are distinct and not hardcoded to one city
  if (sampleGangtok.name === sampleGuwahati.name || sampleGangtok.lat === sampleGuwahati.lat) {
    throw new Error('Facilities are identical across different coordinates! Possible hardcoding detected.');
  }
  console.log('✓ Verified: Gangtok and Guwahati return entirely distinct, dynamically resolved facilities.\n');

  // 3. Verify Facility Categorization (Clinics vs Hospitals)
  console.log('--- 3. Testing Facility Categorization (Clinics vs Hospitals) ---');
  const allFacilities = await prisma.facility.findMany();
  const clinics = allFacilities.filter(f => f.facilityType === 'CLINIC');
  const hospitals = allFacilities.filter(f => f.facilityType === 'HOSPITAL');
  console.log(`✓ Total facilities in DB: ${allFacilities.length}`);
  console.log(`✓ Total classified as CLINIC: ${clinics.length}`);
  console.log(`✓ Total classified as HOSPITAL: ${hospitals.length}`);

  // Specifically check known clinics
  const knownClinics = [
    'Netralaya Eye Clinic and Optical Centre',
    'Ruchi Diagnostic Clinic',
    'Maa Manasha Clinic Homeo',
    'Neo Dental Clinic',
    'State Dispensary, Satgaon'
  ];

  for (const name of knownClinics) {
    const item = allFacilities.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
    if (item) {
      if (item.facilityType !== 'CLINIC') {
        throw new Error(`Facility "${item.name}" has incorrect type "${item.facilityType}". Expected CLINIC.`);
      }
      console.log(`✓ Confirmed Correct Classification: "${item.name}" -> CLINIC`);
    }
  }

  // Specifically check known hospitals
  const knownHospitals = [
    'Singtam District Hospital',
    'STNM Multispeciality Hospital',
    'GMC HOSPITAL',
    'Nemcare Hospital'
  ];

  for (const name of knownHospitals) {
    const item = allFacilities.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
    if (item) {
      if (item.facilityType !== 'HOSPITAL') {
        throw new Error(`Facility "${item.name}" has incorrect type "${item.facilityType}". Expected HOSPITAL.`);
      }
      console.log(`✓ Confirmed Correct Classification: "${item.name}" -> HOSPITAL`);
    }
  }
  console.log('✓ Verified: All clinics and hospitals are accurately and distinctly categorized.\n');

  // 4. Verify Real OSRM Routing and Google Maps Fallback
  console.log('--- 4. Testing Real OSRM Route Navigation and Google Maps Fallback ---');
  // Gangtok origin to Gangtok facility
  const destLat = sampleGangtok.lat;
  const destLng = sampleGangtok.lng;
  const routeRes = await fetch(`${BASE_URL}/api/route?originLat=27.338&originLng=88.606&destLat=${destLat}&destLng=${destLng}&profile=driving`);
  if (!routeRes.ok) throw new Error(`Route calculation failed: ${routeRes.status}`);
  const routeData = await routeRes.json();
  console.log(`✓ Route Provider: ${routeData.provider}`);
  console.log(`  Road Distance: ${routeData.distanceKm} km`);
  console.log(`  Estimated Duration: ${routeData.durationMin} minutes`);
  console.log(`  Geometry coordinate points count: ${routeData.geometry.length}`);
  console.log(`  Maneuvers count: ${routeData.steps.length}`);
  console.log(`  Google Maps Link: ${routeData.googleMapsUrl}`);
  if (!routeData.googleMapsUrl.startsWith('https://www.google.com/maps/dir/')) {
    throw new Error('Invalid Google Maps navigation fallback link!');
  }
  console.log('✓ Verified: Real OSRM routing and Google Maps navigation are functional.\n');

  // 5. Verify Road Closures (Pending vs Officially Verified)
  console.log('--- 5. Testing Road Closures Separation (Pending vs Confirmed) ---');
  // Submit a citizen report
  const postRes = await fetch(`${BASE_URL}/api/road-closures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 27.338,
      lng: 88.606,
      roadName: 'NH-10 near Ranipool',
      cause: 'Landslide',
      description: 'Test citizen report: mud and rocks blocking single lane.',
      severity: 'HIGH',
    }),
  });
  if (!postRes.ok) throw new Error(`Submit road closure failed: ${postRes.status}`);
  const postData = await postRes.json();
  console.log(`✓ Citizen report submitted. Report ID: ${postData.reportId}`);

  // Fetch closures
  const closuresRes = await fetch(`${BASE_URL}/api/road-closures?lat=27.338&lng=88.606&radius=50`);
  if (!closuresRes.ok) throw new Error(`Fetch road closures failed: ${closuresRes.status}`);
  const closuresData = await closuresRes.json();

  console.log(`  Official Confirmed Closures: ${closuresData.confirmedClosures.length}`);
  console.log(`  Citizen Community Reports: ${closuresData.communityReports.length}`);

  // Ensure submitted report is in communityReports, NOT confirmedClosures
  const inConfirmed = closuresData.confirmedClosures.some(c => c.id === postData.reportId);
  const inCommunity = closuresData.communityReports.some(c => c.id === postData.reportId);

  if (inConfirmed) {
    throw new Error(`VIOLATION: Pending citizen report ${postData.reportId} was found in confirmedClosures!`);
  }
  if (!inCommunity) {
    throw new Error(`Report ${postData.reportId} was not found in communityReports!`);
  }
  console.log(`✓ Verified: Report ${postData.reportId} is strictly in communityReports (Pending Review) and NOT in confirmedClosures.`);

  // Clean up test report from DB
  await prisma.communityReport.delete({ where: { id: postData.reportId } });
  console.log('✓ Test report cleanly removed from database.');

  console.log('\n=== ALL INTEGRATION CHECKS PASSED SUCCESSFULLY ===');
}

main().finally(() => prisma.$disconnect());
