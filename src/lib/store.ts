'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role, ViewId, LanguageCode } from './constants'
import { DEMO_REGIONS } from './constants'

export interface SelectedLocation {
  name: string
  lat: number
  lng: number
  localName?: string
}

export type Connectivity = 'ONLINE' | 'WEAK' | 'OFFLINE'

interface AppState {
  role: Role
  setRole: (r: Role) => void

  view: ViewId
  setView: (v: ViewId) => void

  language: LanguageCode
  setLanguage: (l: LanguageCode) => void

  location: SelectedLocation
  setLocation: (l: SelectedLocation) => void

  connectivity: Connectivity
  setConnectivity: (c: Connectivity) => void

  lowBandwidth: boolean
  setLowBandwidth: (v: boolean) => void

  highContrast: boolean
  setHighContrast: (v: boolean) => void

  // demo scenario controls
  scenarioActive: boolean
  setScenarioActive: (v: boolean) => void

  selectedIncidentId: string | null
  setSelectedIncidentId: (id: string | null) => void

  selectedAlertId: string | null
  setSelectedAlertId: (id: string | null) => void
}

const DEFAULT_LOCATION: SelectedLocation = {
  name: 'Mangan, Sikkim',
  lat: DEMO_REGIONS[0].lat,
  lng: DEMO_REGIONS[0].lng,
  localName: 'मङ्गन',
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      role: 'PUBLIC',
      setRole: (role) => set({ role }),

      view: 'home',
      setView: (view) => set({ view }),

      language: 'en',
      setLanguage: (language) => set({ language }),

      location: DEFAULT_LOCATION,
      setLocation: (location) => set({ location }),

      connectivity: 'ONLINE',
      setConnectivity: (connectivity) => set({ connectivity }),

      lowBandwidth: false,
      setLowBandwidth: (lowBandwidth) => set({ lowBandwidth }),

      highContrast: false,
      setHighContrast: (highContrast) => set({ highContrast }),

      scenarioActive: false,
      setScenarioActive: (scenarioActive) => set({ scenarioActive }),

      selectedIncidentId: null,
      setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),

      selectedAlertId: null,
      setSelectedAlertId: (selectedAlertId) => set({ selectedAlertId }),
    }),
    {
      name: 'purvaguard-app-state',
      partialize: (s) => ({
        role: s.role,
        view: s.view,
        language: s.language,
        location: s.location,
        lowBandwidth: s.lowBandwidth,
        highContrast: s.highContrast,
      }),
    }
  )
)
