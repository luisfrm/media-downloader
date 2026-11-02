#!/usr/bin/env node
/**
 * Reads the latest GitHub release and writes src/data/release.json.
 *
 * The landing is fully static: no runtime request is made to GitHub. The
 * version and asset URLs are frozen at build time. When the API is
 * unreachable (offline dev, rate limit, fork without a token) the committed
 * file is kept, so `astro build` always works.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'src/data/release.json')
const repo = process.env.GITHUB_REPOSITORY ?? 'luisfrm/media-downloader'

const ASSET_MAP = {
  windowsSetup: /-setup\.exe$/i,
  windowsMsi: /\.msi$/i,
  linuxAppImage: /\.AppImage$/i,
  linuxDeb: /\.deb$/i,
  macosDmg: /\.dmg$/i,
}

function pick(assets) {
  const found = {}
  for (const [key, pattern] of Object.entries(ASSET_MAP)) {
    const asset = assets.find((item) => pattern.test(item.name))
    if (asset) {
      found[key] = { name: asset.name, url: asset.browser_download_url, size: asset.size }
    }
  }
  return found
}

async function main() {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'media-downloader-landing-build',
    'x-github-api-version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`GitHub respondió ${response.status}`)

    const release = await response.json()
    const assets = pick(Array.isArray(release.assets) ? release.assets : [])
    const missing = Object.keys(ASSET_MAP).filter((key) => !assets[key])
    if (missing.length) throw new Error(`Faltan assets: ${missing.join(', ')}`)

    const checksums = release.assets.find((asset) => /^SHA256SUMS\.txt$/i.test(asset.name))
    const installGuide = release.assets.find((asset) => /^INSTALL\.md$/i.test(asset.name))

    const data = {
      version: String(release.tag_name ?? '').replace(/^v/, ''),
      tag: release.tag_name,
      publishedAt: release.published_at,
      releaseUrl: release.html_url,
      assets,
      checksums: checksums?.browser_download_url ?? null,
      installGuide: installGuide?.browser_download_url ?? null,
      source: 'github',
    }

    await writeFile(target, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`✓ Release ${data.tag} sincronizado (${Object.keys(assets).length} assets)`)
  } catch (error) {
    const previous = JSON.parse(await readFile(target, 'utf8'))
    console.warn(`! No se pudo consultar GitHub: ${error.message}`)
    console.warn(`! Se conserva release.json (${previous.tag ?? 'sin versión'}) como fallback`)
  }
}

await main()
