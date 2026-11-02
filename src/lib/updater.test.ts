import { describe, expect, it } from 'vitest'
import {
  CHECK_INTERVAL_MS,
  SNOOZE_MS,
  describeInstallKind,
  formatLastCheck,
  isSnoozed,
  shouldCheck,
  snoozeUntil,
  supportsSelfUpdate,
} from './updater'
import type { RuntimeInfo } from './types'

const NOW = 1_800_000_000_000

describe('update scheduling', () => {
  it('checks when there is no previous check', () => {
    expect(shouldCheck(null, NOW)).toBe(true)
  })

  it('waits a full day between automatic checks', () => {
    expect(shouldCheck(NOW - CHECK_INTERVAL_MS + 1, NOW)).toBe(false)
    expect(shouldCheck(NOW - CHECK_INTERVAL_MS, NOW)).toBe(true)
  })

  it('snoozes for seven days', () => {
    const until = snoozeUntil(NOW)
    expect(until).toBe(NOW + SNOOZE_MS)
    expect(isSnoozed(until, NOW)).toBe(true)
    expect(isSnoozed(until, NOW + SNOOZE_MS)).toBe(false)
    expect(isSnoozed(null, NOW)).toBe(false)
  })
})

describe('install capabilities', () => {
  const runtime = (canSelfUpdate: boolean): RuntimeInfo => ({
    version: '0.1.0',
    os: 'windows',
    installKind: 'nsis',
    canSelfUpdate,
  })

  it('only self-updates supported layouts', () => {
    expect(supportsSelfUpdate(runtime(true))).toBe(true)
    expect(supportsSelfUpdate(runtime(false))).toBe(false)
    expect(supportsSelfUpdate(null)).toBe(false)
  })

  it('explains every install kind', () => {
    expect(describeInstallKind('nsis')).toContain('.exe')
    expect(describeInstallKind('msi')).toContain('.msi')
    expect(describeInstallKind('appimage')).toBe('AppImage')
    expect(describeInstallKind('package')).toContain('.deb')
    expect(describeInstallKind('dmg')).toContain('.dmg')
    expect(describeInstallKind(undefined)).toBe('desconocida')
  })
})

describe('last check label', () => {
  it('formats relative times in Spanish', () => {
    expect(formatLastCheck(null, NOW)).toBe('nunca')
    expect(formatLastCheck(NOW - 10_000, NOW)).toBe('hace un momento')
    expect(formatLastCheck(NOW - 5 * 60_000, NOW)).toBe('hace 5 min')
    expect(formatLastCheck(NOW - 3 * 3_600_000, NOW)).toBe('hace 3 h')
    expect(formatLastCheck(NOW - 2 * 86_400_000, NOW)).toBe('hace 2 d')
  })
})
