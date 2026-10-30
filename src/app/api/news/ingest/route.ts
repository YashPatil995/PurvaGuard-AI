import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { XMLParser } from 'fast-xml-parser'

// PurvaGuard AI — Real News Ingestion Pipeline
//
// SOURCE: Google News RSS feeds (https://news.google.com/rss/search)
// This is a REAL, LIVE news source — not hardcoded demo data.
//
// The pipeline:
//   1. Fetches RSS XML from Google News for disaster-related keywords in NE India
//   2. Parses the XML (title, link, pubDate, source)
//   3. Deduplicates against existing NewsItem records (by title)
//   4. Stores new items in the NewsItem table with demoLabel=FALSE (real news)
//   5. Returns the count of newly ingested items

const SEARCH_QUERIES = [
  'landslide Sikkim OR Assam OR Arunachal Pradesh',
  'flash flood Assam OR Manipur OR Nagaland',
  'earthquake Northeast India',
  'heavy rainfall Meghalaya OR Mizoram OR Tripura',
  'disaster North East India',
]

interface RssItem {
  title?: string
  link?: string
  pubDate?: string
  source?: string
}

async function fetchRssFeed(url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PurvaGuardAI/1.0 (disaster-intelligence)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(xml)
    const items = parsed?.rss?.channel?.item
    if (!items) return []
    const itemArray = Array.isArray(items) ? items : [items]
    return itemArray.map((item: any) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: item.source?.['#text'] || item.source || 'Google News',
    }))
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const allItems: RssItem[] = []
    const feedUrls = SEARCH_QUERIES.map(
      (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`
    )
    const feeds = await Promise.all(feedUrls.map(fetchRssFeed))
    for (const feed of feeds) allItems.push(...feed)

    // Deduplicate by title (Google News titles include " - Source Name" suffix)
    const seenTitles = new Set<string>()
    const uniqueItems = allItems.filter((item) => {
      if (!item.title) return false
      const cleanTitle = item.title.split(' - ')[0].trim()
      if (seenTitles.has(cleanTitle)) return false
      seenTitles.add(cleanTitle)
      return true
    })

    // Get existing titles from DB to avoid duplicates
    const existingTitles = new Set(
      (await db.newsItem.findMany({ select: { title: true } })).map((n) =>
        n.title.split(' - ')[0].trim()
      )
    )

    let ingested = 0
    let skipped = 0
    const newItems: any[] = []

    for (const item of uniqueItems) {
      const cleanTitle = item.title!.split(' - ')[0].trim()
      const sourceName = item.title!.split(' - ').slice(1).join(' - ') || item.source || 'Google News'

      if (existingTitles.has(cleanTitle)) { skipped++; continue }

      let publishedAt = new Date()
      if (item.pubDate) {
        const parsed = new Date(item.pubDate)
        if (!isNaN(parsed.getTime())) publishedAt = parsed
      }

      const newsItem = await db.newsItem.create({
        data: {
          title: cleanTitle,
          summary: `Live news from ${sourceName}. Click to read the full article.`,
          publisher: sourceName,
          sourceUrl: item.link || '#',
          publishedAt,
          fetchedAt: new Date(),
          categories: 'LIVE_NEWS',
          language: 'en',
          status: 'PUBLISHED',
          pinned: false,
          demoLabel: false, // ← REAL news, not demo
          authorId: null,
        },
      })
      newItems.push(newsItem)
      ingested++
    }

    return NextResponse.json({
      success: true,
      source: 'Google News RSS (https://news.google.com/rss/search)',
      queries: SEARCH_QUERIES,
      fetched: allItems.length,
      unique: uniqueItems.length,
      ingested,
      skipped,
      newItems: newItems.slice(0, 10).map((n) => ({ id: n.id, title: n.title, publisher: n.publisher })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'News ingestion failed', detail: e?.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  return NextResponse.json({
    source: 'Google News RSS',
    feedUrl: 'https://news.google.com/rss/search?q=<query>&hl=en-IN&gl=IN&ceid=IN:en',
    queries: SEARCH_QUERIES,
    description: 'Fetches live disaster-related news from Google News RSS feeds for NE India states.',
  })
}
