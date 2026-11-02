import { create } from 'zustand'

interface ActivityState {
  conversions: number
  beginConversion: () => void
  endConversion: () => void
}

/**
 * Conversions are not part of the download queue, but an update replaces the
 * binary while ffmpeg is running. This counter lets the updater wait.
 */
export const useActivityStore = create<ActivityState>((set) => ({
  conversions: 0,
  beginConversion: () => set((state) => ({ conversions: state.conversions + 1 })),
  endConversion: () => set((state) => ({ conversions: Math.max(0, state.conversions - 1) })),
}))
