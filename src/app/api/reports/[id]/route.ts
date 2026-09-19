// PurvaGuard AI — Community Report detail API
// GET:   single report.
// PATCH: update status (RECEIVED→UNDER_REVIEW→VERIFIED/REJECTED→RESOLVED) with allowed transitions.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['UNDER_REVIEW', 'REJECTED', 'RESOLVED'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED', 'RESOLVED'],
  VERIFIED: ['RESOLVED'],
  REJECTED: ['UNDER_REVIEW', 'RESOLVED'],
  RESOLVED: [],
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const report = await db.communityReport.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ report, simulationMode: true })
  } catch (err: any) {
    console.error('[api/reports/[id] GET] error', err)
    return NextResponse.json(
      { error: 'Failed to load report', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({} as any))
    const newStatus = body?.status ? String(body.status).toUpperCase() : null
    if (!newStatus) return NextResponse.json({ error: 'status is required' }, { status: 400 })

    const report = await db.communityReport.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fromStatus = report.status
    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Status transition ${fromStatus} -> ${newStatus} is not allowed`, allowedNext: allowed },
        { status: 409 }
      )
    }

    const verificationStatus =
      newStatus === 'VERIFIED' ? 'VERIFIED' : newStatus === 'REJECTED' ? 'UNVERIFIED' : report.verificationStatus

    const updated = await db.communityReport.update({
      where: { id },
      data: { status: newStatus, verificationStatus },
    })

    return NextResponse.json({
      report: updated,
      fromStatus,
      toStatus: newStatus,
      simulationMode: true,
    })
  } catch (err: any) {
    console.error('[api/reports/[id] PATCH] error', err)
    return NextResponse.json(
      { error: 'Failed to update report', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
