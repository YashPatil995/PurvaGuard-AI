// PurvaGuard AI — Official NDMA SACHET Feed & CAP Parser Client
// Official portal: https://sachet.ndma.gov.in/
// Common Alerting Protocol (CAP v1.2) integration

import { XMLParser } from 'fast-xml-parser'

export interface SachetAlertItem {
  guid: string
  identifier: string
  title: string
  headline: string
  description: string
  instruction: string
  event: string
  alertType: 'LANDSLIDE' | 'FLASH_FLOOD' | 'HEAVY_RAIN' | 'EARTHQUAKE' | 'ROAD_BLOCK' | 'GENERAL'
  severity: 'EMERGENCY' | 'WARNING' | 'WATCH' | 'ADVISORY' | 'INFORMATIONAL'
  urgency?: string
  certainty?: string
  areaDesc: string
  sourceUrl: string
  sourceWebsite: string
  issuerName: string
  publishedAt: Date
  expiresAt: Date
  rawCategory: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
})

function mapEventToHazardType(event: string, title: string): SachetAlertItem['alertType'] {
  const text = `${event} ${title}`.toLowerCase()
  if (text.includes('landslide') || text.includes('debris') || text.includes('rockfall')) return 'LANDSLIDE'
  if (text.includes('flood') || text.includes('inundation') || text.includes('water level')) return 'FLASH_FLOOD'
  if (text.includes('rain') || text.includes('thunderstorm') || text.includes('lightning') || text.includes('squall') || text.includes('cyclone') || text.includes('monsoon')) return 'HEAVY_RAIN'
  if (text.includes('earthquake') || text.includes('seismic') || text.includes('tremor')) return 'EARTHQUAKE'
  if (text.includes('road') || text.includes('block') || text.includes('traffic') || text.includes('highway')) return 'ROAD_BLOCK'
  return 'GENERAL'
}

function mapSeverity(capSeverity?: string, capUrgency?: string): SachetAlertItem['severity'] {
  const sev = (capSeverity || '').toLowerCase()
  const urg = (capUrgency || '').toLowerCase()

  if (sev === 'extreme' || urg === 'immediate') return 'EMERGENCY'
  if (sev === 'severe' || urg === 'expected') return 'WARNING'
  if (sev === 'moderate') return 'WATCH'
  if (sev === 'minor') return 'ADVISORY'
  return 'INFORMATIONAL'
}

/**
 * Fetch and parse official SACHET alerts.
 * Uses official feed: https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml
 * Also optionally queries state feeds (e.g. rss_assam.xml, rss_sikkim.xml, rss_meghalaya.xml).
 */
export async function fetchSachetAlerts(options?: {
  limit?: number
  stateFeeds?: string[]
}): Promise<SachetAlertItem[]> {
  const limit = options?.limit ?? 30
  const feedUrls = [
    'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
    ...(options?.stateFeeds ?? [
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_assam.xml',
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_sikkim.xml',
      'https://sachet.ndma.gov.in/cap_public_website/rss/rss_meghalaya.xml',
    ]),
  ]

  const uniqueRssItems = new Map<string, any>()

  for (const url of feedUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PurvaGuard-AI-DisasterAlert/1.0 (+https://purvaguard.in; disaster-management)',
          'Accept': 'application/xml, text/xml, */*',
        },
        // 10 second timeout per feed
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        console.warn(`[sachet] Feed HTTP ${res.status} from ${url}`)
        continue
      }

      const xmlText = await res.text()
      if (!xmlText || !xmlText.includes('<rss')) continue

      const doc = parser.parse(xmlText)
      const rawItems = doc.rss?.channel?.item ?? []
      const items = Array.isArray(rawItems) ? rawItems : [rawItems]

      for (const item of items) {
        const guid =
          typeof item.guid === 'object' && item.guid !== null
            ? String(item.guid['#text'] ?? '')
            : String(item.guid ?? '')

        if (!guid) continue
        if (!uniqueRssItems.has(guid)) {
          uniqueRssItems.set(guid, item)
        }
      }
    } catch (err: any) {
      console.warn(`[sachet] Error fetching feed ${url}:`, err.message)
    }
  }

  const candidateItems = Array.from(uniqueRssItems.values()).slice(0, limit)
  const results: SachetAlertItem[] = []

  // Process and optionally resolve CAP 1.2 XML detail files
  for (const item of candidateItems) {
    try {
      const guid =
        typeof item.guid === 'object' && item.guid !== null
          ? String(item.guid['#text'] ?? '')
          : String(item.guid ?? '')

      const rawTitle = typeof item.title === 'string' ? item.title.trim() : ''
      const capLink = typeof item.link === 'string' ? item.link.trim() : ''
      const author = typeof item.author === 'string' ? item.author.trim() : ''
      const pubDateStr = item.pubDate ? String(item.pubDate) : null
      const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date()

      // Default issuer clean name
      let issuerName = 'NDMA SACHET'
      if (author) {
        const match = author.match(/\(([^)]+)\)/)
        if (match && match[1]) {
          issuerName = `NDMA SACHET (${match[1]})`
        }
      }

      let headline = rawTitle
      let description = ''
      let instruction = ''
      let event = 'Disaster Alert'
      let capSeverity = 'Moderate'
      let capUrgency = 'Expected'
      let capCertainty = 'Likely'
      let areaDesc = ''
      let expiresAt = new Date(publishedAt.getTime() + 6 * 3600 * 1000) // fallback 6h
      let identifier = guid

      // If CAP Link exists, fetch the authoritative CAP 1.2 XML
      if (capLink && capLink.startsWith('https://sachet.ndma.gov.in')) {
        try {
          const capRes = await fetch(capLink, {
            headers: { 'User-Agent': 'PurvaGuard-AI-DisasterAlert/1.0' },
            signal: AbortSignal.timeout(6000),
          })
          if (capRes.ok) {
            const capXml = await capRes.text()
            const capDoc = parser.parse(capXml)
            const alert = capDoc.alert
            if (alert) {
              if (alert.identifier) identifier = String(alert.identifier)
              const info = Array.isArray(alert.info) ? alert.info[0] : alert.info
              if (info) {
                if (info.headline) headline = String(info.headline).trim()
                if (info.description) description = String(info.description).trim()
                if (info.instruction) instruction = String(info.instruction).trim()
                if (info.event) event = String(info.event).trim()
                if (info.severity) capSeverity = String(info.severity).trim()
                if (info.urgency) capUrgency = String(info.urgency).trim()
                if (info.certainty) capCertainty = String(info.certainty).trim()
                if (info.expires) {
                  const expDate = new Date(info.expires)
                  if (!isNaN(expDate.getTime())) expiresAt = expDate
                }
                if (info.area) {
                  areaDesc = typeof info.area.areaDesc === 'string' ? info.area.areaDesc.trim() : ''
                }
              }
            }
          }
        } catch {
          // If CAP fetch fails or times out, fallback to RSS data safely
        }
      }

      const alertType = mapEventToHazardType(event, headline || rawTitle)
      const severity = mapSeverity(capSeverity, capUrgency)

      results.push({
        guid,
        identifier,
        title: headline || rawTitle || 'Official Disaster Warning',
        headline: headline || rawTitle,
        description: description || rawTitle,
        instruction,
        event,
        alertType,
        severity,
        urgency: capUrgency,
        certainty: capCertainty,
        areaDesc,
        sourceUrl: capLink || 'https://sachet.ndma.gov.in',
        sourceWebsite: 'sachet.ndma.gov.in',
        issuerName,
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
        expiresAt: isNaN(expiresAt.getTime()) ? new Date(Date.now() + 6 * 3600 * 1000) : expiresAt,
        rawCategory: item.category ? String(item.category) : 'Met',
      })
    } catch (err: any) {
      console.warn(`[sachet] Error parsing alert item:`, err.message)
    }
  }

  return results
}
