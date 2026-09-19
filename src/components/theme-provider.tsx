'use client'

import * as React from 'react'

type Theme = 'dark' | 'light'

type ThemeProviderContext = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeProviderContextInternal = React.createContext<ThemeProviderContext | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('light')

  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('purvaguard-theme') as Theme | null) : null
    const initial = stored ?? 'light'
    setThemeState(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof window !== 'undefined') {
      localStorage.setItem('purvaguard-theme', t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = React.useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeProviderContextInternal.Provider value={value}>{children}</ThemeProviderContextInternal.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeProviderContextInternal)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
