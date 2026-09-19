'use client'

import * as React from 'react'
import { DEFAULT_TRANSLATIONS } from '@/lib/constants'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api-client'

// Re-export DEFAULT_TRANSLATIONS from i18n (client-safe)
import { DEFAULT_TRANSLATIONS as DT } from '@/lib/i18n'

interface I18nContext {
  t: (key: string, fallback?: string) => string
  language: string
  loading: boolean
}

const Ctx = React.createContext<I18nContext | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useApp()
  const [translations, setTranslations] = React.useState<Record<string, string>>(DT.en)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    apiGet<{ translations: Record<string, string> }>(`/api/translations?language=${language}`)
      .then((res) => {
        if (active) setTranslations(res.translations)
      })
      .catch(() => {
        if (active) setTranslations(DT[language] ?? DT.en)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [language])

  const t = React.useCallback((key: string, fallback?: string) => {
    return translations[key] ?? fallback ?? key
  }, [translations])

  const value = React.useMemo(() => ({ t, language, loading }), [t, language, loading])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useT() {
  const ctx = React.useContext(Ctx)
  if (!ctx) {
    // Fallback if no provider — return identity fn
    return { t: (key: string, fallback?: string) => fallback ?? key, language: 'en', loading: false }
  }
  return ctx
}
