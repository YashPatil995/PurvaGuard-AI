// PurvaGuard AI — Alerts list API
// GET /api/alerts?hazard=&severity=&status=&regionId=&limit=50&offset=0
// Returns { items, total, limit, offset }.
// Sort: ACTIVE first by issuedAt desc, then EXPIRED.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AlertRow {
  id: string
  title: string
  body: string
  alertType: string
  severity: string
  modelRiskLevel: string | null
  confidence: number | null
  issuerType: string
  issuerName: string
  sourceUrl: string | null
  lat: number | null
  lng: number | null
  radiusKm: number
  issuedAt: string
  validFrom: string
  expiresAt: string
  status: string
  verificationStatus: string
  languages: string[]
  simulationMode: boolean
  authorName: string | null
  regions: Array<{ id: string; canonicalName: string; localName: string | null }>
}

function mapRow(a: any): AlertRow {
  const regions = (a.regions ?? []).map((ar: any) => ({
    id: ar.region?.id ?? ar.regionId,
    canonicalName: ar.region?.canonicalName ?? 'Unknown region',
    localName: ar.region?.localName ?? null,
  }))
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    alertType: a.alertType,
    severity: a.severity,
    modelRiskLevel: a.modelRiskLevel ?? null,
    confidence: a.confidence !== null && a.confidence !== undefined ? Number(a.confidence) : null,
    issuerType: a.issuerType,
    issuerName: a.issuerName,
    sourceUrl: a.sourceUrl ?? null,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    radiusKm: a.radiusKm,
    issuedAt: a.issuedAt instanceof Date ? a.issuedAt.toISOString() : a.issuedAt,
    validFrom: a.validFrom instanceof Date ? a.validFrom.toISOString() : a.validFrom,
    expiresAt: a.expiresAt instanceof Date ? a.expiresAt.toISOString() : a.expiresAt,
    status: a.status,
    verificationStatus: a.verificationStatus,
    languages: a.languages ? String(a.languages).split(',').map((s: string) => s.trim()).filter(Boolean) : ['en'],
    simulationMode: !!a.simulationMode,
    authorName: a.author?.name ?? null,
    regions,
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const hazard = url.searchParams.get('hazard')
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    const regionId = url.searchParams.get('regionId')
    const search = url.searchParams.get('search')?.trim()
    const limitParam = url.searchParams.get('limit')
    const offsetParam = url.searchParams.get('offset')

    const limit = Math.max(1, Math.min(200, Number(limitParam) || 50))
    const offset = Math.max(0, Number(offsetParam) || 0)

    const where: Prisma.AlertWhereInput = {}
    if (hazard && hazard !== 'ALL') where.alertType = hazard
    if (severity && severity !== 'ALL') where.severity = severity
    if (status && status !== 'ALL') where.status = status
    if (regionId) where.regions = { some: { regionId } }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { body: { contains: search } },
        { issuerName: { contains: search } },
      ]
    }

    const [rows, total] = await Promise.all([
      db.alert.findMany({
        where,
        include: {
          regions: { include: { region: true } },
          author: true,
        },
        orderBy: [{ status: 'asc' }, { issuedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.alert.count({ where }),
    ])

    // Stable secondary sort: ACTIVE first by issuedAt desc, then EXPIRED by issuedAt desc.
    // (Prisma orderBy status asc puts 'ACTIVE' before 'EXPIRED' alphabetically — coincidentally correct here,
    //  but we re-sort defensively in JS to guarantee the contract.)
    const statusRank = (s: string) => (s === 'ACTIVE' ? 0 : s === 'EXPIRED' ? 2 : 1)
    const sorted = [...rows].sort((a, b) => {
      const ra = statusRank(a.status)
      const rb = statusRank(b.status)
      if (ra !== rb) return ra - rb
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    })

    return NextResponse.json({
      items: sorted.map(mapRow),
      total,
      limit,
      offset,
    })
  } catch (err: any) {
    console.error('[api/alerts] error', err)
    return NextResponse.json(
      { error: 'Failed to load alerts', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
