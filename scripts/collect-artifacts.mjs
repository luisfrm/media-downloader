#!/usr/bin/env node
/**
 * Normaliza los nombres de los instaladores y genera checksums.
 *
 *   node scripts/collect-artifacts.mjs --prefix "Media-Downloader_0.1.1_windows-x64" \
 *     --in src-tauri/target/release/bundle --out release
 *
 *   node scripts/collect-artifacts.mjs --checksums release
 */
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
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

function walk(directory) {
  if (!existsSync(directory)) return []
  const entries = readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function checksums(directory) {
  const files = walk(directory)
    .filter((file) => !/\.(md|txt)$/i.test(file) && !file.endsWith('SHA256SUMS.txt'))
    .sort()
  if (!files.length) fail(`No hay archivos para checksum en ${directory}`)

  const lines = files.map((file) => {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
    return `${hash}  ${path.basename(file)}`
  })
  const target = path.join(directory, 'SHA256SUMS.txt')
  writeFileSync(target, `${lines.join('\n')}\n`)
  console.log(`✓ SHA256SUMS.txt (${files.length} archivos)`)
}

const checksumDir = flag('--checksums')
if (checksumDir) {
  checksums(checksumDir)
  process.exit(0)
}

const prefix = flag('--prefix') ?? 'Media-Downloader'
const input = flag('--in') ?? 'src-tauri/target/release/bundle'
const output = flag('--out') ?? 'release'

const KINDS = [
  { ext: '.msi', suffix: '.msi' },
  { ext: '.exe', suffix: '-setup.exe' },
  { ext: '.deb', suffix: '.deb' },
  { ext: '.AppImage', suffix: '.AppImage' },
  { ext: '.dmg', suffix: '.dmg' },
  { ext: '.rpm', suffix: '.rpm' },
]

const found = walk(input)
if (!found.length) fail(`No se encontraron archivos en ${input}. ¿Compilaste los bundles?`)

mkdirSync(output, { recursive: true })
const produced = []

for (const kind of KINDS) {
  const matches = found.filter((file) => file.toLowerCase().endsWith(kind.ext.toLowerCase()))
  matches.forEach((file, index) => {
    const name = `${prefix}${index === 0 ? '' : `-${index + 1}`}${kind.suffix}`
    copyFileSync(file, path.join(output, name))
    produced.push(name)
  })
}

if (!produced.length) fail(`No hay instaladores reconocibles en ${input}`)

for (const name of produced) {
  const size = statSync(path.join(output, name)).size
  console.log(`✓ ${name} (${(size / 1024 / 1024).toFixed(1)} MB)`)
}
