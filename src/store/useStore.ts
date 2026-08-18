import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

/**
 * App-wide preferences.
 *
 * Kept separate from `useStudyStore` (and under its original `mero-store` key)
 * so an existing install keeps the theme and language it was already using —
 * and so wiping study data from Study → Data never touches preferences.
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'sepia',
  uiLanguage: 'en',
}

interface StoreState {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'mero-store',
      version: 1,
      partialize: (s) => ({ settings: s.settings }),
      // Merge persisted data over the live state, keeping action functions and
      // backfilling any settings keys added since the data was written.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
    },
  ),
)
