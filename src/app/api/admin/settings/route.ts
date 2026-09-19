import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

type PatchBody = { key: string; value: string }

// GET /api/admin/settings — list system settings.
export async function GET(request: Request) {
  const _auth = await requireAdmin(request)
  if (!_auth.ok) return _auth.response
  try {
    const settings = await db.systemSetting.findMany({
      orderBy: { key: 'asc' },
    })
    return NextResponse.json({ items: settings, total: settings.length })
  } catch (err) {
    console.error('[api/admin/settings] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to list settings', detail: String(err) },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/settings — upsert a system setting (by key).
// Body: { key, value }. Both are strings — value is opaque JSON stored as text.
export async function PATCH(req: Request, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const body = (await req.json()) as PatchBody
    if (!body.key || body.value === undefined) {
      return NextResponse.json({ error: 'Missing { key, value }' }, { status: 400 })
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const existing = await db.systemSetting.findUnique({ where: { key: body.key } })
    let updated
    if (existing) {
      updated = await db.systemSetting.update({
        where: { key: body.key },
        data: { value: body.value },
      })
    } else {
      updated = await db.systemSetting.create({
        data: { key: body.key, value: body.value },
      })
    }

    await writeAudit({
      actorId: admin?.id,
      action: 'SETTING_UPDATE',
      entityType: 'SystemSetting',
      entityId: updated.id,
      before: existing ? jsonSafe(existing) : null,
      after: jsonSafe(updated),
    })

    return NextResponse.json({ setting: updated })
  } catch (err) {
    console.error('[api/admin/settings] PATCH failed', err)
    return NextResponse.json(
      { error: 'Failed to update setting', detail: String(err) },
      { status: 500 }
    )
  }
}
