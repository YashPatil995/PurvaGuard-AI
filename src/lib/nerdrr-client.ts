// PurvaGuard AI — NESAC NER-DRR (North Eastern Regional Node for Disaster Risk Reduction)
// Integration Client for National Centre for Seismology / NESAC Earthquake Observation Stream
// Official Portal: https://nerdrr.gov.in/

import https from 'node:https'

export interface NerdrrEarthquakeItem {
  id: string
  eventId: string
  magnitude: number
  depthKm: number
  latitude: number
  longitude: number
  place: string
  region: string
  state: string | null
  eventTime: Date
  eventUrl: string
  status: string
  source: string
}

const NE_STATES = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
]

function detectNeState(text: string): string | null {
  const lower = text.toLowerCase()
  for (const s of NE_STATES) {
    if (lower.includes(s.toLowerCase())) return s
  }
  return null
}

/**
 * Fetch genuine scientific earthquake observations from NESAC NER-DRR.
 * Endpoint: https://nerdrr.gov.in/tempdbacc/getLastDayEqs.php
 */
export async function fetchNerdrrEarthquakes(options?: {
  onlyNeStates?: boolean
  limit?: number
}): Promise<NerdrrEarthquakeItem[]> {
  const onlyNe = options?.onlyNeStates ?? true
  const limit = options?.limit ?? 50
  const url = 'https://nerdrr.gov.in/tempdbacc/getLastDayEqs.php'

  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        timeout: 9000,
        headers: {
          'User-Agent': 'PurvaGuard-AI-DisasterAnalytics/1.0 (+https://purvaguard.in; NER-DRR)',
          'Accept': 'application/json, text/plain, */*',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.warn(`[nerdrr] Earthquake endpoint returned HTTP ${res.statusCode}`)
          resolve([])
          return
        }

        let rawData = ''
        res.on('data', (chunk) => {
          rawData += chunk
        })

        res.on('end', () => {
          try {
            const rawList = JSON.parse(rawData)
            if (!Array.isArray(rawList)) {
              console.warn('[nerdrr] Response is not an array')
              resolve([])
              return
            }

            const results: NerdrrEarthquakeItem[] = []

            for (const item of rawList) {
              if (!item || typeof item !== 'object') continue
              const place = typeof item.place === 'string' ? item.place.trim() : ''
              const region = typeof item.region === 'string' ? item.region.trim() : ''
              const fullLoc = `${place} ${region}`
              const state = detectNeState(fullLoc)

              if (onlyNe && !state) {
                continue
              }

              const mag = Number(item.mag)
              const lat = Number(item.latitude)
              const lng = Number(item.longitude)
              const depth = Number(item.eqDepth ?? 10)
              const eventId = String(item.eventId || item.id || '')
              const timeStr = item.occurenceTime || item.updateTime
              const eventTime = timeStr ? new Date(timeStr) : new Date()

              if (isNaN(mag) || isNaN(lat) || isNaN(lng) || !eventId) {
                continue
              }

              results.push({
                id: `eq-nerdrr-${item.id || eventId}`,
                eventId,
                magnitude: mag,
                depthKm: isNaN(depth) ? 10 : depth,
                latitude: lat,
                longitude: lng,
                place: place || 'North Eastern Region',
                region: region || state || 'North East India',
                state,
                eventTime: isNaN(eventTime.getTime()) ? new Date() : eventTime,
                eventUrl:
                  typeof item.eventUrl === 'string' && item.eventUrl.startsWith('http')
                    ? item.eventUrl
                    : `https://riseq.seismo.gov.in/riseq/earthquake`,
                status: typeof item.status === 'string' ? item.status : 'Reviewed',
                source: 'NESAC NER-DRR / NCS Seismo',
              })

              if (results.length >= limit) break
            }

            resolve(results)
          } catch (parseErr: any) {
            console.warn('[nerdrr] JSON parse error in earthquake feed:', parseErr.message)
            resolve([])
          }
        })
      }
    )

    req.on('error', (err) => {
      console.warn('[nerdrr] Network error fetching earthquakes:', err.message)
      resolve([])
    })

    req.on('timeout', () => {
      req.destroy()
      console.warn('[nerdrr] Timeout fetching earthquakes from NER-DRR')
      resolve([])
    })
  })
}
