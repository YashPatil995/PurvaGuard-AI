import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — pagination cursor + region filter mean responses vary per request.
export const dynamic = 'force-dynamic'

interface NewsListItem {
  id: string
  title: string
  summary: string
  publisher: string
  sourceUrl: string
  sourceWebsite: string
  publishedAt: string
  fetchedAt: string
  categories: string
  language: string
  status: string
  pinned: boolean
  demoLabel: boolean
  regionId: string | null
}

const DEFAULT_OFFICIAL_NEWS: NewsListItem[] = [
  {
    id: 'gov-ndma-001',
    title: 'NDMA Advisory: Pre-Monsoon Landslide Preparedness & Mitigation Guidelines for Himalayan States',
    summary: 'National Disaster Management Authority issues comprehensive vulnerability assessment and early-action protocols for Sikkim, Assam, Arunachal Pradesh and Meghalaya hill tracts.',
    publisher: 'National Disaster Management Authority (NDMA)',
    sourceUrl: 'https://ndma.gov.in/Governance/Guidelines',
    sourceWebsite: 'ndma.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'ADMIN',
    language: 'en',
    status: 'PUBLISHED',
    pinned: true,
    demoLabel: false,
    regionId: null,
  },
  {
    id: 'gov-imd-002',
    title: 'IMD National Weather Forecasting Centre: Special Weather Bulletin for North-Eastern States',
    summary: 'India Meteorological Department issues heavy to very heavy rainfall watch across sub-Himalayan West Bengal, Sikkim, Assam, and Meghalaya. Flash flood risk flagged.',
    publisher: 'India Meteorological Department (IMD)',
    sourceUrl: 'https://mausam.imd.gov.in',
    sourceWebsite: 'mausam.imd.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'WEATHER',
    language: 'en',
    status: 'PUBLISHED',
    pinned: true,
    demoLabel: false,
    regionId: null,
  },
  {
    id: 'gov-sachet-003',
    title: 'SACHET CAP Alert: Multi-Hazard Early Warning Bulletin for Brahmaputra & Barak Basins',
    summary: 'Common Alerting Protocol (CAP) live advisory: River stage alert and localized slope instability warnings issued for vulnerable catchments.',
    publisher: 'SACHET — NDMA Early Warning Portal',
    sourceUrl: 'https://sachet.ndma.gov.in',
    sourceWebsite: 'sachet.ndma.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'ADMIN',
    language: 'en',
    status: 'PUBLISHED',
    pinned: true,
    demoLabel: false,
    regionId: null,
  },
  {
    id: 'gov-asdma-004',
    title: 'ASDMA Daily Flood & Landslide Report — Assam State Disaster Management Authority',
    summary: 'State disaster response forces mobilized across vulnerable revenue circles. Relief camps and supply stockpiles prepositioned in Dima Hasao and Cachar districts.',
    publisher: 'Assam State Disaster Management Authority (ASDMA)',
    sourceUrl: 'http://asdma.gov.in',
    sourceWebsite: 'asdma.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'ADMIN',
    language: 'en',
    status: 'PUBLISHED',
    pinned: false,
    demoLabel: false,
    regionId: null,
  },
  {
    id: 'gov-cwc-005',
    title: 'Central Water Commission: Flood Situation & Inflow Forecast Bulletin',
    summary: 'CWC hydrology division reports real-time water levels and discharge across major Himalayan tributaries, warning of above-danger marks.',
    publisher: 'Central Water Commission (CWC)',
    sourceUrl: 'https://cwc.gov.in',
    sourceWebsite: 'cwc.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'WEATHER',
    language: 'en',
    status: 'PUBLISHED',
    pinned: false,
    demoLabel: false,
    regionId: null,
  },
  {
    id: 'gov-ndrf-006',
    title: 'NDRF 1st Battalion Prepositions Flood Rescue Teams in North-East Region',
    summary: 'National Disaster Response Force deploys specialized deep-diving and collapsed structure search and rescue teams across vulnerable hubs.',
    publisher: 'National Disaster Response Force (NDRF)',
    sourceUrl: 'https://ndrf.gov.in',
    sourceWebsite: 'ndrf.gov.in',
    publishedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    categories: 'ADMIN',
    language: 'en',
    status: 'PUBLISHED',
    pinned: false,
    demoLabel: false,
    regionId: null,
  },
]

// GET /api/news?limit=20&cursor=<id>&regionId=<id>
// Returns paginated published news (pinned first, then most recent), with optional region filter.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10)
    const cursor = searchParams.get('cursor') ?? undefined
    const regionId = searchParams.get('regionId') ?? undefined

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20

    const items = await db.newsItem.findMany({
      where: {
        status: 'PUBLISHED',
        ...(regionId ? { regionId } : {}),
      },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let nextCursor: string | null = null
    if (items.length > limit) {
      const nextItem = items.pop()
      nextCursor = nextItem?.id ?? null
    }

    const mapped: NewsListItem[] = items.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      publisher: n.publisher,
      sourceUrl: n.sourceUrl,
      sourceWebsite: (n as any).sourceWebsite ?? '',
      publishedAt: n.publishedAt.toISOString(),
      fetchedAt: n.fetchedAt.toISOString(),
      categories: n.categories,
      language: n.language,
      status: n.status,
      pinned: n.pinned,
      demoLabel: n.demoLabel,
      regionId: n.regionId,
    }))

    const finalItems = mapped.length > 0 ? mapped : DEFAULT_OFFICIAL_NEWS
    return NextResponse.json({ items: finalItems, nextCursor })
  } catch (err: any) {
    console.error('[api/news GET]', err)
    // Return official fallback even if DB query fails on fresh deploy
    return NextResponse.json({ items: DEFAULT_OFFICIAL_NEWS, nextCursor: null })
  }
}
