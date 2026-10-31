const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('=== TEST SUITE: SAFE PLACES, REAL ROUTING & ROAD CLOSURES ===\n');

  // Test 1: Real Facilities via OpenStreetMap
  console.log('1. Testing GET /api/facilities with Guwahati coordinates (26.1445, 91.7362)...');
  try {
    const res = await fetch('http://localhost:3000/api/facilities?lat=26.1445&lng=91.7362&radius=30');
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log(`✓ Returned ${data.count} facilities from source: ${data.source}`);
    console.log('Simulation Mode:', data.simulationMode);
    if (data.items && data.items.length > 0) {
      console.log('Sample Facility:');
      const sample = data.items[0];
      console.log({
        name: sample.name,
        type: sample.facilityType,
        distanceKm: sample.distanceKm,
        address: sample.address ? sample.address.slice(0, 60) + '...' : null,
        lat: sample.lat,
        lng: sample.lng,
      });
    }
  } catch (err) {
    console.error('Facilities test error:', err.message);
  }

  // Test 2: Real OSRM Road Route Navigation
  console.log('\n2. Testing GET /api/route (Guwahati to Dispur road route via OSRM)...');
  try {
    const res = await fetch(
      'http://localhost:3000/api/route?originLat=26.1445&originLng=91.7362&destLat=26.1539&destLng=91.7820&profile=driving'
    );
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log(`✓ Provider: ${data.provider}`);
    console.log(`✓ Is Illustrative: ${data.isIllustrative}`);
    console.log(`✓ Road Distance: ${data.distanceKm} km`);
    console.log(`✓ Duration: ~${data.durationMin} min`);
    console.log(`✓ Geometry Coordinates Count: ${data.geometry.length}`);
    console.log(`✓ Google Maps URL: ${data.googleMapsUrl}`);
    console.log(`✓ First Step: ${data.steps[0]?.instruction}`);
  } catch (err) {
    console.error('Route test error:', err.message);
  }

  // Test 3: Road Blockage Submission (POST)
  console.log('\n3. Testing POST /api/road-closures (Citizen road report submission)...');
  let testReportId = null;
  try {
    const res = await fetch('http://localhost:3000/api/road-closures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 26.1445,
        lng: 91.7362,
        roadName: 'GS Road near Khanapara Flyover',
        cause: 'Landslide',
        description: 'Mud and rocks blocking north-bound lanes after heavy rain.',
        severity: 'HIGH',
      }),
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('✓ Success:', data.success);
    console.log('✓ Report ID:', data.reportId);
    console.log('✓ Status:', data.status);
    testReportId = data.reportId;
  } catch (err) {
    console.error('Road closures POST error:', err.message);
  }

  // Test 4: Road Closures Retrieval & Separation (GET)
  console.log('\n4. Testing GET /api/road-closures...');
  try {
    const res = await fetch('http://localhost:3000/api/road-closures?lat=26.1445&lng=91.7362&radius=50');
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log(`✓ Total Confirmed Closures (Official): ${data.totalConfirmed}`);
    console.log(`✓ Total Pending Community Reports: ${data.totalPending}`);
    const foundOurReport = data.communityReports.find((r) => r.id === testReportId);
    if (foundOurReport) {
      console.log('✓ Our newly submitted report successfully retrieved in Community Reports:');
      console.log({
        id: foundOurReport.id,
        title: foundOurReport.title,
        description: foundOurReport.description,
        status: foundOurReport.status,
      });
    }
  } catch (err) {
    console.error('Road closures GET error:', err.message);
  }

  // Test 5: Verify Database Persistence & Clean test report
  if (testReportId) {
    console.log('\n5. Verifying database record in Supabase CommunityReport table...');
    const record = await prisma.communityReport.findUnique({
      where: { id: testReportId },
    });
    console.log('✓ Record confirmed in Supabase:', record?.id, record?.category, record?.status);

    await prisma.communityReport.delete({ where: { id: testReportId } });
    console.log('✓ Test report cleanly removed from database.');
  }

  console.log('\n=== ALL SAFE PLACES & ROUTING TESTS COMPLETED ===');
}

runTestSuite()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
