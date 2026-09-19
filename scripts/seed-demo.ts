// PurvaGuard AI — demo seed (NE-only, richer data, SMS recipients, translations)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const REGIONS = [
  { name: 'Mangan', state: 'Sikkim', lat: 27.494, lng: 88.533, localName: 'मङ्गन', lang: 'ne' },
  { name: 'Gangtok', state: 'Sikkim', lat: 27.338, lng: 88.606, localName: 'गान्तोक', lang: 'ne' },
  { name: 'Chungthang', state: 'Sikkim', lat: 27.595, lng: 88.641, localName: 'चुंगथाङ', lang: 'ne' },
  { name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.084, lng: 93.605, localName: 'ईटानगर', lang: 'en' },
  { name: 'Tawang', state: 'Arunachal Pradesh', lat: 27.586, lng: 91.659, localName: 'तवांग', lang: 'hi' },
  { name: 'Bomdila', state: 'Arunachal Pradesh', lat: 27.264, lng: 92.416, localName: 'बोमडिला', lang: 'hi' },
  { name: 'Ziro', state: 'Arunachal Pradesh', lat: 27.545, lng: 93.837, localName: 'जीरो', lang: 'hi' },
  { name: 'Guwahati', state: 'Assam', lat: 26.144, lng: 91.736, localName: 'গুৱাহাটী', lang: 'as' },
  { name: 'Dibrugarh', state: 'Assam', lat: 27.472, lng: 94.912, localName: 'ডিব্ৰুগড়', lang: 'as' },
  { name: 'Silchar', state: 'Assam', lat: 24.833, lng: 92.778, localName: 'শিলচৰ', lang: 'as' },
  { name: 'Haflong', state: 'Assam', lat: 25.169, lng: 93.014, localName: 'হাফলং', lang: 'as' },
  { name: 'Shillong', state: 'Meghalaya', lat: 25.578, lng: 91.893, localName: 'Shillong', lang: 'en' },
  { name: 'Sohra', state: 'Meghalaya', lat: 25.27, lng: 91.73, localName: 'Sohra', lang: 'en' },
  { name: 'Tura', state: 'Meghalaya', lat: 25.519, lng: 90.22, localName: 'Tura', lang: 'en' },
  { name: 'Kohima', state: 'Nagaland', lat: 25.675, lng: 94.108, localName: 'Kohima', lang: 'en' },
  { name: 'Dimapur', state: 'Nagaland', lat: 25.909, lng: 93.727, localName: 'Dimapur', lang: 'en' },
  { name: 'Imphal', state: 'Manipur', lat: 24.817, lng: 93.936, localName: 'Imphal', lang: 'en' },
  { name: 'Churachandpur', state: 'Manipur', lat: 24.327, lng: 93.686, localName: 'Churachandpur', lang: 'en' },
  { name: 'Aizawl', state: 'Mizoram', lat: 23.727, lng: 92.718, localName: 'Aizawl', lang: 'en' },
  { name: 'Agartala', state: 'Tripura', lat: 23.831, lng: 91.286, localName: 'অগৰতলা', lang: 'as' },
] as const

const SMS_RECIPIENTS = [
  { phone: '917666891772', name: 'Recipient 1' },
  { phone: '919236075390', name: 'Recipient 2' },
  { phone: '918233709073', name: 'Recipient 3' },
  { phone: '919149882790', name: 'Recipient 4' },
  { phone: '918439410976', name: 'Recipient 5' },
  { phone: '917667585166', name: 'Recipient 6' },
]

async function main() {
  console.log('🌱 Seeding PurvaGuard AI (NE-focused, richer data)...')

  // Clean everything
  const models = ['notificationDelivery','alertRegion','alert','riskPrediction','weatherObservation','taskAssignment','responseTask','volunteerProfile','incidentAssignment','incidentEvent','incidentAttachment','incident','communityReport','roadSegment','facility','hazardZone','newsItem','contentPage','mediaAsset','subscription','userLastLocation','userSavedArea','trustedContact','feedback','systemSetting','auditLog','dataSource','region','user','smsRecipient','smsLog','disasterVerification','translation']
  for (const m of models) {
    try { await (db as any)[m].deleteMany() } catch {}
  }

  // Users
  const admin = await db.user.create({ data: { email: 'admin.demo@purvaguard.in', name: 'Admin Demo', role: 'ADMIN', status: 'ACTIVE' } })
  const operator = await db.user.create({ data: { email: 'district.operator.demo@purvaguard.in', name: 'District Operator', role: 'DISTRICT_OPERATOR', status: 'ACTIVE' } })
  const stateOp = await db.user.create({ data: { email: 'state.operator.demo@purvaguard.in', name: 'State Operator', role: 'STATE_OPERATOR', status: 'ACTIVE' } })
  const volunteer = await db.user.create({ data: { email: 'volunteer.demo@purvaguard.in', name: 'Volunteer Demo', role: 'VOLUNTEER', status: 'ACTIVE' } })
  const resident = await db.user.create({ data: { email: 'resident.demo@purvaguard.in', name: 'Resident Demo', role: 'PUBLIC', status: 'ACTIVE' } })
  const analyst = await db.user.create({ data: { email: 'analyst.demo@purvaguard.in', name: 'AI Analyst', role: 'ANALYST', status: 'ACTIVE' } })

  // SMS recipients (the 6 real numbers)
  for (const r of SMS_RECIPIENTS) await db.smsRecipient.create({ data: r })

  // Regions (states + localities)
  const statesSeen = new Map<string, string>()
  const regionMap = new Map<string, string>()
  for (const r of REGIONS) {
    if (!statesSeen.has(r.state)) {
      const s = await db.region.create({ data: { regionType: 'STATE', canonicalName: r.state, localName: r.state, lat: r.lat, lng: r.lng, coverageStatus: 'DATA_CONNECTED' } })
      statesSeen.set(r.state, s.id)
    }
    const loc = await db.region.create({ data: { parentId: statesSeen.get(r.state)!, regionType: 'LOCALITY', canonicalName: `${r.name}, ${r.state}`, localName: r.localName, defaultLanguage: r.lang, lat: r.lat, lng: r.lng, coverageStatus: 'DEMO', boundarySource: 'Survey of India (demo)' } })
    regionMap.set(`${r.name}, ${r.state}`, loc.id)
  }

  // Data sources
  const sources = [
    { name: 'IMD Weather Forecast (DEMO)', sourceType: 'WEATHER', provider: 'India Meteorological Dept', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 5 * 60000) },
    { name: 'Rainfall Grid — GPM Proxy (DEMO)', sourceType: 'RAINFALL', provider: 'NASA GPM / IMD', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 3 * 60000) },
    { name: 'River Gauge — CWC Testbed (DEMO)', sourceType: 'RIVER', provider: 'Central Water Commission', simulationMode: true, healthStatus: 'DEGRADED', lastSuccessAt: new Date(Date.now() - 40 * 60000), lastErrorMessage: 'Telemetry lag > 30 min on Teesta station' },
    { name: 'GSI Landslide Susceptibility (DEMO)', sourceType: 'OFFICIAL_FEED', provider: 'Geological Survey of India', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 90 * 60000) },
    { name: 'OpenStreetMap Base Map', sourceType: 'MAP', provider: 'OSM Contributors', simulationMode: false, healthStatus: 'HEALTHY', lastSuccessAt: new Date() },
    { name: 'NDMA Sachet Feed (DEMO)', sourceType: 'OFFICIAL_FEED', provider: 'NDMA', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 12 * 60000) },
    { name: 'Seismic Network — USGS (DEMO)', sourceType: 'SENSOR', provider: 'USGS', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 60 * 60000) },
  ]
  for (const s of sources) await db.dataSource.create({ data: s })

  // Weather observations — for ALL NE regions
  for (const r of REGIONS) {
    const rain = Math.round(Math.random() * 90 + 15)
    await db.weatherObservation.create({
      data: {
        regionId: regionMap.get(`${r.name}, ${r.state}`),
        stationName: `WS-${r.name.slice(0, 4).toUpperCase()}`,
        lat: r.lat, lng: r.lng,
        observedAt: new Date(Date.now() - 8 * 60000),
        rainfall24hMm: rain,
        rainfall1hMm: Math.round(rain / 12),
        temperatureC: Math.round((12 + Math.random() * 18) * 10) / 10,
        humidityPct: Math.round(55 + Math.random() * 40),
        windKph: Math.round(5 + Math.random() * 30),
        demoLabel: true,
      },
    })
  }

  // Facilities — richer, more types per region
  const facilityTemplates = [
    { type: 'SHELTER', name: 'Govt School Shelter', cap: 200 },
    { type: 'HOSPITAL', name: 'District Hospital', cap: 80 },
    { type: 'RELIEF_CENTER', name: 'Community Relief Centre', cap: 300 },
    { type: 'POLICE_STATION', name: 'Police Station', cap: 50 },
    { type: 'ASSEMBLY_POINT', name: 'Town Hall Assembly Point', cap: 500 },
    { type: 'HOSPITAL', name: 'Primary Health Centre', cap: 30 },
    { type: 'RELIEF_CENTER', name: 'Gurdwara/School Relief', cap: 150 },
  ]
  for (const r of REGIONS) {
    const n = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const t = facilityTemplates[Math.floor(Math.random() * facilityTemplates.length)]
      await db.facility.create({
        data: {
          facilityType: t.type,
          name: `${t.name} — ${r.name}`,
          regionId: regionMap.get(`${r.name}, ${r.state}`),
          lat: r.lat + (Math.random() - 0.5) * 0.04,
          lng: r.lng + (Math.random() - 0.5) * 0.04,
          address: `${r.name}, ${r.state}`,
          phone: '+91-XXXXX-XXXXX (demo)',
          capacity: t.cap,
          availableUnits: Math.floor(t.cap * (0.25 + Math.random() * 0.6)),
          accessibility: JSON.stringify({ wheelchair: Math.random() > 0.4, power: true, water: true, medical: t.type === 'HOSPITAL' }),
          hours: '24x7',
          status: Math.random() > 0.88 ? 'FULL' : 'OPEN',
          verifiedAt: new Date(Date.now() - Math.random() * 86400000),
          source: 'District administration (demo)',
        },
      })
    }
  }

  // Hazard zones
  for (const r of REGIONS.slice(0, 14)) {
    await db.hazardZone.create({
      data: {
        regionId: regionMap.get(`${r.name}, ${r.state}`),
        hazardType: ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN'][Math.floor(Math.random() * 3)],
        name: `${r.name} susceptibility zone`,
        lat: r.lat + (Math.random() - 0.5) * 0.03,
        lng: r.lng + (Math.random() - 0.5) * 0.03,
        radiusKm: 2 + Math.random() * 4,
        baselineLevel: ['ADVISORY', 'WATCH', 'WARNING'][Math.floor(Math.random() * 3)],
        source: 'GSI susceptibility (demo)',
      },
    })
  }

  // Risk predictions — for ALL NE regions, ALL hazards
  for (const r of REGIONS) {
    for (const h of ['LANDSLIDE', 'FLASH_FLOOD', 'HEAVY_RAIN']) {
      const score = Math.round(Math.random() * 100)
      const level = score > 75 ? 'VERY_HIGH' : score > 55 ? 'HIGH' : score > 35 ? 'MODERATE' : 'LOW'
      await db.riskPrediction.create({
        data: {
          regionId: regionMap.get(`${r.name}, ${r.state}`),
          lat: r.lat, lng: r.lng,
          hazardType: h,
          horizonMinutes: 360,
          riskLevel: level,
          riskScore: score,
          confidence: Math.round((0.55 + Math.random() * 0.4) * 100) / 100,
          dataCoveragePct: Math.round(55 + Math.random() * 40),
          topFeatures: JSON.stringify([
            { feature: '24h rainfall', contribution: Math.round(Math.random() * 35 + 20), value: `${Math.round(Math.random() * 90)}mm` },
            { feature: 'antecedent wetness (7d)', contribution: Math.round(Math.random() * 22 + 10), value: ['high', 'moderate', 'low'][Math.floor(Math.random()*3)] },
            { feature: 'slope class', contribution: Math.round(Math.random() * 18 + 8), value: `${30 + Math.floor(Math.random() * 25)}-${45 + Math.floor(Math.random() * 15)}°` },
            { feature: 'land cover', contribution: Math.round(Math.random() * 10 + 4), value: ['sparse', 'forest', 'agriculture'][Math.floor(Math.random()*3)] },
            { feature: 'drainage density', contribution: Math.round(Math.random() * 8 + 3), value: ['high', 'medium'][Math.floor(Math.random()*2)] },
            { feature: 'soil type', contribution: Math.round(Math.random() * 6 + 2), value: ['loamy', 'sandy', 'clay'][Math.floor(Math.random()*3)] },
          ]),
          inputSnapshot: JSON.stringify({ modelVersion: 'purvaguard-baseline-v1', stale: false, inputsFresh: true }),
          expiresAt: new Date(Date.now() + 6 * 3600000),
          simulationMode: true,
        },
      })
    }
  }

  // Alerts — richer, NE-focused
  const alertTemplates = [
    { type: 'FLASH_FLOOD', severity: 'WARNING', title: 'Flash Flood Warning — Teesta basin', body: 'Intense rainfall over the Teesta catchment is likely to cause rapid water level rise between Mangan and Chungthang. Avoid riverbanks and low-lying crossings. Move to higher ground if advised by local authorities.', issuer: 'District Disaster Management Authority (demo)', region: 'Mangan, Sikkim' },
    { type: 'LANDSLIDE', severity: 'WATCH', title: 'Landslide Watch — hill road corridors', body: 'Saturated slopes along NH-10 and the Gangtok-Mangan corridor are at elevated risk of debris flow. Travelers should avoid night movement and follow traffic advisories.', issuer: 'GSI / State Authority (demo)', region: 'Gangtok, Sikkim' },
    { type: 'HEAVY_RAIN', severity: 'ADVISORY', title: 'Heavy Rain Advisory — Sohra', body: 'IMD (demo) forecasts 100-140mm rainfall in the next 24 hours over the Sohra (Cherrapunji) area. Secure household items, clear drains, and keep emergency contacts ready.', issuer: 'IMD (demo)', region: 'Sohra, Meghalaya' },
    { type: 'ROAD_BLOCK', severity: 'WARNING', title: 'Road Blockage — Itanagar-Banderdewa highway', body: 'Reported debris on the highway near Itanagar. Single-lane traffic only. Use alternate route via Naharlagun where available. Confirm with local transport authority.', issuer: 'District Operator (demo)', region: 'Itanagar, Arunachal Pradesh' },
    { type: 'FLASH_FLOOD', severity: 'EMERGENCY', title: 'Flash Flood Emergency — Barak river near Silchar', body: 'Rapid water level rise reported on the Barak river. Low-lying areas of Silchar are at immediate risk. Evacuate to higher ground NOW. Follow instructions from district administration.', issuer: 'CWC / District Authority (demo)', region: 'Silchar, Assam' },
    { type: 'LANDSLIDE', severity: 'WARNING', title: 'Landslide Warning — Kohima-Dimapur road', body: 'Active debris movement reported on the Kohima-Dimapur highway near Patkai. Avoid the stretch until clearance is confirmed.', issuer: 'State Authority (demo)', region: 'Kohima, Nagaland' },
    { type: 'EARTHQUAKE', severity: 'INFORMATIONAL', title: 'Reported seismic event — felt in Imphal', body: 'A reported seismic event (M4.2 demo) was felt in Imphal valley. No major damage confirmed. Await official bulletin from authorities.', issuer: 'Platform (reported event)', region: 'Imphal, Manipur' },
    { type: 'HEAVY_RAIN', severity: 'WATCH', title: 'Heavy Rain Watch — Aizawl', body: 'Monsoon system likely to bring 60-90mm rainfall over Aizawl district in next 12 hours. Hill slopes at elevated risk. Prepare for possible landslides.', issuer: 'IMD (demo)', region: 'Aizawl, Mizoram' },
  ]
  for (let i = 0; i < alertTemplates.length; i++) {
    const t = alertTemplates[i]
    const r = REGIONS.find((x) => `${x.name}, ${x.state}` === t.region) ?? REGIONS[i % REGIONS.length]
    const alert = await db.alert.create({
      data: {
        alertType: t.type,
        issuerType: i === 0 ? 'OFFICIAL' : i === 4 ? 'OFFICIAL' : i === 6 ? 'COMMUNITY' : 'PLATFORM',
        issuerName: t.issuer,
        title: t.title,
        body: t.body,
        severity: t.severity,
        modelRiskLevel: t.severity === 'EMERGENCY' ? 'VERY_HIGH' : t.severity === 'WARNING' ? 'HIGH' : 'MODERATE',
        confidence: Math.round((0.62 + Math.random() * 0.33) * 100) / 100,
        lat: r.lat, lng: r.lng,
        radiusKm: 15,
        issuedAt: new Date(Date.now() - (i + 1) * 25 * 60000),
        validFrom: new Date(Date.now() - (i + 1) * 25 * 60000),
        expiresAt: new Date(Date.now() + (14 - i) * 3600000),
        status: 'ACTIVE',
        verificationStatus: i === 0 || i === 4 ? 'OFFICIAL' : i === 3 || i === 5 ? 'DISTRICT_VERIFIED' : i === 6 ? 'COMMUNITY' : 'PLATFORM',
        authorId: operator.id,
        approvedBy: operator.id,
        publishedAt: new Date(),
        simulationMode: true,
      },
    })
    const regionId = regionMap.get(`${r.name}, ${r.state}`)
    if (regionId) await db.alertRegion.create({ data: { alertId: alert.id, regionId } })
    await db.notificationDelivery.create({ data: { alertId: alert.id, recipient: `geofence:${r.state}`, channel: 'IN_APP', provider: 'purvaguard-push', status: 'DELIVERED', sentAt: new Date(), deliveredAt: new Date(), simulationMode: true } })
  }
  // Expired alert
  await db.alert.create({ data: { alertType: 'LANDSLIDE', issuerType: 'PLATFORM', issuerName: 'Platform (demo)', title: 'Landslide Advisory — cleared', body: 'A previous landslide advisory for Tawang has expired after verification.', severity: 'ADVISORY', lat: 27.586, lng: 91.659, radiusKm: 10, issuedAt: new Date(Date.now() - 72 * 3600000), validFrom: new Date(Date.now() - 72 * 3600000), expiresAt: new Date(Date.now() - 24 * 3600000), status: 'EXPIRED', verificationStatus: 'PLATFORM', simulationMode: true } })

  // Incidents
  const sosTemplates = [
    { type: 'SOS', lat: 27.5, lng: 88.55, desc: 'Family stranded near swollen stream, water rising rapidly. 4 people including 1 elderly and 1 child.', priority: 'CRITICAL', needs: JSON.stringify(['rescue', 'medical', 'food']) },
    { type: 'SOS', lat: 24.84, lng: 92.78, desc: 'Road blocked by debris near Silchar, vehicle unable to move with 2 people inside.', priority: 'HIGH', needs: JSON.stringify(['transport']) },
    { type: 'LANDSLIDE', lat: 27.49, lng: 88.53, desc: 'Fresh landslide debris on approach road to Mangan. No injuries reported yet but road fully blocked.', priority: 'HIGH' },
    { type: 'FLOOD', lat: 26.15, lng: 91.74, desc: 'Water entering ground-floor homes near the Brahmaputra embankment in Guwahati. 15+ families affected.', priority: 'HIGH' },
    { type: 'ROAD_BLOCK', lat: 27.08, lng: 93.6, desc: 'Fallen tree blocking highway lane near Itanagar. Single lane passable.', priority: 'NORMAL' },
    { type: 'CRACK', lat: 25.67, lng: 94.1, desc: 'New ground cracks widening near residential area in Kohima. Retaining wall showing movement.', priority: 'HIGH' },
    { type: 'FLOOD', lat: 24.82, lng: 93.93, desc: 'Flash flood in Imphal river tributary. Low-lying areas inundated.', priority: 'CRITICAL' },
    { type: 'LANDSLIDE', lat: 25.57, lng: 91.89, desc: 'Minor debris flow on Shillong bypass road. Traffic slowed.', priority: 'NORMAL' },
  ]
  for (let i = 0; i < sosTemplates.length; i++) {
    const t = sosTemplates[i]
    const statuses = ['NEW', 'TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED', 'TRIAGED', 'VERIFIED']
    const status = statuses[Math.min(i, statuses.length - 1)]
    const code = `PG-2026-${String(i + 1).padStart(3, '0')}`
    const inc = await db.incident.create({
      data: {
        incidentCode: code, incidentType: t.type, priority: t.priority, status,
        description: t.desc, lat: t.lat, lng: t.lng,
        locationAccuracyM: 15 + Math.random() * 35,
        locationCapturedAt: new Date(Date.now() - (i + 1) * 18 * 60000),
        locationKind: i % 3 === 0 ? 'LAST_KNOWN' : 'GPS',
        peopleCount: 1 + Math.floor(Math.random() * 6),
        needs: (t as any).needs ?? null,
        reporterUserId: i % 2 === 0 ? resident.id : null,
        reporterContact: i % 2 === 1 ? '+91-XXXXX-XXXXX (demo)' : null,
        verificationStatus: status === 'RESOLVED' || status === 'RESPONDING' ? 'VERIFIED' : 'UNVERIFIED',
        assignedTeamId: ['ASSIGNED', 'RESPONDING'].includes(status) ? 'team-field-unit-1' : null,
        simulationMode: true,
        closedAt: status === 'RESOLVED' ? new Date(Date.now() - 30 * 60000) : null,
      },
    })
    await db.incidentEvent.create({ data: { incidentId: inc.id, actorId: operator.id, eventType: 'CREATED', toStatus: 'NEW', note: 'Incident reported via platform', createdAt: inc.createdAt } })
    if (['TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED'].includes(status)) {
      await db.incidentEvent.create({ data: { incidentId: inc.id, actorId: operator.id, eventType: 'STATUS_CHANGE', fromStatus: 'NEW', toStatus: 'TRIAGED', note: 'Triage category assigned by operator', createdAt: new Date(inc.createdAt.getTime() + 5 * 60000) } })
    }
    if (['ASSIGNED', 'RESPONDING', 'RESOLVED'].includes(status)) {
      await db.incidentAssignment.create({ data: { incidentId: inc.id, volunteerId: volunteer.id, assignedBy: operator.id, acceptedAt: new Date(inc.createdAt.getTime() + 10 * 60000), status: status === 'RESOLVED' ? 'COMPLETED' : 'CHECKED_IN' } })
    }
    if (t.type === 'SOS') {
      await db.notificationDelivery.create({ data: { incidentId: inc.id, recipient: 'district-ops-queue', channel: 'IN_APP', provider: 'purvaguard-queue', status: 'ACKNOWLEDGED', sentAt: inc.createdAt, deliveredAt: inc.createdAt, simulationMode: true } })
    }
  }

  // Community reports — richer
  const reportTemplates = [
    { category: 'LANDSLIDE', desc: 'Minor debris flow on link road near Mangan bazaar, passable on foot only. Mud and rocks on the road.', lat: 27.49, lng: 88.53, sev: 'HIGH', status: 'UNDER_REVIEW' },
    { category: 'FLOOD', desc: 'Stream water level rose quickly overnight near Dibrugarh. Approaching the warning mark.', lat: 27.47, lng: 94.91, sev: 'HIGH', status: 'VERIFIED' },
    { category: 'FALLEN_TREE', desc: 'Large tree fallen across village path near Tura. Blocking access to 3 houses.', lat: 25.52, lng: 90.22, sev: 'MODERATE', status: 'RECEIVED' },
    { category: 'CRACK', desc: 'Cracks widening on retaining wall near school in Itanagar. Wall may collapse.', lat: 27.08, lng: 93.6, sev: 'HIGH', status: 'VERIFIED' },
    { category: 'ROAD_BLOCK', desc: 'Boulders on highway near Tawang hairpin bend. Traffic halted.', lat: 27.58, lng: 91.65, sev: 'MODERATE', status: 'RESOLVED' },
    { category: 'FLOOD', desc: 'Flash flood entering homes near Barak river in Silchar. Water rising fast.', lat: 24.83, lng: 92.77, sev: 'CRITICAL', status: 'UNDER_REVIEW' },
    { category: 'LANDSLIDE', desc: 'Fresh cracks on slope above Kohima-Dimapur road. Debris starting to slide.', lat: 25.67, lng: 93.72, sev: 'HIGH', status: 'RECEIVED' },
    { category: 'BRIDGE_DAMAGE', desc: 'Bridge pillar showing cracks near Aizawl. Load-bearing capacity uncertain.', lat: 23.72, lng: 92.71, sev: 'CRITICAL', status: 'UNDER_REVIEW' },
  ]
  for (const r of reportTemplates) {
    await db.communityReport.create({ data: { category: r.category, description: r.desc, lat: r.lat, lng: r.lng, severity: r.sev, status: r.status, reporterUserId: resident.id, verificationStatus: r.status === 'VERIFIED' ? 'VERIFIED' : 'UNVERIFIED', simulationMode: true, observedAt: new Date(Date.now() - Math.random() * 86400000) } })
  }

  // Disaster verifications (sample)
  await db.disasterVerification.create({ data: { inputText: 'Flash flood entering homes near Barak river in Silchar. Water rising fast.', analysis: JSON.stringify({ isRealDisaster: true, disasterType: 'FLASH_FLOOD', severity: 'CRITICAL', confidence: 0.91, affectedArea: 'Silchar, Assam', estimatedPeopleAtRisk: 200, recommendedAction: 'Evacuate to higher ground immediately', smsMessage: 'FLASH FLOOD ALERT: Barak river rising near Silchar. Evacuate to higher ground NOW. -PurvaGuard AI' }), verified: true, actionTaken: 'ALERT_CREATED + SMS_SENT:6/6' } })
  await db.disasterVerification.create({ data: { inputText: 'Minor debris flow on link road near Mangan.', analysis: JSON.stringify({ isRealDisaster: true, disasterType: 'LANDSLIDE', severity: 'MODERATE', confidence: 0.72, affectedArea: 'Mangan, Sikkim', estimatedPeopleAtRisk: 20, recommendedAction: 'Avoid the area', smsMessage: 'Landslide debris reported near Mangan. Avoid the area. -PurvaGuard AI' }), verified: false, actionTaken: 'QUEUED_FOR_REVIEW' } })

  // Volunteer
  await db.volunteerProfile.create({ data: { userId: volunteer.id, skills: 'first-aid,search-rescue,translation,driving', languages: 'en,hi,ne,as', serviceRegions: 'Sikkim;Assam;Arunachal Pradesh', availabilityStatus: 'AVAILABLE', verificationStatus: 'VERIFIED', approvedBy: admin.id, approvedAt: new Date(Date.now() - 7 * 86400000), equipment: JSON.stringify({ firstAidKit: true, ropes: true, torch: true }), vehicle: JSON.stringify({ type: '4x4 SUV', capacity: 5 }), training: JSON.stringify({ ndrfBasic: true, firstAidCertified: true }) } })

  // Tasks
  const tasks = [
    { title: 'Welfare check — elderly residents near Mangan', type: 'WELFARE_CHECK', lat: 27.49, lng: 88.53, skills: 'first-aid', status: 'IN_PROGRESS' },
    { title: 'Supply distribution — relief centre Silchar', type: 'SUPPLY', lat: 24.83, lng: 92.77, skills: '', status: 'OPEN' },
    { title: 'Translation support — Nepali/Hindi/Assamese', type: 'TRANSLATION', lat: 27.33, lng: 88.6, skills: 'translation', status: 'OPEN' },
    { title: 'Shelter setup — Guwahati relief centre', type: 'SHELTER_SUPPORT', lat: 26.14, lng: 91.74, skills: '', status: 'OPEN' },
    { title: 'Route verification — Itanagar highway', type: 'MAPPING', lat: 27.08, lng: 93.6, skills: 'driving', status: 'COMPLETED' },
  ]
  for (const t of tasks) {
    const task = await db.responseTask.create({ data: { title: t.title, taskType: t.type, description: `${t.title}. Coordinator-assigned task with safety constraints. Verify route safety before proceeding.`, lat: t.lat, lng: t.lng, requiredSkills: t.skills, status: t.status, coordinatorId: operator.id, startAt: new Date(), safetyConstraints: JSON.stringify({ restrictedZone: t.type === 'SHELTER_SUPPORT' }) } })
    if (t.status === 'IN_PROGRESS') await db.taskAssignment.create({ data: { taskId: task.id, volunteerId: volunteer.id, status: 'CHECKED_IN', acceptedAt: new Date(Date.now() - 30 * 60000), checkinAt: new Date(Date.now() - 15 * 60000) } })
  }

  // News — richer, real-sounding, no placeholder
  const news = [
    { title: 'IMD forecasts intense rainfall over sub-Himalayan West Bengal & Sikkim', summary: 'A low-pressure system is expected to bring 80-110mm rainfall over the next 48 hours across the Teesta basin. District administrations on alert.', publisher: 'Weather Desk (demo)', url: 'https://example.com/imd-rain', cat: 'WEATHER', pinned: true },
    { title: 'GSI releases updated landslide susceptibility map for Sikkim districts', summary: 'The revised baseline identifies several new high-susceptibility pockets near Mangan and Chungthang along the Teesta corridor.', publisher: 'Geology Desk (demo)', url: 'https://example.com/gsi-map', cat: 'GEOLOGY' },
    { title: 'District administration opens additional shelter in Mangan', summary: 'Capacity expanded to 200 beds ahead of monsoon activation. Residents in low-lying areas advised to register at the nearest relief centre.', publisher: 'Local Bulletin (demo)', url: 'https://example.com/shelter', cat: 'ADMIN' },
    { title: 'NH-10 traffic advisory issued for night movement near Gangtok', summary: 'Authorities discourage night travel on vulnerable hill stretches between Gangtok and Mangan until debris clearance is verified.', publisher: 'Transport Desk (demo)', url: 'https://example.com/nh10', cat: 'TRANSPORT' },
    { title: 'CWC reports rising Barak river levels near Silchar', summary: 'Central Water Commission monitoring station shows water approaching warning level. Evacuation advisories being prepared for low-lying areas.', publisher: 'Rivers Desk (demo)', url: 'https://example.com/barak', cat: 'WEATHER', pinned: true },
    { title: 'NDRF team pre-positioned in Itanagar ahead of monsoon', summary: 'A 45-personnel NDRF team deployed to Arunachal Pradesh capital for rapid response to potential landslide and flood events.', publisher: 'Response Desk (demo)', url: 'https://example.com/ndrf', cat: 'ADMIN' },
    { title: 'Community early-warning sirens tested in Sohra', summary: 'Meghalaya district administration completed successful testing of community sirens. Residents encouraged to save emergency contact numbers offline.', publisher: 'Local Bulletin (demo)', url: 'https://example.com/siren', cat: 'ADMIN' },
    { title: 'Seismic event M4.2 recorded near Imphal — no damage reported', summary: 'IMD seismic network recorded a shallow event. No damage confirmed. Authorities monitoring for aftershocks.', publisher: 'Seismic Desk (demo)', url: 'https://example.com/seismic', cat: 'GEOLOGY' },
  ]
  for (const n of news) {
    await db.newsItem.create({ data: { title: n.title, summary: n.summary, publisher: n.publisher, sourceUrl: n.url, publishedAt: new Date(Date.now() - Math.random() * 86400000), fetchedAt: new Date(Date.now() - Math.random() * 3600000), categories: n.cat, language: 'en', status: 'PUBLISHED', pinned: n.pinned ?? false, demoLabel: true, authorId: admin.id, regionId: regionMap.get('Mangan, Sikkim') } })
  }

  // Content pages
  const pages = [
    { slug: 'landslide-before-during-after', title: 'Landslides — Before / During / After', hazard: 'LANDSLIDE', body: `# Landslides — Before / During / After\n\n## Before\n- Know your area's risk and history of landslides.\n- Watch for warning signs: new ground cracks, tilting trees or poles, unusual water seepage, sudden stream changes.\n- Prepare an emergency kit and family communication plan.\n- Keep drains clear and avoid cutting into slopes.\n\n## During\n- If you suspect movement, move away from the slope immediately — do not delay.\n- Move to higher, stable ground; avoid riverbanks and the base of steep slopes.\n- If driving, stop away from the slide area; do not cross a debris flow.\n\n## After\n- Stay away until authorities confirm it is safe.\n- Check for trapped or injured people; report via SOS only when safe.\n- Watch for secondary slides, broken utilities, and flooded drainage.\n\n> Always follow instructions from local authorities and on-ground responders.` },
    { slug: 'flash-flood-guide', title: 'Flash Floods — Safety Guide', hazard: 'FLASH_FLOOD', body: `# Flash Floods — Safety Guide\n\n- Never cross flowing water, even if it looks shallow. 15cm of moving water can knock you over.\n- Move to higher ground immediately when advised; do not wait for an official order if water is rising rapidly.\n- Avoid riverbanks, low bridges, and underpasses during heavy rain.\n- Keep a "go-bag" with documents, medication, and water ready.\n\n> "Turn Around Don't Drown" — follow local authority instructions.` },
    { slug: 'earthquake-guide', title: 'Earthquake — Drop, Cover, Hold On', hazard: 'EARTHQUAKE', body: `# Earthquake Safety\n\n## During shaking\n- DROP to the ground.\n- Take COVER under a sturdy desk or against an interior wall.\n- HOLD ON until shaking stops.\n\n## After shaking\n- Move carefully; expect aftershocks.\n- Check yourself and others for injuries.\n- If in a landslide-prone area, be alert for slope movement.` },
    { slug: 'household-emergency-kit', title: 'Household Emergency Kit Checklist', hazard: 'GENERAL', body: `# Household Emergency Kit\n\n- Water (3 litres/person/day for 3 days)\n- Non-perishable food\n- First-aid kit and essential medicines\n- Torch + extra batteries\n- Power bank / phone charger\n- Copies of ID and important documents\n- Whistle, rope, basic tools\n- Cash (small denominations)\n- Local emergency contact list` },
    { slug: 'family-communication-plan', title: 'Family Communication Plan', hazard: 'GENERAL', body: `# Family Communication Plan\n\n- Identify an out-of-area contact person.\n- Share the contact number with every family member.\n- Agree on a meeting point if separated.\n- Teach children how to call emergency services.\n- Save numbers offline.` },
    { slug: 'heavy-rain-guide', title: 'Heavy Rain & Monsoon Safety', hazard: 'HEAVY_RAIN', body: `# Heavy Rain Safety\n\n- Clear drains and gutters around your home before monsoon.\n- Avoid parking near riverbanks or in low-lying areas.\n- Keep your phone charged and emergency contacts saved offline.\n- Monitor IMD forecasts and district advisories.\n- If water enters your home, switch off electrical mains and move to higher floors.` },
  ]
  for (const p of pages) {
    await db.contentPage.create({ data: { slug: p.slug, title: p.title, body: p.body, contentType: 'BEFORE_DURING_AFTER', hazardType: p.hazard, language: 'en', status: 'PUBLISHED', reviewedBy: admin.id, reviewedAt: new Date(), nextReviewAt: new Date(Date.now() + 180 * 86400000), authorId: admin.id } })
  }

  // Trusted contacts + saved area
  await db.trustedContact.create({ data: { userId: resident.id, name: 'Family Member (demo)', relationship: 'spouse', phone: '+91-XXXXX-XXXXX' } })
  await db.userSavedArea.create({ data: { userId: resident.id, label: 'Home — Mangan', regionId: regionMap.get('Mangan, Sikkim'), lat: 27.494, lng: 88.533, isDefault: true } })
  await db.subscription.create({ data: { userId: resident.id, regionId: regionMap.get('Mangan, Sikkim'), label: 'Mangan alerts', hazards: 'LANDSLIDE,FLASH_FLOOD,HEAVY_RAIN', channels: 'IN_APP', soundEnabled: false } })

  // System settings
  await db.systemSetting.create({ data: { key: 'branding.productName', value: JSON.stringify('PurvaGuard AI') } })
  await db.systemSetting.create({ data: { key: 'demo.simulationMode', value: JSON.stringify(true) } })
  await db.systemSetting.create({ data: { key: 'map.defaultExtent', value: JSON.stringify({ minLat: 21, maxLat: 29, minLng: 88, maxLng: 97 }) } })
  await db.systemSetting.create({ data: { key: 'sms.defaultMessage', value: JSON.stringify('DISASTER ALERT: {{hazard}} reported near {{location}}. {{action}} -PurvaGuard AI') } })
  await db.systemSetting.create({ data: { key: 'sms.provider', value: JSON.stringify('test') } })
  await db.systemSetting.create({ data: { key: 'sms.textbeltKey', value: JSON.stringify('textbelt') } })

  console.log(`✅ Seed complete.`)
  console.log(`   NE regions: ${REGIONS.length}`)
  console.log(`   SMS recipients: ${SMS_RECIPIENTS.length}`)
  console.log(`   Demo users: admin/district.operator/state.operator/volunteer/resident/analyst @purvaguard.in`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
