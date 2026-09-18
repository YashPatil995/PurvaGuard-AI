import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_TRANSLATIONS } from '@/lib/i18n'

// GET /api/translations?language=en — returns all translations for a language,
// merging DB overrides on top of defaults.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || 'en'

    const dbTranslations = await db.translation.findMany({ where: { language } })
    const overrides: Record<string, string> = {}
    for (const t of dbTranslations) overrides[t.key] = t.value

    const defaults = DEFAULT_TRANSLATIONS[language] ?? DEFAULT_TRANSLATIONS.en
    const merged = { ...defaults, ...overrides }

    return NextResponse.json({ language, translations: merged })
  } catch (e) {
    return NextResponse.json({ language: 'en', translations: DEFAULT_TRANSLATIONS.en }, { status: 200 })
  }
}
