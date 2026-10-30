import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/x-video.json', import.meta.url), 'utf8'),
) as Record<string, unknown>

const xUrl = 'https://x.com/DonShelby_/status/2116216248291754237'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test('renderiza el home y colapsa la barra lateral', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Descargar', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analizar enlace' })).toBeVisible()

  const rail = page.locator('aside').first()
  const wide = await rail.boundingBox()
  expect(wide?.width).toBeGreaterThan(200)

  await page.keyboard.press('Control+b')
  await expect
    .poll(async () => (await rail.boundingBox())?.width ?? 0, { timeout: 3000 })
    .toBeLessThan(80)

  await page.keyboard.press('Control+b')
  await expect
    .poll(async () => (await rail.boundingBox())?.width ?? 0, { timeout: 3000 })
    .toBeGreaterThan(200)
})

test('detecta la plataforma mientras se escribe', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel('Enlace de video')
  await input.fill(xUrl)

  await expect(page.getByText('X', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analizar enlace' })).toBeEnabled()
})

test('no desborda horizontalmente a 1280x800', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

test('muestra un error amigable cuando el contenido requiere sesión', async ({ page }) => {
  await page.route('**/api/probe', (route) =>
    route.fulfill({ status: 500, json: { error: 'ERROR: Private video. Sign in to confirm you are human' } }),
  )
  await page.goto('/')
  await page.getByLabel('Enlace de video').fill(xUrl)
  await page.getByRole('button', { name: 'Analizar enlace' }).click()

  await expect(page.getByRole('alert')).toContainText('sesión iniciada')
})

test('analiza, elige calidad y encola una descarga', async ({ page }) => {
  let jobId = ''

  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: {
        ytdlp: '2026.10.26',
        ffmpeg: '7.1',
        binDir: 'C:\\bin',
        platform: 'win32',
        defaultDir: 'C:\\Users\\demo\\Downloads\\Media Downloader',
      },
    }),
  )

  await page.route('**/api/probe', (route) => route.fulfill({ json: { data: fixture } }))

  await page.route('**/api/downloads', async (route) => {
    const body = route.request().postDataJSON() as { id: string }
    jobId = body.id
    await route.fulfill({ json: { ok: true } })
  })

  await page.route('**/api/jobs', async (route) => {
    if (!jobId) return route.fulfill({ json: { jobs: [] } })
    await route.fulfill({
      json: {
        jobs: [
          {
            id: jobId,
            seq: 3,
            phase: 'done',
            percent: 1,
            downloadedBytes: 24494399,
            totalBytes: 24494399,
            speedBps: null,
            etaSec: null,
            filePath: 'C:\\Users\\demo\\Downloads\\Media Downloader\\clip.mp4',
            error: null,
          },
        ],
      },
    })
  })

  await page.goto('/')
  await page.getByLabel('Enlace de video').fill(xUrl)
  await page.getByRole('button', { name: 'Analizar enlace' }).click()

  await expect(page.getByRole('heading', { level: 2, name: /Zidanesca/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /1200 × 1500/i })).toBeChecked()

  await page.getByRole('radio', { name: /720 × 900/i }).click()
  await page.getByRole('main').getByRole('button', { name: 'Descargar', exact: true }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Descarga completada' })).toBeVisible()

  const finished = page.locator('section[aria-labelledby="recent-heading"]')
  await expect(finished.getByRole('heading', { name: 'Finalizadas' })).toBeVisible()
  await expect(finished.getByText(/Zidanesca/)).toBeVisible()

  const running = page.locator('section[aria-labelledby="queue-heading"]')
  await expect(running.getByText(/Zidanesca/)).toHaveCount(0)
  await expect(running.getByText('sin descargas')).toBeVisible()
})

test('permite cambiar la carpeta de descargas desde ajustes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajustes' }).click()

  const folder = page.getByLabel('Ruta de la carpeta de descargas')
  await folder.fill('D:\\Media\\Descargas')

  await expect(page.getByTitle(/D:\\Media\\Descargas/).first()).toBeVisible()
  await expect(page.getByLabel('Ruta de la carpeta de descargas')).toHaveValue('D:\\Media\\Descargas')
})
