// Standalone Playwright verification for the landing preview.
//
//   cd landing && pnpm preview        # http://127.0.0.1:8787
//   cd landing && node scripts/verify.mjs
//
// Uses the root @playwright/test installation and the landing's sharp.
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const BASE = process.env.LANDING_PREVIEW_URL ?? 'http://127.0.0.1:8787'
const results = []
let failures = 0

async function check(name, fn) {
  try {
    await fn()
    results.push(`✓ ${name}`)
  } catch (error) {
    failures += 1
    results.push(`✗ ${name}\n  ${error.message.split('\n')[0]}`)
  }
}

async function openPage(context, path = '/') {
  const page = await context.newPage()
  const errors = []
  const bad = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 400) bad.push(`${response.status()} ${response.url()}`)
  })
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  return { page, response, errors, bad }
}

const browser = await chromium.launch()
mkdirSync('.preview', { recursive: true })

// ---------------------------------------------------------------- desktop home
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const { page, response, errors, bad } = await openPage(context)

  await check('home responde 200', () => assert.equal(response.status(), 200))
  await check('home: un solo h1', async () => assert.equal(await page.locator('h1').count(), 1))
  await check('home: lang=es', async () => assert.equal(await page.getAttribute('html', 'lang'), 'es'))

  const meta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ogType: document.querySelector('meta[property="og:type"]')?.getAttribute('content'),
    twitter: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    csp: document.querySelector('meta[http-equiv="content-security-policy"]')?.getAttribute('content'),
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent)),
    images: [...document.images].map((img) => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      hidden: img.getAttribute('aria-hidden') === 'true' || img.closest('[aria-hidden="true"]') !== null,
    })),
  }))

  await check('home: title y description', () => {
    assert.ok(meta.title.includes('Media Downloader'))
    assert.ok((meta.description?.length ?? 0) > 80)
  })
  await check('home: canonical absoluto', () => assert.match(meta.canonical, /^https:\/\/.+\/$/))
  await check('home: robots indexable', () => assert.match(meta.robots, /index/))
  await check('home: OG y Twitter card', () => {
    assert.match(meta.ogImage, /\/shared-image\.png$/)
    assert.equal(meta.ogType, 'website')
    assert.equal(meta.twitter, 'summary_large_image')
  })
  await check('home: CSP con hashes y sin unsafe-inline', () => {
    assert.match(meta.csp, /script-src 'self' 'sha256-/)
    assert.ok(!/script-src[^;]*'unsafe-inline'/.test(meta.csp))
    assert.match(meta.csp, /style-src 'self'/)
  })
  await check('home: JSON-LD SoftwareApplication + FAQPage + WebSite', () => {
    const types = meta.jsonLd.map((item) => item['@type'])
    assert.ok(types.includes('SoftwareApplication'))
    assert.ok(types.includes('FAQPage'))
    assert.ok(types.includes('WebSite'))
  })
  await check('home: imágenes con alt', () => {
    assert.ok(meta.images.length > 0)
    for (const image of meta.images) {
      if (image.hidden) continue
      assert.ok(image.alt && image.alt.length > 5, image.src)
    }
  })
  await check('home: sin errores de consola', () => assert.deepEqual(errors, []))
  await check('home: sin recursos 4xx/5xx', () => assert.deepEqual(bad, []))

  await check('home: links internos responden 200', async () => {
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="/"]')]
        .map((a) => a.getAttribute('href'))
        .filter((href) => href && !href.startsWith('/#')),
    )
    const unique = [...new Set(hrefs)]
    for (const href of unique) {
      const res = await page.request.get(`${BASE}${href}`)
      assert.equal(res.status(), 200, `${href} -> ${res.status()}`)
    }
  })

  await check('home: enlaces externos con rel seguro', async () => {
    const unsafe = await page.evaluate(() =>
      [...document.querySelectorAll('a[target="_blank"]')]
        .filter((a) => !/noreferrer/.test(a.getAttribute('rel') ?? '') || !/noopener/.test(a.getAttribute('rel') ?? ''))
        .map((a) => a.href),
    )
    assert.deepEqual(unsafe, [])
  })

  await check('home: descargas apuntan a un release de GitHub', async () => {
    const hrefs = await page.locator('#descargas a[href*="releases/download/"]').evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')),
    )
    assert.ok(hrefs.length >= 5, `links=${hrefs.length}`)
    for (const href of hrefs) assert.match(href, /releases\/download\/v\d+\.\d+\.\d+\//)
  })

  await check('home: CTA principal mide 44px de alto', async () => {
    const heights = await page.locator('#descargas .key, .hero-actions .key').evaluateAll((links) =>
      links.map((a) => a.getBoundingClientRect().height),
    )
    assert.ok(heights.length >= 6, `links=${heights.length}`)
    assert.ok(heights.every((height) => height >= 44), heights.join(','))
  })

  await check('home: sin gradiente en el título', async () => {
    const title = await page.locator('h1').evaluate((el) => {
      const style = getComputedStyle(el)
      return { image: style.backgroundImage, clip: style.backgroundClip, fill: style.webkitTextFillColor }
    })
    assert.equal(title.image, 'none')
    assert.notEqual(title.clip, 'text')
  })

  await check('home: transiciones sin transition-all', async () => {
    const style = await page.locator('.hero-actions .key').first().evaluate((el) => {
      const computed = getComputedStyle(el)
      return { property: computed.transitionProperty, duration: computed.transitionDuration }
    })
    assert.match(style.property, /transform/)
    assert.ok(!style.property.includes('all'))
    assert.notEqual(style.duration, '0s')
  })

  await check('home: hero completo a 1280x800', async () => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(300)
    const boxes = await page.evaluate(() => {
      const selectors = ['h1', '.hero .lede', '.hero-actions .key', '.hero-visual img']
      return selectors.map((selector) => {
        const element = document.querySelector(selector)
        if (!element) return { selector, missing: true }
        const rect = element.getBoundingClientRect()
        return { selector, top: rect.top, bottom: rect.bottom, height: rect.height }
      })
    })
    for (const box of boxes) {
      assert.ok(!box.missing, `${box.selector} no existe`)
      assert.ok(box.top >= 0 && box.top < 800, `${box.selector} arriba fuera: ${box.top}`)
      assert.ok(box.bottom > 0 && box.bottom <= 800, `${box.selector} abajo fuera: ${box.bottom}`)
      assert.ok(box.height > 0)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  await check('home: FAQ abre y cierra', async () => {
    const details = page.locator('#preguntas details').nth(1)
    await details.locator('summary').click()
    assert.equal(await details.evaluate((el) => el.open), true)
    await details.locator('summary').click()
    assert.equal(await details.evaluate((el) => el.open), false)
  })

  await check('home: skip link recibe foco primero', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    const text = await page.evaluate(() => document.activeElement?.textContent?.trim())
    assert.equal(text, 'Saltar al contenido')
  })

  await check('home: sin overflow horizontal', async () => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(250)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(overflow <= 1, `${width}px -> overflow ${overflow}`)
    }
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '.preview/verify-home.png', fullPage: false })
  await context.close()
}

// ------------------------------------------------------------------- OS labels
for (const [name, userAgent, expected] of [
  ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/156.0 Safari/537.36', 'windows'],
  ['Linux', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/156.0 Safari/537.36', 'linux'],
  ['macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/156.0 Safari/537.36', 'macos'],
  ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', 'movil'],
]) {
  const context = await browser.newContext({ userAgent, viewport: { width: 390, height: 844 } })
  const { page } = await openPage(context)
  await check(`OS ${name}: detecta ${expected}`, async () => {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.os), expected)
  })
  await check(`OS ${name}: CTA y badge coherentes`, async () => {
    const state = await page.evaluate(() => ({
      osYou: [...document.querySelectorAll('.os-you')].filter((el) => getComputedStyle(el).display !== 'none').length,
      mobileNote: getComputedStyle(document.querySelector('[data-mobile-note]')).display,
      headerCta: document.querySelector('header a[href="/descargar"]')?.textContent?.trim(),
      heroKeys: [...document.querySelectorAll('.hero-actions .key')].map((el) => el.textContent?.trim()),
    }))
    assert.equal(state.headerCta, 'Descargar')
    assert.deepEqual(state.heroKeys, ['Windows', 'Linux', 'macOS'])
    if (expected === 'movil') {
      assert.equal(state.osYou, 0)
      assert.equal(state.mobileNote, 'flex')
    } else {
      assert.equal(state.osYou, 1)
      assert.equal(state.mobileNote, 'none')
    }
  })
  await context.close()
}

// ------------------------------------------------------------------ other pages
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  for (const [path, heading] of [
    ['/descargar', 'Descargá Media Downloader.'],
    ['/privacidad', 'Privacidad.'],
  ]) {
    const { page, response, errors, bad } = await openPage(context, path)
    await check(`${path} responde 200 y tiene h1`, async () => {
      assert.equal(response.status(), 200)
      assert.equal((await page.locator('h1').innerText()).trim(), heading)
    })
    await check(`${path} sin errores ni recursos roto`, () => {
      assert.deepEqual(errors, [])
      assert.deepEqual(bad, [])
    })
    await page.close()
  }

  const notFound = await openPage(context, '/no-existe')
  await check('404 responde 404 con página propia', async () => {
    assert.equal(notFound.response.status(), 404)
    assert.match(await notFound.page.title(), /no encontrada/i)
    assert.match(await notFound.page.getAttribute('meta[name="robots"]', 'content'), /noindex/)
  })
  await notFound.page.close()

  for (const [from, to] of [
    ['/download', '/descargar'],
    ['/downloads', '/descargar'],
  ]) {
    await check(`redirect ${from} -> ${to}`, async () => {
      const res = await context.request.get(`${BASE}${from}`, { maxRedirects: 0 })
      assert.equal(res.status(), 301)
      assert.match(res.headers().location, new RegExp(`${to}$`))
    })
  }

  await check('robots.txt apunta al sitemap', async () => {
    const res = await context.request.get(`${BASE}/robots.txt`)
    assert.equal(res.status(), 200)
    assert.match(await res.text(), /Sitemap: .*sitemap-index\.xml/)
  })

  await check('sitemap incluye las tres páginas', async () => {
    const res = await context.request.get(`${BASE}/sitemap-0.xml`)
    assert.equal(res.status(), 200)
    const xml = await res.text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname)
    for (const path of ['/', '/descargar', '/privacidad']) assert.ok(paths.includes(path), `${path} no está en el sitemap`)
  })

  await check('shared image es 1200x630', async () => {
    const res = await context.request.get(`${BASE}/shared-image.png`)
    assert.equal(res.status(), 200)
    assert.match(res.headers()['content-type'], /image\/png/)
    const metadata = await sharp(await res.body()).metadata()
    assert.equal(metadata.width, 1200)
    assert.equal(metadata.height, 630)
  })

  await context.close()
}

// ---------------------------------------------------------------------- mobile
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const { page, errors } = await openPage(context)
  await check('mobile: sin overflow y menú presente', async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    assert.ok(overflow <= 1)
    assert.equal(await page.locator('header details').count(), 1)
  })
  await check('mobile: sin errores de consola', () => assert.deepEqual(errors, []))
  await page.screenshot({ path: '.preview/verify-mobile.png', fullPage: false })
  await context.close()
}

await browser.close()

console.log(results.join('\n'))
console.log(`\n${results.length - failures}/${results.length} checks OK`)
if (failures) process.exit(1)
