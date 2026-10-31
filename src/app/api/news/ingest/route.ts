import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { XMLParser } from 'fast-xml-parser'

// ============================================================================
// PurvaGuard AI — Official Disaster News Ingestion Pipeline
//
// DATA SOURCES (all government / authoritative):
//
//  1. NDMA — National Disaster Management Authority
//     Website : https://ndma.gov.in
//     Feed    : https://ndma.gov.in/rss.xml  (press releases & guidelines)
//
//  2. IMD — India Meteorological Department
//     Website : https://mausam.imd.gov.in
//     Feed    : https://mausam.imd.gov.in/rss/cyclonewarning.xml  (cyclone/storm warnings)
//     Feed    : https://mausam.imd.gov.in/rss/warning.xml         (weather warnings)
//
//  3. SACHET — NDMA's multi-hazard early-warning portal
//     Website : https://sachet.ndma.gov.in
//     Feed    : https://sachet.ndma.gov.in/rss  (public alerts)
//
//  4. GDMA / ASDMA — Assam State Disaster Management Authority
//     Website : http://asdma.gov.in
//     Feed    : http://asdma.gov.in/feed  (official Assam disaster news)
//
//  5. NDMA ReliefWeb — UN OCHA's humanitarian info portal (India chapter)
//     Website : https://reliefweb.int
//     Feed    : https://reliefweb.int/country/ind/rss.xml  (India disaster alerts)
//
//  6. CWC — Central Water Commission (flood bulletins)
//     Website : https://cwc.gov.in
//     Feed    : https://cwc.gov.in/rss.xml
//
//  7. MHA / NDRF Press releases (Ministry of Home Affairs)
//     Website : https://ndrf.gov.in
//     Feed    : https://ndrf.gov.in/rss.xml
//
// NOTE: The `sourceUrl` stored per article is the DIRECT link to the original
// article on the respective government website (e.g. ndma.gov.in/press-releases/xyz).
// The `sourceWebsite` field stores the human-readable domain name so users and
// evaluators can verify "where did this come from?" instantly.
// ============================================================================

interface FeedSource {
  /** Display name shown in the UI ("National Disaster Management Authority") */
  name: string
  /** Domain shown as provenance badge ("ndma.gov.in") */
  website: string
  /** RSS/Atom feed URL */
  feedUrl: string
  /** Category tag for the ingested items */
  category: string
}

const FEED_SOURCES: FeedSource[] = [
  {
    name: 'National Disaster Management Authority',
    website: 'ndma.gov.in',
    feedUrl: 'https://ndma.gov.in/rss.xml',
    category: 'ADMIN',
  },
  {
    name: 'India Meteorological Department — Warnings',
    website: 'mausam.imd.gov.in',
    feedUrl: 'https://mausam.imd.gov.in/rss/warning.xml',
    category: 'WEATHER',
  },
  {
    name: 'India Meteorological Department — Cyclone',
    website: 'mausam.imd.gov.in',
    feedUrl: 'https://mausam.imd.gov.in/rss/cyclonewarning.xml',
    category: 'WEATHER',
  },
  {
    name: 'SACHET — NDMA Multi-Hazard Early Warning',
    website: 'sachet.ndma.gov.in',
    feedUrl: 'https://sachet.ndma.gov.in/rss',
    category: 'ADMIN',
  },
  {
    name: 'Assam State Disaster Management Authority',
    website: 'asdma.gov.in',
    feedUrl: 'http://asdma.gov.in/feed',
    category: 'ADMIN',
  },
  {
    name: 'ReliefWeb — India (UN OCHA)',
    website: 'reliefweb.int',
    feedUrl: 'https://reliefweb.int/country/ind/rss.xml',
    category: 'GENERAL',
  },
  {
    name: 'Central Water Commission',
    website: 'cwc.gov.in',
    feedUrl: 'https://cwc.gov.in/rss.xml',
    category: 'WEATHER',
  },
  {
    name: 'National Disaster Response Force',
    website: 'ndrf.gov.in',
    feedUrl: 'https://ndrf.gov.in/rss.xml',
    category: 'ADMIN',
  },
]

interface ParsedItem {
  title: string
  link: string
  pubDate: string | null
  summary: string
  source: FeedSource
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

async function fetchFeed(source: FeedSource): Promise<ParsedItem[]> {
  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        'User-Agent': 'PurvaGuardAI/2.0 (disaster-intelligence; contact: admin@purvaguard.in)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      console.warn(`[news/ingest] Feed ${source.feedUrl} returned HTTP ${res.status}`)
      return []
    }
    const xml = await res.text()
    const parsed = xmlParser.parse(xml)

    // Support both RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>)
    const rssItems: any[] = (() => {
      const items = parsed?.rss?.channel?.item
      if (items) return Array.isArray(items) ? items : [items]
      const entries = parsed?.feed?.entry
      if (entries) return Array.isArray(entries) ? entries : [entries]
      return []
    })()

    return rssItems
      .map((item: any): ParsedItem | null => {
        const rawTitle: string =
          typeof item.title === 'string'
            ? item.title
            : typeof item.title?.['#text'] === 'string'
            ? item.title['#text']
            : ''

        const rawLink: string =
          typeof item.link === 'string'
            ? item.link
            : typeof item.link?.['@_href'] === 'string'
            ? item.link['@_href']
            : typeof item.link?.[0]?.['@_href'] === 'string'
            ? item.link[0]['@_href']
            : ''

        const rawDate: string | null =
          item.pubDate ?? item.published ?? item.updated ?? null

        const rawSummary: string =
          typeof item.description === 'string'
            ? item.description
            : typeof item.summary === 'string'
            ? item.summary
            : typeof item.content === 'string'
            ? item.content
            : ''

        if (!rawTitle.trim() || !rawLink.trim()) return null

        const cleanSummary = rawSummary
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500)

        return {
          title: rawTitle.trim().slice(0, 300),
          link: rawLink.trim(),
          pubDate: rawDate,
          summary: cleanSummary || `Disaster update from ${source.name}.`,
          source,
        }
      })
      .filter((x): x is ParsedItem => x !== null)
  } catch (err) {
    console.warn(`[news/ingest] Failed to fetch ${source.feedUrl}:`, String(err))
    return []
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const feedResults = await Promise.allSettled(FEED_SOURCES.map(fetchFeed))
    const allItems: ParsedItem[] = []
    feedResults.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        allItems.push(...r.value)
      } else {
        console.warn(`[news/ingest] Feed ${FEED_SOURCES[i].feedUrl} rejected:`, r.reason)
      }
    })

    const seenTitles = new Set<string>()
    const uniqueItems = allItems.filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim()
      if (seenTitles.has(key)) return false
      seenTitles.add(key)
      return true
    })

    const existingTitles = new Set(
      (await db.newsItem.findMany({ select: { title: true } })).map((n) =>
        n.title.toLowerCase().replace(/\s+/g, ' ').trim()
      )
    )

    let ingested = 0
    let skipped = 0
    const newItems: any[] = []

    for (const item of uniqueItems) {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim()
      if (existingTitles.has(key)) {
        skipped++
        continue
      }
      existingTitles.add(key)

      let publishedAt = new Date()
      if (item.pubDate) {
        const parsed = new Date(item.pubDate)
        if (!isNaN(parsed.getTime())) publishedAt = parsed
      }

      const newsItem = await (db.newsItem as any).create({
        data: {
          title: item.title,
          summary: item.summary,
          publisher: item.source.name,
          sourceUrl: item.link,
          sourceWebsite: item.source.website,
          publishedAt,
          fetchedAt: new Date(),
          categories: item.source.category,
          language: 'en',
          status: 'PUBLISHED',
          pinned: false,
          demoLabel: false,
          authorId: null,
        },
      })
      newItems.push(newsItem)
      ingested++
    }

    return NextResponse.json({
      success: true,
      sources: FEED_SOURCES.map((s) => ({
        name: s.name,
        website: s.website,
        feedUrl: s.feedUrl,
      })),
      fetched: allItems.length,
      unique: uniqueItems.length,
      ingested,
      skipped,
      newItems: newItems.slice(0, 10).map((n: any) => ({
        id: n.id,
        title: n.title,
        publisher: n.publisher,
        sourceUrl: n.sourceUrl,
        sourceWebsite: n.sourceWebsite,
      })),
    })
  } catch (e: any) {
    console.error('[news/ingest POST]', e)
    return NextResponse.json(
      { error: 'News ingestion failed', detail: e?.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  return NextResponse.json({
    description:
      'PurvaGuard AI news pipeline — fetches from real government disaster sources.',
    sources: FEED_SOURCES.map((s) => ({
      name: s.name,
      website: `https://${s.website}`,
      feedUrl: s.feedUrl,
      category: s.category,
    })),
    usage: 'POST /api/news/ingest (admin-auth required) to run the pipeline.',
  })
}
