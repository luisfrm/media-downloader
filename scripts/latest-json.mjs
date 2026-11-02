#!/usr/bin/env node
/**
 * Writes latest.json, the manifest the Tauri updater reads.
 *
 *   RELEASE_NOTES="..." node scripts/latest-json.mjs \
 *     --dir release --version 0.1.1 --repo luisfrm/media-downloader
 *
 * Every updater signature is emitted by the signed build. Missing .sig files
 * are a hard error: publishing a manifest that cannot be verified would make
 * the app reject the update.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
function flag(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const directory = flag('--dir') ?? 'release'
const version = flag('--version')
const repo = flag('--repo') ?? process.env.GITHUB_REPOSITORY ?? 'luisfrm/media-downloader'

if (!version) fail('Falta --version')

const files = existsSync(directory) ? readdirSync(directory) : []

function pick(pattern, label) {
  const file = files.find((name) => pattern.test(name) && !name.endsWith('.sig'))
  if (!file) fail(`No se encontró ${label} en ${directory}`)

  const signatureFile = `${file}.sig`
  if (!existsSync(path.join(directory, signatureFile))) {
    fail(`Falta ${signatureFile}: el build no está firmado o createUpdaterArtifacts está desactivado.`)
  }

  return {
    url: `https://github.com/${repo}/releases/download/v${version}/${encodeURIComponent(file)}`,
    signature: readFileSync(path.join(directory, signatureFile), 'utf8').trim(),
  }
}

const manifest = {
  version,
  notes: process.env.RELEASE_NOTES ?? '',
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': pick(/-setup\.exe$/i, 'el instalador NSIS (.exe)'),
    'linux-x86_64': pick(/\.AppImage$/i, 'el AppImage'),
    'darwin-aarch64': pick(/\.app\.tar\.gz$/i, 'el paquete .app.tar.gz de macOS'),
  },
}

writeFileSync(path.join(directory, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`✓ latest.json (${Object.keys(manifest.platforms).join(', ')})`)
