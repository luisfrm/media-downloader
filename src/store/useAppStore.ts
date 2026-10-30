import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EngineCapabilities, Settings } from '../lib/types'
import { DEFAULT_FILENAME_TEMPLATE } from '../lib/ytdlp'
import * as engine from '../lib/engine'

export type Route = 'home' | 'queue' | 'library' | 'converter' | 'settings'

export interface Toast {
  id: string
  tone: 'success' | 'error' | 'info'
  title: string
  description?: string
}

interface AppState {
  route: Route
  railCollapsed: boolean
  settings: Settings
  capabilities: EngineCapabilities | null
  engineCheckedAt: number | null
  toasts: Toast[]
  hydrated: boolean
  setRoute: (route: Route) => void
  toggleRail: () => void
  setRail: (collapsed: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  setCapabilities: (capabilities: EngineCapabilities) => void
  refreshCapabilities: () => Promise<void>
  hydrateSettings: () => Promise<void>
  toast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const defaults: Settings = {
  downloadDir: '',
  preferredQuality: 'best',
  concurrency: 3,
  clipboardWatch: true,
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  embedThumbnail: true,
  embedMetadata: true,
  cookiesFromBrowser: 'none',
  reduceMotion: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      route: 'home',
      railCollapsed: false,
      settings: defaults,
      capabilities: null,
      engineCheckedAt: null,
      toasts: [],
      hydrated: false,

      setRoute: (route) => set({ route }),
      toggleRail: () => set((state) => ({ railCollapsed: !state.railCollapsed })),
      setRail: (railCollapsed) => set({ railCollapsed }),

      updateSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }))
        void engine.saveSettings(get().settings)
      },

      setCapabilities: (capabilities) => {
        set({ capabilities, engineCheckedAt: Date.now() })
        if (!get().settings.downloadDir && capabilities.defaultDir) {
          set((state) => ({ settings: { ...state.settings, downloadDir: capabilities.defaultDir } }))
        }
      },

      refreshCapabilities: async () => {
        try {
          const capabilities = await engine.capabilities()
          set({ capabilities, engineCheckedAt: Date.now() })
          if (!get().settings.downloadDir && capabilities.defaultDir) {
            set((state) => ({ settings: { ...state.settings, downloadDir: capabilities.defaultDir } }))
          }
        } catch {
          set({ capabilities: null, engineCheckedAt: Date.now() })
        }
      },

      hydrateSettings: async () => {
        const stored = await engine.loadSettings()
        if (stored) {
          set((state) => ({
            settings: { ...state.settings, ...(stored as Partial<Settings>) },
          }))
        }
        set({ hydrated: true })
        if (!get().settings.downloadDir) await get().refreshCapabilities()
      },

      toast: (toast) => {
        const id = crypto.randomUUID()
        set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
        window.setTimeout(() => get().dismissToast(id), 5200)
      },

      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
    }),
    {
      name: 'media-downloader.app.v1',
      partialize: (state) => ({
        route: state.route,
        railCollapsed: state.railCollapsed,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    },
  ),
)

export const selectEngineReady = (state: AppState) => Boolean(state.capabilities?.ytdlp)
