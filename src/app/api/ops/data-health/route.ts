import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops/data-health — list of DataSource + ingestion freshness summary.
export async function GET() {
  try {
    const sources = await db.dataSource.findMany({
      orderBy: { name: 'asc' },
    })
    const now = Date.now()
    const summary = sources.map((s) => {
      const lastMs = s.lastSuccessAt ? now - s.lastSuccessAt.getTime() : null
      const freshnessMin = lastMs === null ? null : Math.round(lastMs / 60000)
      return {
        id: s.id,
        name: s.name,
        sourceType: s.sourceType,
        provider: s.provider,
        healthStatus: s.healthStatus,
        lastSuccessAt: s.lastSuccessAt,
        lastErrorMessage: s.lastErrorMessage,
        simulationMode: s.simulationMode,
        enabled: s.enabled,
        refreshIntervalMinutes: s.refreshIntervalMinutes,
        freshnessMinutes: freshnessMin,
        stale: freshnessMin !== null && freshnessMin > s.refreshIntervalMinutes * 2,
      }
    })

    const healthy = summary.filter((s) => s.healthStatus === 'HEALTHY').length
    const degraded = summary.filter((s) => s.healthStatus === 'DEGRADED').length
    const errored = summary.filter((s) => s.healthStatus === 'ERROR').length
    const simulated = summary.filter((s) => s.simulationMode).length

    return NextResponse.json({
      sources: summary,
      freshnessSummary: {
        total: summary.length,
        healthy,
        degraded,
        errored,
        simulated,
        staleCount: summary.filter((s) => s.stale).length,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/ops/data-health] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load data-source health', detail: String(err) },
      { status: 500 }
    )
  }
}
