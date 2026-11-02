import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as engine from '../lib/engine'
import {
  checkForUpdate,
  installUpdate,
  isSnoozed,
  relaunchApp,
  shouldCheck,
  snoozeUntil,
  supportsSelfUpdate,
  type InstallProgress,
  type UpdateInfo,
} from '../lib/updater'
import type { RuntimeInfo } from '../lib/types'
import { useAppStore } from './useAppStore'
import { selectActiveCount, useDownloadsStore } from './useDownloadsStore'
import { useActivityStore } from './useActivityStore'

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'none'
  | 'error'
  | 'manual'
  | 'unsupported'

interface UpdaterState {
  status: UpdaterStatus
  info: UpdateInfo | null
  runtime: RuntimeInfo | null
  progress: InstallProgress
  error: string | null
  lastCheck: number | null
  snoozedUntil: number | null
  skippedVersion: string | null
  init: () => Promise<void>
  maybeCheck: () => Promise<void>
  check: (manual?: boolean) => Promise<void>
  install: () => Promise<void>
  relaunch: () => Promise<void>
  dismiss: () => void
  skip: () => void
  reset: () => Promise<void>
}

const emptyProgress: InstallProgress = { downloaded: 0, total: null, percent: 0 }

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo comprobar la actualización.'
}

export const useUpdaterStore = create<UpdaterState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      info: null,
      runtime: null,
      progress: emptyProgress,
      error: null,
      lastCheck: null,
      snoozedUntil: null,
      skippedVersion: null,

      init: async () => {
        const runtime = await engine.runtimeInfo().catch(() => null)
        set({
          runtime,
          status: supportsSelfUpdate(runtime) ? 'idle' : engine.isTauri ? 'manual' : 'unsupported',
        })
      },

      maybeCheck: async () => {
        const state = get()
        if (state.status !== 'idle' || !supportsSelfUpdate(state.runtime)) return
        if (!shouldCheck(state.lastCheck)) return
        await state.check(false)
      },

      check: async (manual = false) => {
        const toast = useAppStore.getState().toast
        const runtime = get().runtime ?? (await engine.runtimeInfo().catch(() => null))
        set({ runtime, error: null })

        if (!engine.isTauri) {
          set({ status: 'unsupported' })
          if (manual) {
            toast({
              tone: 'info',
              title: 'Solo en la app',
              description: 'Las actualizaciones se comprueban desde el build instalado.',
            })
          }
          return
        }

        if (!supportsSelfUpdate(runtime)) {
          set({ status: 'manual' })
          if (manual) {
            toast({
              tone: 'info',
              title: 'Actualización manual',
              description: 'Esta instalación no puede reemplazarse sola. Descargá la versión nueva desde GitHub.',
            })
          }
          return
        }

        set({ status: 'checking' })
        try {
          const info = await checkForUpdate()
          set({ lastCheck: Date.now() })

          if (info && info.version !== get().skippedVersion) {
            set({ info, status: 'available' })
          } else {
            set({ info: null, status: 'none' })
            if (manual) {
              toast({
                tone: 'success',
                title: 'Al día',
                description: `${runtime?.version ?? __APP_VERSION__} es la última versión disponible.`,
              })
            }
          }
        } catch (error) {
          set({ status: 'error', error: messageOf(error) })
          if (manual) {
            toast({ tone: 'error', title: 'No se pudo comprobar', description: messageOf(error) })
          }
        }
      },

      install: async () => {
        const toast = useAppStore.getState().toast
        const { info, runtime } = get()

        if (!info) return
        if (!supportsSelfUpdate(runtime)) {
          toast({
            tone: 'info',
            title: 'Actualización manual',
            description: 'Descargá el instalador nuevo desde la página de releases.',
          })
          return
        }

        if (selectActiveCount(useDownloadsStore.getState()) > 0) {
          const message = 'Terminá o pausá las descargas activas antes de actualizar.'
          set({ status: 'error', error: message })
          toast({ tone: 'error', title: 'Hay descargas en curso', description: message })
          return
        }

        if (useActivityStore.getState().conversions > 0) {
          const message = 'Esperá a que termine la conversión en curso antes de actualizar.'
          set({ status: 'error', error: message })
          toast({ tone: 'error', title: 'Hay una conversión en curso', description: message })
          return
        }

        set({ status: 'downloading', progress: emptyProgress, error: null })
        try {
          await installUpdate((progress) => set({ progress }))
          set({ status: 'ready' })
          toast({
            tone: 'success',
            title: 'Actualización lista',
            description: `Reiniciá la app para usar la ${info.version}.`,
          })
        } catch (error) {
          set({ status: 'error', error: messageOf(error) })
          toast({ tone: 'error', title: 'No se pudo instalar', description: messageOf(error) })
        }
      },

      relaunch: async () => {
        try {
          await relaunchApp()
        } catch {
          // the app may already be restarting
        }
      },

      dismiss: () => set({ snoozedUntil: snoozeUntil() }),

      skip: () => {
        const version = get().info?.version ?? null
        set({ skippedVersion: version, snoozedUntil: null, status: 'none' })
      },

      reset: async () => {
        set({ skippedVersion: null, snoozedUntil: null, info: null, status: 'idle' })
        await get().check(true)
      },
    }),
    {
      name: 'media-downloader.updater.v1',
      partialize: (state) => ({
        lastCheck: state.lastCheck,
        snoozedUntil: state.snoozedUntil,
        skippedVersion: state.skippedVersion,
      }),
    },
  ),
)

export const selectUpdateVisible = (state: UpdaterState, now = Date.now()): boolean => {
  if (!state.info) return false
  if (state.info.version === state.skippedVersion) return false
  if (isSnoozed(state.snoozedUntil, now)) return false
  return state.status === 'available' || state.status === 'downloading' || state.status === 'ready' || state.status === 'error'
}
