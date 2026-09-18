// PurvaGuard AI — demo seed script
// Run: bun run scripts/seed-demo.ts  (or `bun run db:seed`)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const REGIONS = [
  { name: 'Mangan', state: 'Sikkim', regionType: 'LOCALITY', lat: 27.494, lng: 88.533, localName: 'मङ्गन', lang: 'ne' },
  { name: 'Gangtok', state: 'Sikkim', regionType: 'LOCALITY', lat: 27.338, lng: 88.606, localName: 'गान्तोक', lang: 'ne' },
  { name: 'Chungthang', state: 'Sikkim', regionType: 'LOCALITY', lat: 27.595, lng: 88.641, localName: 'चुंगथाङ', lang: 'ne' },
  { name: 'Joshimath', state: 'Uttarakhand', regionType: 'LOCALITY', lat: 30.554, lng: 79.565, localName: 'जोशीमठ', lang: 'hi' },
  { name: 'Rudraprayag', state: 'Uttarakhand', regionType: 'LOCALITY', lat: 30.285, lng: 78.982, localName: 'रुद्रप्रयाग', lang: 'hi' },
  { name: 'Mandi', state: 'Himachal Pradesh', regionType: 'LOCALITY', lat: 31.71, lng: 76.532, localName: 'मंडी', lang: 'hi' },
  { name: 'Manali', state: 'Himachal Pradesh', regionType: 'LOCALITY', lat: 32.239, lng: 77.188, localName: 'मनाली', lang: 'hi' },
  { name: 'Itanagar', state: 'Arunachal Pradesh', regionType: 'LOCALITY', lat: 27.084, lng: 93.605, localName: 'ईटानगर', lang: 'en' },
  { name: 'Tawang', state: 'Arunachal Pradesh', regionType: 'LOCALITY', lat: 27.586, lng: 91.659, localName: 'तवांग', lang: 'hi' },
  { name: 'Guwahati', state: 'Assam', regionType: 'LOCALITY', lat: 26.144, lng: 91.736, localName: 'গুৱাহাটী', lang: 'as' },
  { name: 'Haflong', state: 'Assam', regionType: 'LOCALITY', lat: 25.169, lng: 93.014, localName: 'হাফলং', lang: 'as' },
  { name: 'Shillong', state: 'Meghalaya', regionType: 'LOCALITY', lat: 25.578, lng: 91.893, localName: 'Shillong', lang: 'en' },
  { name: 'Sohra (Cherrapunji)', state: 'Meghalaya', regionType: 'LOCALITY', lat: 25.27, lng: 91.73, localName: 'Sohra', lang: 'en' },
  { name: 'Kohima', state: 'Nagaland', regionType: 'LOCALITY', lat: 25.675, lng: 94.108, localName: 'Kohima', lang: 'en' },
  { name: 'Imphal', state: 'Manipur', regionType: 'LOCALITY', lat: 24.817, lng: 93.936, localName: 'Imphal', lang: 'en' },
  { name: 'Leh', state: 'Ladakh', regionType: 'LOCALITY', lat: 34.152, lng: 77.577, localName: 'लेह', lang: 'hi' },
] as const

async function main() {
  console.log('🌱 Seeding PurvaGuard AI demo data...')

  await db.notificationDelivery.deleteMany()
  await db.alertRegion.deleteMany()
  await db.alert.deleteMany()
  await db.riskPrediction.deleteMany()
  await db.weatherObservation.deleteMany()
  await db.taskAssignment.deleteMany()
  await db.responseTask.deleteMany()
  await db.volunteerProfile.deleteMany()
  await db.incidentAssignment.deleteMany()
  await db.incidentEvent.deleteMany()
  await db.incidentAttachment.deleteMany()
  await db.incident.deleteMany()
  await db.communityReport.deleteMany()
  await db.roadSegment.deleteMany()
  await db.facility.deleteMany()
  await db.hazardZone.deleteMany()
  await db.newsItem.deleteMany()
  await db.contentPage.deleteMany()
  await db.mediaAsset.deleteMany()
  await db.subscription.deleteMany()
  await db.userLastLocation.deleteMany()
  await db.userSavedArea.deleteMany()
  await db.trustedContact.deleteMany()
  await db.feedback.deleteMany()
  await db.systemSetting.deleteMany()
  await db.auditLog.deleteMany()
  await db.dataSource.deleteMany()
  await db.region.deleteMany()
  await db.user.deleteMany()

  const admin = await db.user.create({ data: { email: 'admin.demo@purvaguard.in', name: 'Admin Demo', role: 'ADMIN', status: 'ACTIVE' } })
  const operator = await db.user.create({ data: { email: 'district.operator.demo@purvaguard.in', name: 'District Operator', role: 'DISTRICT_OPERATOR', status: 'ACTIVE' } })
  const stateOp = await db.user.create({ data: { email: 'state.operator.demo@purvaguard.in', name: 'State Operator', role: 'STATE_OPERATOR', status: 'ACTIVE' } })
  const volunteer = await db.user.create({ data: { email: 'volunteer.demo@purvaguard.in', name: 'Volunteer Demo', role: 'VOLUNTEER', status: 'ACTIVE' } })
  const resident = await db.user.create({ data: { email: 'resident.demo@purvaguard.in', name: 'Resident Demo', role: 'PUBLIC', status: 'ACTIVE' } })
  const analyst = await db.user.create({ data: { email: 'analyst.demo@purvaguard.in', name: 'AI Analyst', role: 'ANALYST', status: 'ACTIVE' } })

  const statesSeen = new Map<string, string>()
  const regionMap = new Map<string, string>()
  for (const r of REGIONS) {
    if (!statesSeen.has(r.state)) {
      const stateRegion = await db.region.create({ data: { regionType: 'STATE', canonicalName: r.state, localName: r.state, lat: r.lat, lng: r.lng, coverageStatus: 'DATA_CONNECTED' } })
      statesSeen.set(r.state, stateRegion.id)
    }
    const locality = await db.region.create({
      data: {
        parentId: statesSeen.get(r.state)!,
        regionType: r.regionType,
        canonicalName: `${r.name}, ${r.state}`,
        localName: r.localName,
        defaultLanguage: r.lang,
        lat: r.lat,
        lng: r.lng,
        coverageStatus: 'DEMO',
        boundarySource: 'Survey of India (demo)',
      },
    })
    regionMap.set(`${r.name}, ${r.state}`, locality.id)
  }

  const sources = [
    { name: 'IMD Weather Forecast (DEMO)', sourceType: 'WEATHER', provider: 'India Meteorological Dept', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 5 * 60000) },
    { name: 'Rainfall Grid (DEMO)', sourceType: 'RAINFALL', provider: 'IMD / GPM proxy', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 3 * 60000) },
    { name: 'River Gauge — Testbed (DEMO)', sourceType: 'RIVER', provider: 'CWC proxy', simulationMode: true, healthStatus: 'DEGRADED', lastSuccessAt: new Date(Date.now() - 40 * 60000), lastErrorMessage: 'Telemetry lag > 30 min' },
    { name: 'GSI Landslide Susceptibility (DEMO)', sourceType: 'OFFICIAL_FEED', provider: 'Geological Survey of India', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 90 * 60000) },
    { name: 'OpenStreetMap Base', sourceType: 'MAP', provider: 'OSM Contributors', simulationMode: false, healthStatus: 'HEALTHY', lastSuccessAt: new Date() },
    { name: 'NDMA Sachet (DEMO)', sourceType: 'OFFICIAL_FEED', provider: 'NDMA', simulationMode: true, healthStatus: 'HEALTHY', lastSuccessAt: new Date(Date.now() - 12 * 60000) },
  ]
  for (const s of sources) await db.dataSource.create({ data: s })

  for (const r of REGIONS) {
    const rain = Math.round(Math.random() * 80 + 10)
    await db.weatherObservation.create({
      data: {
        regionId: regionMap.get(`${r.name}, ${r.state}`),
        stationName: `WS-${r.name.slice(0, 4).toUpperCase()}`,
        lat: r.lat,
        lng: r.lng,
        observedAt: new Date(Date.now() - 8 * 60000),
        rainfall24hMm: rain,
        rainfall1hMm: Math.round(rain / 12),
        temperatureC: Math.round((15 + Math.random() * 15) * 10) / 10,
        humidityPct: Math.round(60 + Math.random() * 35),
        windKph: Math.round(5 + Math.random() * 25),
        demoLabel: true,
      },
    })
  }

  const facilityTemplates = [
    { type: 'SHELTER', name: 'Govt Primary School Shelter' },
    { type: 'HOSPITAL', name: 'District Hospital' },
    { type: 'RELIEF_CENTER', name: 'Community Relief Centre' },
    { type: 'POLICE_STATION', name: 'Police Station' },
    { type: 'ASSEMBLY_POINT', name: 'Town Hall Assembly Point' },
  ]
  for (const r of REGIONS.slice(0, 10)) {
    const n = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < n; i++) {
      const t = facilityTemplates[Math.floor(Math.random() * facilityTemplates.length)]
      const cap = 50 + Math.floor(Math.random() * 300)
      await db.facility.create({
        data: {
          facilityType: t.type,
          name: `${t.name} — ${r.name}`,
          regionId: regionMap.get(`${r.name}, ${r.state}`),
          lat: r.lat + (Math.random() - 0.5) * 0.04,
          lng: r.lng + (Math.random() - 0.5) * 0.04,
          address: `${r.name}, ${r.state}`,
          phone: '+91-XXXXX-XXXXX (demo)',
          capacity: cap,
          availableUnits: Math.floor(cap * (0.3 + Math.random() * 0.6)),
          accessibility: JSON.stringify({ wheelchair: Math.random() > 0.5, power: true, water: true }),
          hours: '24x7',
          status: Math.random() > 0.85 ? 'FULL' : 'OPEN',
          verifiedAt: new Date(Date.now() - Math.random() * 86400000),
          source: 'District administration (demo)',
        },
      })
    }
  }

  for (const r of REGIONS.slice(0, 8)) {
    await db.hazardZone.create({
      data: {
        regionId: regionMap.get(`${r.name}, ${r.state}`),
        hazardType: Math.random() > 0.5 ? 'LANDSLIDE' : 'FLASH_FLOOD',
        name: `${r.name} susceptibility zone`,
        lat: r.lat + (Math.random() - 0.5) * 0.03,
        lng: r.lng + (Math.random() - 0.5) * 0.03,
        radiusKm: 2 + Math.random() * 3,
        baselineLevel: ['ADVISORY', 'WATCH', 'WARNING'][Math.floor(Math.random() * 3)],
        source: 'GSI susceptibility (demo)',
      },
    })
  }

  for (const r of REGIONS.slice(0, 10)) {
    const score = Math.round(Math.random() * 100)
    const level = score > 75 ? 'VERY_HIGH' : score > 55 ? 'HIGH' : score > 35 ? 'MODERATE' : 'LOW'
    await db.riskPrediction.create({
      data: {
        regionId: regionMap.get(`${r.name}, ${r.state}`),
        lat: r.lat,
        lng: r.lng,
        hazardType: Math.random() > 0.5 ? 'LANDSLIDE' : 'FLASH_FLOOD',
        horizonMinutes: 360,
        riskLevel: level,
        riskScore: score,
        confidence: Math.round((0.55 + Math.random() * 0.35) * 100) / 100,
        dataCoveragePct: Math.round(60 + Math.random() * 35),
        topFeatures: JSON.stringify([
          { feature: '24h rainfall', contribution: Math.round(Math.random() * 40 + 20), value: `${Math.round(Math.random() * 80)}mm` },
          { feature: 'antecedent wetness', contribution: Math.round(Math.random() * 25 + 10), value: 'high' },
          { feature: 'slope class', contribution: Math.round(Math.random() * 20 + 8), value: '35-45°' },
          { feature: 'land cover', contribution: Math.round(Math.random() * 12 + 4), value: 'sparse' },
        ]),
        inputSnapshot: JSON.stringify({ modelVersion: 'purvaguard-baseline-v1', stale: false }),
        expiresAt: new Date(Date.now() + 6 * 3600000),
        simulationMode: true,
      },
    })
  }

  const alertTemplates = [
    { type: 'FLASH_FLOOD', severity: 'WARNING', title: 'Flash Flood Warning — Teesta basin', body: 'Intense rainfall over the Teesta catchment is likely to cause rapid water level rise. Avoid riverbanks and low-lying crossings. Move to higher ground if advised by local authorities.', issuer: 'District Disaster Management Authority (demo)' },
    { type: 'LANDSLIDE', severity: 'WATCH', title: 'Landslide Watch — hill road corridors', body: 'Saturated slopes along NH-10 are at elevated risk of debris flow. Travelers should avoid night movement and follow traffic advisories.', issuer: 'GSI / State Authority (demo)' },
    { type: 'HEAVY_RAIN', severity: 'ADVISORY', title: 'Heavy Rain Advisory', body: 'IMD (demo) forecasts 80-110mm rainfall in the next 24 hours. Secure household items, clear drains, and keep emergency contacts ready.', issuer: 'IMD (demo)' },
    { type: 'ROAD_BLOCK', severity: 'WARNING', title: 'Road Blockage — NH-10 near Mangan', body: 'Reported debris on NH-10 between Mangan and Chungthang. Use alternate route via Dikchu where available. Confirm with local transport authority.', issuer: 'District Operator (demo)' },
    { type: 'EARTHQUAKE', severity: 'INFORMATIONAL', title: 'Reported seismic event — felt moderately', body: 'A reported seismic event was felt in the region. No damage confirmed at this time. Await official bulletin from authorities.', issuer: 'Platform (reported event)' },
  ]
  for (let i = 0; i < alertTemplates.length; i++) {
    const t = alertTemplates[i]
    const r = REGIONS[i % REGIONS.length]
    const alert = await db.alert.create({
      data: {
        alertType: t.type,
        issuerType: i === 0 ? 'OFFICIAL' : i === 4 ? 'COMMUNITY' : 'PLATFORM',
        issuerName: t.issuer,
        title: t.title,
        body: t.body,
        severity: t.severity,
        modelRiskLevel: t.type === 'LANDSLIDE' ? 'HIGH' : t.type === 'FLASH_FLOOD' ? 'VERY_HIGH' : 'MODERATE',
        confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
        lat: r.lat,
        lng: r.lng,
        radiusKm: 15,
        issuedAt: new Date(Date.now() - (i + 1) * 30 * 60000),
        validFrom: new Date(Date.now() - (i + 1) * 30 * 60000),
        expiresAt: new Date(Date.now() + (12 - i) * 3600000),
        status: 'ACTIVE',
        verificationStatus: i === 0 ? 'OFFICIAL' : i === 4 ? 'COMMUNITY' : i === 3 ? 'DISTRICT_VERIFIED' : 'PLATFORM',
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
  await db.alert.create({
    data: {
      alertType: 'LANDSLIDE', issuerType: 'PLATFORM', issuerName: 'Platform (demo)', title: 'Landslide Advisory — cleared', body: 'A previous landslide advisory for Joshimath has expired after verification.', severity: 'ADVISORY', lat: 30.554, lng: 79.565, radiusKm: 10, issuedAt: new Date(Date.now() - 72 * 3600000), validFrom: new Date(Date.now() - 72 * 3600000), expiresAt: new Date(Date.now() - 24 * 3600000), status: 'EXPIRED', verificationStatus: 'PLATFORM', simulationMode: true,
    },
  })

  const sosTemplates = [
    { type: 'SOS', lat: 27.5, lng: 88.55, desc: 'Family stranded near swollen stream, water rising. 4 people, 1 elderly.', priority: 'CRITICAL', needs: JSON.stringify(['rescue', 'medical']) },
    { type: 'SOS', lat: 30.56, lng: 79.55, desc: 'Road blocked by debris, vehicle unable to move. 2 people.', priority: 'HIGH', needs: JSON.stringify(['transport']) },
    { type: 'LANDSLIDE', lat: 27.49, lng: 88.53, desc: 'Fresh landslide debris on approach road. No injuries reported yet.', priority: 'HIGH' },
    { type: 'FLOOD', lat: 26.15, lng: 91.74, desc: 'Water entering ground-floor homes near the embankment.', priority: 'HIGH' },
    { type: 'ROAD_BLOCK', lat: 31.7, lng: 76.53, desc: 'Fallen tree blocking highway lane. Single lane passable.', priority: 'NORMAL' },
    { type: 'CRACK', lat: 30.55, lng: 79.57, desc: 'New ground cracks observed near residential terrace.', priority: 'HIGH' },
  ]
  for (let i = 0; i < sosTemplates.length; i++) {
    const t = sosTemplates[i]
    const statuses = ['NEW', 'TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED']
    const status = statuses[Math.min(i, statuses.length - 1)]
    const code = `PG-2026-${String(i + 1).padStart(3, '0')}`
    const inc = await db.incident.create({
      data: {
        incidentCode: code,
        incidentType: t.type,
        priority: t.priority,
        status,
        description: t.desc,
        lat: t.lat, lng: t.lng,
        locationAccuracyM: 25 + Math.random() * 40,
        locationCapturedAt: new Date(Date.now() - (i + 1) * 20 * 60000),
        locationKind: i % 3 === 0 ? 'LAST_KNOWN' : 'GPS',
        peopleCount: 1 + Math.floor(Math.random() * 5),
        needs: t.needs ?? null,
        reporterUserId: i % 2 === 0 ? resident.id : null,
        reporterContact: i % 2 === 1 ? '+91-XXXXX-XXXXX (demo)' : null,
        verificationStatus: status === 'RESOLVED' || status === 'RESPONDING' ? 'VERIFIED' : 'UNVERIFIED',
        assignedTeamId: status === 'ASSIGNED' || status === 'RESPONDING' ? 'team-field-unit-1' : null,
        simulationMode: true,
        closedAt: status === 'RESOLVED' ? new Date(Date.now() - 30 * 60000) : null,
      },
    })
    await db.incidentEvent.create({ data: { incidentId: inc.id, actorId: operator.id, eventType: 'CREATED', toStatus: 'NEW', note: 'Incident reported via platform', createdAt: inc.createdAt } })
    if (['TRIAGED', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'RESOLVED'].includes(status)) {
      await db.incidentEvent.create({ data: { incidentId: inc.id, actorId: operator.id, eventType: 'STATUS_CHANGE', fromStatus: 'NEW', toStatus: 'TRIAGED', note: 'Triage category assigned', createdAt: new Date(inc.createdAt.getTime() + 5 * 60000) } })
    }
    if (['ASSIGNED', 'RESPONDING', 'RESOLVED'].includes(status)) {
      await db.incidentAssignment.create({ data: { incidentId: inc.id, volunteerId: volunteer.id, assignedBy: operator.id, acceptedAt: new Date(inc.createdAt.getTime() + 10 * 60000), status: status === 'RESOLVED' ? 'COMPLETED' : 'CHECKED_IN' } })
    }
    if (t.type === 'SOS') {
      await db.notificationDelivery.create({ data: { incidentId: inc.id, recipient: 'district-ops-queue', channel: 'IN_APP', provider: 'purvaguard-queue', status: 'ACKNOWLEDGED', sentAt: inc.createdAt, deliveredAt: inc.createdAt, simulationMode: true } })
    }
  }

  const reportTemplates = [
    { category: 'LANDSLIDE', desc: 'Minor debris flow on link road, passable on foot.', lat: 27.49, lng: 88.53, sev: 'HIGH', status: 'UNDER_REVIEW' },
    { category: 'FLOOD', desc: 'Stream water level rose quickly overnight.', lat: 26.14, lng: 91.74, sev: 'HIGH', status: 'VERIFIED' },
    { category: 'FALLEN_TREE', desc: 'Large tree fallen across village path.', lat: 31.71, lng: 76.54, sev: 'MODERATE', status: 'RECEIVED' },
    { category: 'CRACK', desc: 'Cracks widening on retaining wall near school.', lat: 30.55, lng: 79.57, sev: 'HIGH', status: 'VERIFIED' },
    { category: 'ROAD_BLOCK', desc: 'Boulders on highway near hairpin bend.', lat: 32.24, lng: 77.19, sev: 'MODERATE', status: 'RESOLVED' },
  ]
  for (const r of reportTemplates) {
    await db.communityReport.create({
      data: {
        category: r.category, description: r.desc, lat: r.lat, lng: r.lng, severity: r.sev, status: r.status, reporterUserId: resident.id, verificationStatus: r.status === 'VERIFIED' ? 'VERIFIED' : 'UNVERIFIED', simulationMode: true, observedAt: new Date(Date.now() - Math.random() * 86400000),
      },
    })
  }

  await db.volunteerProfile.create({
    data: {
      userId: volunteer.id, skills: 'first-aid,search-rescue,translation', languages: 'en,hi,ne', serviceRegions: 'Sikkim;Uttarakhand', availabilityStatus: 'AVAILABLE', verificationStatus: 'VERIFIED', approvedBy: admin.id, approvedAt: new Date(Date.now() - 7 * 86400000), equipment: JSON.stringify({ firstAidKit: true }), vehicle: JSON.stringify({ type: '4x4', capacity: 4 }), training: JSON.stringify({ ndrfBasic: true }),
    },
  })
  const tasks = [
    { title: 'Welfare check — elderly residents near Mangan', type: 'WELFARE_CHECK', lat: 27.49, lng: 88.53, skills: 'first-aid', status: 'IN_PROGRESS' },
    { title: 'Supply distribution — relief centre Guwahati', type: 'SUPPLY', lat: 26.14, lng: 91.74, skills: '', status: 'OPEN' },
    { title: 'Translation support — Nepali/Hindi', type: 'TRANSLATION', lat: 27.33, lng: 88.6, skills: 'translation', status: 'OPEN' },
  ]
  for (const t of tasks) {
    const task = await db.responseTask.create({ data: { title: t.title, taskType: t.type, description: `${t.title}. Coordinator-assigned task with safety constraints.`, lat: t.lat, lng: t.lng, requiredSkills: t.skills, status: t.status, coordinatorId: operator.id, startAt: new Date(), safetyConstraints: JSON.stringify({ restrictedZone: false }) } })
    if (t.status === 'IN_PROGRESS') {
      await db.taskAssignment.create({ data: { taskId: task.id, volunteerId: volunteer.id, status: 'CHECKED_IN', acceptedAt: new Date(Date.now() - 30 * 60000), checkinAt: new Date(Date.now() - 15 * 60000) } })
    }
  }

  const news = [
    { title: 'IMD forecasts intense rainfall over sub-Himalayan West Bengal & Sikkim', summary: 'A low-pressure system is expected to bring heavy to very heavy rainfall over the next 48 hours across the Teesta basin.', publisher: 'Weather Desk (demo)', url: 'https://example.com/imd-rain', cat: 'WEATHER', pinned: true },
    { title: 'GSI releases updated landslide susceptibility map for Chamoli district', summary: 'The revised baseline identifies several new high-susceptibility pockets near Joshimath.', publisher: 'Geology Desk (demo)', url: 'https://example.com/gsi-map', cat: 'GEOLOGY' },
    { title: 'District administration opens additional shelter in Mangan', summary: 'Capacity expanded ahead of monsoon activation; residents in low-lying areas advised to register.', publisher: 'Local Bulletin (demo)', url: 'https://example.com/shelter', cat: 'ADMIN' },
    { title: 'NH-10 traffic advisory issued for night movement', summary: 'Authorities discourage night travel on vulnerable hill stretches until debris clearance is verified.', publisher: 'Transport Desk (demo)', url: 'https://example.com/nh10', cat: 'TRANSPORT' },
  ]
  for (const n of news) {
    await db.newsItem.create({
      data: {
        title: n.title, summary: n.summary, publisher: n.publisher, sourceUrl: n.url, publishedAt: new Date(Date.now() - Math.random() * 86400000), fetchedAt: new Date(Date.now() - Math.random() * 3600000), categories: n.cat, language: 'en', status: 'PUBLISHED', pinned: n.pinned ?? false, demoLabel: true, authorId: admin.id, regionId: regionMap.get('Mangan, Sikkim'),
      },
    })
  }

  const pages = [
    { slug: 'landslide-before-during-after', title: 'Landslides — Before / During / After', hazard: 'LANDSLIDE', body: `# Landslides — Before / During / After\n\n## Before\n- Know your area's risk and history of landslides.\n- Watch for warning signs: new ground cracks, tilting trees or poles, unusual water seepage, sudden stream changes.\n- Prepare an emergency kit and family communication plan.\n- Keep drains clear and avoid cutting into slopes.\n\n## During\n- If you suspect movement, move away from the slope immediately — do not delay.\n- Move to higher, stable ground; avoid riverbanks and the base of steep slopes.\n- If driving, stop away from the slide area; do not cross a debris flow.\n\n## After\n- Stay away until authorities confirm it is safe.\n- Check for trapped or injured people; report via SOS only when safe.\n- Watch for secondary slides, broken utilities, and flooded drainage.\n\n> Always follow instructions from local authorities and on-ground responders. This guidance is general preparedness, not a guarantee of safety.` },
    { slug: 'flash-flood-guide', title: 'Flash Floods — Safety Guide', hazard: 'FLASH_FLOOD', body: `# Flash Floods — Safety Guide\n\n- Never cross flowing water, even if it looks shallow. As little as 15cm of moving water can knock you over.\n- Move to higher ground immediately when advised; do not wait for an official order if water is rising rapidly.\n- Avoid riverbanks, low bridges, and underpasses during heavy rain.\n- Keep a "go-bag" with documents, medication, and water ready.\n\n> "Turn Around Don't Drown" — follow local authority instructions.` },
    { slug: 'earthquake-guide', title: 'Earthquake — Drop, Cover, Hold On', hazard: 'EARTHQUAKE', body: `# Earthquake Safety\n\n## During shaking\n- DROP to the ground.\n- Take COVER under a sturdy desk or against an interior wall; protect your head and neck.\n- HOLD ON until shaking stops.\n\n## After shaking\n- Move carefully; expect aftershocks.\n- Check yourself and others for injuries.\n- If you are in a landslide-prone area, be alert for slope movement after the quake.` },
    { slug: 'household-emergency-kit', title: 'Household Emergency Kit Checklist', hazard: 'GENERAL', body: `# Household Emergency Kit\n\n- Water (3 litres/person/day for 3 days)\n- Non-perishable food\n- First-aid kit and essential medicines\n- Torch + extra batteries\n- Power bank / phone charger\n- Copies of ID and important documents (waterproof bag)\n- Whistle, rope, basic tools\n- Cash (small denominations)\n- Local emergency contact list` },
    { slug: 'family-communication-plan', title: 'Family Communication Plan', hazard: 'GENERAL', body: `# Family Communication Plan\n\n- Identify an out-of-area contact person (often easier to reach during local congestion).\n- Share the contact number with every family member.\n- Agree on a meeting point if separated.\n- Teach children how and when to call emergency services.\n- Save the numbers offline.` },
  ]
  for (const p of pages) {
    await db.contentPage.create({ data: { slug: p.slug, title: p.title, body: p.body, contentType: 'BEFORE_DURING_AFTER', hazardType: p.hazard, language: 'en', status: 'PUBLISHED', reviewedBy: admin.id, reviewedAt: new Date(), nextReviewAt: new Date(Date.now() + 180 * 86400000), authorId: admin.id } })
  }

  await db.trustedContact.create({ data: { userId: resident.id, name: 'Family Member (demo)', relationship: 'spouse', phone: '+91-XXXXX-XXXXX' } })
  await db.userSavedArea.create({ data: { userId: resident.id, label: 'Home — Mangan', regionId: regionMap.get('Mangan, Sikkim'), lat: 27.494, lng: 88.533, isDefault: true } })
  await db.subscription.create({ data: { userId: resident.id, regionId: regionMap.get('Mangan, Sikkim'), label: 'Mangan alerts', hazards: 'LANDSLIDE,FLASH_FLOOD,HEAVY_RAIN', channels: 'IN_APP', soundEnabled: false } })

  await db.systemSetting.create({ data: { key: 'branding.productName', value: JSON.stringify('PurvaGuard AI') } })
  await db.systemSetting.create({ data: { key: 'demo.simulationMode', value: JSON.stringify(true) } })
  await db.systemSetting.create({ data: { key: 'map.defaultExtent', value: JSON.stringify({ minLat: 23, maxLat: 35, minLng: 76, maxLng: 96 }) } })

  console.log(`✅ Seed complete.`)
  console.log(`   Regions: ${REGIONS.length}`)
  console.log(`   Demo users: admin / district.operator / state.operator / volunteer / resident / analyst @purvaguard.in`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
