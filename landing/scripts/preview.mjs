// Run from the repo root after `cd landing && pnpm preview`.
// Uses the root @playwright/test installation; not part of the landing build.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('.preview', { recursive: true })

const browser = await chromium.launch()
const errors = []

async function shot(name, path, viewport, fullPage = true) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}:console ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`${name}:pageerror ${error.message}`))
  const response = await page.goto(`http://127.0.0.1:8787${path}`, { waitUntil: 'networkidle' })
  console.log(`${path} -> ${response?.status()} | title="${await page.title()}" | h1="${await page.locator('h1').first().innerText().catch(() => '')}"`)
  console.log(`   os=${await page.evaluate(() => document.documentElement.dataset.os)}`)
  console.log(`   canonical=${await page.getAttribute('link[rel=canonical]', 'href')}`)
  await page.screenshot({ path: `.preview/${name}.png`, fullPage })
  await page.close()
}

await shot('home-desktop', '/', { width: 1440, height: 900 })
await shot('home-mobile', '/', { width: 390, height: 844 })
await shot('descargar', '/descargar', { width: 1440, height: 900 })
await shot('privacidad', '/privacidad', { width: 1200, height: 800 })
await shot('404', '/no-existe', { width: 1200, height: 800 })

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors')
await browser.close()


