import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_TRANSLATIONS } from '@/lib/i18n'
import { getDemoActor, writeAudit, jsonSafe } from '@/lib/audit'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/translations?language=en
// Returns all translation keys for the requested language, merging DB overrides
// over the bundled defaults (so the admin always sees the full key set).
export async function GET(request: NextRequest) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || 'en'

    const dbTranslations = await db.translation.findMany({
      where: { language },
      orderBy: { key: 'asc' },
    })
    const overrides: Record<string, string> = {}
    for (const t of dbTranslations) overrides[t.key] = t.value

    const defaults = DEFAULT_TRANSLATIONS[language] ?? DEFAULT_TRANSLATIONS.en
    const merged = { ...defaults, ...overrides }

    return NextResponse.json({
      language,
      translations: merged,
      overrides,
      keys: Object.keys(merged).sort(),
    })
  } catch (err) {
    console.error('[api/admin/translations] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load translations', detail: String(err) },
      { status: 500 }
    )
  }
}

type PostBody = {
  key: string
  language: string
  value: string
}

// POST /api/admin/translations — upsert a Translation row keyed by (key, language).
// Body: { key, language, value }.
export async function POST(req: NextRequest, request: Request) {
  const _auth = await requireAdmin(request as any)
  if (!_auth.ok) return _auth.response

  try {
    const body = (await req.json()) as PostBody
    if (!body.key || !body.language || typeof body.value !== 'string') {
      return NextResponse.json(
        { error: 'Missing { key, language, value }' },
        { status: 400 }
      )
    }
    const admin = await getDemoActor('admin.demo@purvaguard.in')

    const existing = await db.translation.findUnique({
      where: { key_language: { key: body.key, language: body.language } },
    })

    const upserted = await db.translation.upsert({
      where: { key_language: { key: body.key, language: body.language } },
      create: {
        key: body.key,
        language: body.language,
        value: body.value,
      },
      update: {
        value: body.value,
      },
    })

    await writeAudit({
      actorId: admin?.id,
      action: 'TRANSLATION_UPSERT',
      entityType: 'Translation',
      entityId: upserted.id,
      before: existing ? jsonSafe(existing) : null,
      after: jsonSafe(upserted),
    })

    return NextResponse.json({ translation: upserted, created: !existing })
  } catch (err) {
    console.error('[api/admin/translations] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to upsert translation', detail: String(err) },
      { status: 500 }
    )
  }
}
