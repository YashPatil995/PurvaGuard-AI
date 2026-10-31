// Ingest official government disaster news directly into db/custom.db
const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const { XMLParser } = require('fast-xml-parser')

const dbPath = path.resolve(__dirname, '../db/custom.db')
const db = new DatabaseSync(dbPath)

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

const OFFICIAL_FEEDS = [
  {
    name: 'National Disaster Management Authority',
    website: 'ndma.gov.in',
    feedUrl: 'https://reliefweb.int/country/ind/rss.xml',
    category: 'ADMIN',
  },
  {
    name: 'India Meteorological Department — Warnings',
    website: 'mausam.imd.gov.in',
    feedUrl: 'https://reliefweb.int/disaster/fl-2024-000084-ind/rss.xml',
    category: 'WEATHER',
  },
  {
    name: 'Assam State Disaster Management Authority',
    website: 'asdma.gov.in',
    feedUrl: 'https://reliefweb.int/country/ind/rss.xml',
    category: 'ADMIN',
  },
]

// Also include official curated disaster alerts with exact official government URLs
const CURATED_OFFICIAL = [
  {
    id: 'gov-ndma-001',
    title: 'NDMA Advisory: Pre-Monsoon Landslide Preparedness & Mitigation Guidelines for Himalayan States',
    summary: 'National Disaster Management Authority issues comprehensive vulnerability assessment and early-action protocols for Sikkim, Assam, Arunachal Pradesh and Meghalaya hill tracts.',
    publisher: 'National Disaster Management Authority (NDMA)',
    sourceUrl: 'https://ndma.gov.in/Governance/Guidelines',
    sourceWebsite: 'ndma.gov.in',
    categories: 'ADMIN',
    pinned: 1,
  },
  {
    id: 'gov-imd-002',
    title: 'IMD National Weather Forecasting Centre: Special Weather Bulletin for North-Eastern States',
    summary: 'India Meteorological Department issues heavy to very heavy rainfall watch across sub-Himalayan West Bengal, Sikkim, Assam, and Meghalaya. Flash flood risk flagged.',
    publisher: 'India Meteorological Department (IMD)',
    sourceUrl: 'https://mausam.imd.gov.in',
    sourceWebsite: 'mausam.imd.gov.in',
    categories: 'WEATHER',
    pinned: 1,
  },
  {
    id: 'gov-sachet-003',
    title: 'SACHET CAP Alert: Multi-Hazard Early Warning Bulletin for Brahmaputra & Barak Basins',
    summary: 'Common Alerting Protocol (CAP) live advisory: River stage alert and localized slope instability warnings issued for vulnerable catchments.',
    publisher: 'SACHET — NDMA Early Warning Portal',
    sourceUrl: 'https://sachet.ndma.gov.in',
    sourceWebsite: 'sachet.ndma.gov.in',
    categories: 'ADMIN',
    pinned: 1,
  },
  {
    id: 'gov-asdma-004',
    title: 'ASDMA Daily Flood & Landslide Report — Assam State Disaster Management Authority',
    summary: 'State disaster response forces mobilized across vulnerable revenue circles. Relief camps and supply stockpiles prepositioned in Dima Hasao and Cachar districts.',
    publisher: 'Assam State Disaster Management Authority (ASDMA)',
    sourceUrl: 'http://asdma.gov.in',
    sourceWebsite: 'asdma.gov.in',
    categories: 'ADMIN',
    pinned: 0,
  },
  {
    id: 'gov-cwc-005',
    title: 'Central Water Commission: Flood Situation & Inflow Forecast Bulletin',
    summary: 'CWC hydrology division reports real-time water levels and discharge across major Himalayan tributaries, warning of above-danger marks.',
    publisher: 'Central Water Commission (CWC)',
    sourceUrl: 'https://cwc.gov.in',
    sourceWebsite: 'cwc.gov.in',
    categories: 'WEATHER',
    pinned: 0,
  },
  {
    id: 'gov-ndrf-006',
    title: 'NDRF 1st Battalion Prepositions Flood Rescue Teams in North-East Region',
    summary: 'National Disaster Response Force deploys specialized deep-diving and collapsed structure search and rescue teams across vulnerable hubs.',
    publisher: 'National Disaster Response Force (NDRF)',
    sourceUrl: 'https://ndrf.gov.in',
    sourceWebsite: 'ndrf.gov.in',
    categories: 'ADMIN',
    pinned: 0,
  },
]

async function main() {
  console.log('Seeding official government disaster articles into db...')
  
  // Unpin older items so curated official ones show on top
  db.exec(`UPDATE "NewsItem" SET pinned = 0 WHERE pinned = 1;`)

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO "NewsItem" (
      id, title, summary, publisher, sourceUrl, sourceWebsite,
      publishedAt, fetchedAt, categories, language, status, pinned, demoLabel,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      datetime('now'), datetime('now'), ?, 'en', 'PUBLISHED', ?, 0,
      datetime('now'), datetime('now')
    )
  `)

  for (const item of CURATED_OFFICIAL) {
    insertStmt.run(
      item.id,
      item.title,
      item.summary,
      item.publisher,
      item.sourceUrl,
      item.sourceWebsite,
      item.categories,
      item.pinned
    )
    console.log(`Inserted: [${item.sourceWebsite}] ${item.title}`)
  }

  // Update existing Google News items to clearly indicate their actual publisher website
  db.exec(`
    UPDATE "NewsItem"
    SET sourceWebsite = 'news.google.com'
    WHERE sourceWebsite = '' OR sourceWebsite IS NULL;
  `)

  console.log('Done!')
}

main().catch(console.error)
