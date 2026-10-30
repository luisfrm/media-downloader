#!/usr/bin/env node
/**
 * pnpm release patch|minor|major|x.y.z
 *
 * 1. Sube la versión en package.json
 * 2. La sincroniza a Cargo.toml, Cargo.lock y tauri.conf.json
 * 3. Commitea chore(release): vX
 * 4. Pushea a la rama actual
 *
 * El tag y el release los crea CI, nunca este script.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const KINDS = new Set(['patch', 'minor', 'major'])

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim()
}

const input = process.argv[2] ?? 'patch'

const dirty = capture('git', ['status', '--porcelain'])
if (dirty) {
  console.error('El árbol de trabajo no está limpio. Commiteá o descartá los cambios antes de publicar.')
  process.exit(1)
}

const branch = capture('git', ['branch', '--show-current'])
if (!branch) {
  console.error('No se pudo detectar la rama actual.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const current = pkg.version
const [major, minor, patch] = current.split('.').map(Number)

let next
if (KINDS.has(input)) {
  next =
    input === 'major'
      ? `${major + 1}.0.0`
      : input === 'minor'
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`
} else if (/^\d+\.\d+\.\d+$/.test(input)) {
  next = input
} else {
  console.error('Uso: pnpm release [patch|minor|major|x.y.z]')
  process.exit(1)
}

if (next === current) {
  console.error(`La versión ya es ${current}.`)
  process.exit(1)
}

const parts = next.split('.').map(Number)
const currentParts = current.split('.').map(Number)
const isDowngrade =
  parts[0] < currentParts[0] ||
  (parts[0] === currentParts[0] && parts[1] < currentParts[1]) ||
  (parts[0] === currentParts[0] && parts[1] === currentParts[1] && parts[2] < currentParts[2])

if (isDowngrade) {
  console.error(`No se puede bajar de ${current} a ${next}.`)
  process.exit(1)
}

pkg.version = next
writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
run('node', ['scripts/sync-version.mjs'])

run('git', [
  'add',
  'package.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  'src-tauri/tauri.conf.json',
])
run('git', ['commit', '-m', `chore(release): v${next}`])
run('git', ['push', 'origin', `HEAD:${branch}`])

console.log(`\n✓ v${next} pusheado a ${branch}. CI crea el tag y publica el release.`)
