import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchSachetAlerts } from '@/lib/sachet-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for external feed fetching

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const url = new URL(request.url)
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit')) || 25))

    console.log(`[api/alerts/ingest] Starting official SACHET sync (limit=${limit})...`)

    // 1. Fetch genuine alerts from official NDMA SACHET feeds
    const sachetAlerts = await fetchSachetAlerts({ limit })

    if (sachetAlerts.length === 0) {
      // Record health status in DataSource
      await db.dataSource.upsert({
        where: { id: 'source-ndma-sachet' },
        update: {
          lastErrorAt: new Date(),
          lastErrorMessage: 'Official SACHET feed returned 0 active alert items',
          healthStatus: 'DEGRADED',
          updatedAt: new Date(),
        },
        create: {
          id: 'source-ndma-sachet',
          name: 'NDMA SACHET Disaster Alert Feed',
          sourceType: 'OFFICIAL_FEED',
          provider: 'National Disaster Management Authority (C-DOT / NDMA)',
          refreshIntervalMinutes: 15,
          enabled: true,
          healthStatus: 'DEGRADED',
          lastErrorAt: new Date(),
          lastErrorMessage: 'Official SACHET feed returned 0 active alert items',
          simulationMode: false,
        },
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Official NDMA SACHET feed was reached, but no active warnings were present in the feed at this moment.',
        fetched: 0,
        inserted: 0,
        updated: 0,
      })
    }

    let inserted = 0
    let updated = 0
    const now = new Date()

    // 2. Upsert each alert into Supabase Alert table
    for (const item of sachetAlerts) {
      const alertId = `sachet-${item.guid}`
      const isExpired = item.expiresAt.getTime() < now.getTime()
      const status = isExpired ? 'EXPIRED' : 'ACTIVE'

      // Check if alert already exists
      const existing = await db.alert.findUnique({
        where: { id: alertId },
        select: { id: true, verificationStatus: true, simulationMode: true },
      })

      if (existing) {
        // Update existing alert status / expiry
        await db.alert.update({
          where: { id: alertId },
          data: {
            status,
            expiresAt: item.expiresAt,
            updatedAt: now,
          },
        })
        updated++
      } else {
        // Insert genuine official alert
        await db.alert.create({
          data: {
            id: alertId,
            alertType: item.alertType,
            issuerType: 'OFFICIAL',
            issuerName: item.issuerName,
            title: item.title,
            body: item.description || item.headline || item.title,
            severity: item.severity,
            modelRiskLevel: item.severity === 'EMERGENCY' ? 'VERY_HIGH' : item.severity === 'WARNING' ? 'HIGH' : 'MODERATE',
            confidence: 0.98, // Official authoritative verification
            sourceUrl: item.sourceUrl,
            radiusKm: 15,
            issuedAt: item.publishedAt,
            validFrom: item.publishedAt,
            expiresAt: item.expiresAt,
            status,
            verificationStatus: 'OFFICIAL', // Authoritative badge
            languages: 'en,hi',
            simulationMode: false, // 100% genuine official alert
            version: 1,
          },
        })
        inserted++
      }

      // Also mirror into NewsItem so public News section is populated with genuine official bulletins
      const newsId = `news-${alertId}`
      try {
        await db.newsItem.upsert({
          where: { id: newsId },
          update: {
            title: item.title,
            summary: item.description || item.headline || item.title,
            publishedAt: item.publishedAt,
            fetchedAt: now,
          },
          create: {
            id: newsId,
            title: item.title,
            summary: item.description || item.headline || item.title,
            publisher: item.issuerName,
            sourceUrl: item.sourceUrl,
            sourceWebsite: item.sourceWebsite,
            publishedAt: item.publishedAt,
            fetchedAt: now,
            categories: item.rawCategory || 'WEATHER',
            language: 'en',
            status: 'PUBLISHED',
            pinned: item.severity === 'EMERGENCY' || item.severity === 'WARNING',
            demoLabel: false, // Real news
          },
        })
      } catch (err: any) {
        console.warn(`[alerts/ingest] Warning mirroring news item:`, err.message)
      }
    }

    // 3. Update DataSource tracking health in Supabase
    await db.dataSource.upsert({
      where: { id: 'source-ndma-sachet' },
      update: {
        lastSuccessAt: now,
        lastErrorAt: null,
        lastErrorMessage: null,
        healthStatus: 'HEALTHY',
        updatedAt: now,
      },
      create: {
        id: 'source-ndma-sachet',
        name: 'NDMA SACHET Disaster Alert Feed',
        sourceType: 'OFFICIAL_FEED',
        provider: 'National Disaster Management Authority (C-DOT / NDMA)',
        refreshIntervalMinutes: 15,
        enabled: true,
        healthStatus: 'HEALTHY',
        lastSuccessAt: now,
        simulationMode: false,
      },
    }).catch(() => {})

    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      provider: 'NDMA SACHET (Common Alerting Protocol)',
      durationMs,
      fetched: sachetAlerts.length,
      inserted,
      updated,
      sample: sachetAlerts.slice(0, 3).map((a) => ({
        id: `sachet-${a.guid}`,
        title: a.title,
        severity: a.severity,
        issuer: a.issuerName,
        sourceUrl: a.sourceUrl,
        publishedAt: a.publishedAt,
        expiresAt: a.expiresAt,
      })),
    })
  } catch (error: any) {
    console.error('[api/alerts/ingest POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest NDMA SACHET alerts',
        detail: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const officialCount = await db.alert.count({
      where: { issuerType: 'OFFICIAL' },
    })
    const latestOfficial = await db.alert.findMany({
      where: { issuerType: 'OFFICIAL' },
      orderBy: { issuedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        severity: true,
        issuerName: true,
        issuedAt: true,
        sourceUrl: true,
        status: true,
      },
    })

    return NextResponse.json({
      service: 'NDMA SACHET Alert Ingestion Service',
      status: 'READY',
      officialAlertsInDb: officialCount,
      latestOfficial,
      usage: 'Send POST /api/alerts/ingest to trigger live synchronization with official SACHET feeds.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
