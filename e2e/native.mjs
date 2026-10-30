/**
 * Smoke test contra la app Tauri real (WebView2 + Rust + yt-dlp + ffmpeg).
 * Requiere: WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 npm run tauri dev
 * Uso: node e2e/native.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = 'https://x.com/DonShelby_/status/2116216248291754237'
mkdirSync('shots', { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const page = browser.contexts()[0]?.pages()[0]
if (!page) throw new Error('No hay páginas en la app. ¿Está corriendo `npm run tauri dev`?')

const errors = []
page.on('pageerror', (error) => errors.push(error.message))

await page.evaluate(() => window.localStorage.clear())
await page.reload()
await page.waitForLoadState('domcontentloaded')

const metrics = await page.evaluate(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio,
}))
console.log('viewport', metrics)

await page.getByRole('heading', { name: 'Descargar', level: 1 }).waitFor({ timeout: 15_000 })
await page.screenshot({ path: 'shots/native-home.png' })

await page.getByLabel('Enlace de video').fill(url)
await page.getByRole('button', { name: 'Analizar enlace' }).click()

const best = page.getByRole('radio', { name: /1200 × 1500/ })
await best.waitFor({ timeout: 45_000 })
await page.screenshot({ path: 'shots/native-result.png' })

await page.getByRole('main').getByRole('button', { name: 'Descargar', exact: true }).click()

const queueSection = page.locator('section[aria-labelledby="queue-heading"]')
await expectText(queueSection, 'activa', 10_000)
await page.screenshot({ path: 'shots/native-progress.png' })
console.log('progress:', (await queueSection.innerText()).split('\n').slice(0, 4).join(' | '))

await expectText(page.locator('section[aria-labelledby="recent-heading"]'), 'Zidanesca', 90_000)
await page.screenshot({ path: 'shots/native-finalizadas.png' })

const queueText = await queueSection.innerText()
if (queueText.includes('Zidanesca')) throw new Error('La descarga finalizada sigue en En curso')
if (errors.length) throw new Error(`Errores en la webview: ${errors.join(' / ')}`)

console.log('ok: análisis, descarga y paso a Finalizadas')
await browser.close()

async function expectText(locator, text, timeout) {
  await page.waitForFunction(
    ({ selector, needle }) => {
      const node = document.querySelector(selector)
      return Boolean(node?.textContent?.includes(needle))
    },
    { selector: await locator.getAttribute('aria-labelledby').then((id) => `section[aria-labelledby="${id}"]`), needle: text },
    { timeout },
  )
}
