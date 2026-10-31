require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function checkEarthquakes() {
  const quakes = await prisma.riskPrediction.findMany({
    where: { hazardType: 'EARTHQUAKE' },
  });

  const cities = [
    { name: 'Gangtok', lat: 27.338, lng: 88.606 },
    { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
    { name: 'Shillong', lat: 25.5788, lng: 91.8933 },
  ];

  for (const c of cities) {
    let nearest = null;
    let minDist = Infinity;
    for (const q of quakes) {
      const d = distanceKm(c.lat, c.lng, q.lat, q.lng);
      if (d < minDist) {
        minDist = d;
        nearest = q;
      }
    }
    console.log(`City: ${c.name} -> Nearest Quake: ${minDist.toFixed(1)} km away | Lat: ${nearest?.lat}, Lng: ${nearest?.lng} | Risk: ${nearest?.riskScore}`);
  }
}

checkEarthquakes().finally(() => prisma.$disconnect());
