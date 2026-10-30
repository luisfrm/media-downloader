#!/usr/bin/env node
/**
 * La versión vive en package.json.
 * Este script la copia a Cargo.toml, Cargo.lock y tauri.conf.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const packagePath = 'package.json'
const cargoPath = 'src-tauri/Cargo.toml'
const lockPath = 'src-tauri/Cargo.lock'
const tauriPath = 'src-tauri/tauri.conf.json'

const version = JSON.parse(readFileSync(packagePath, 'utf8')).version
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Versión inválida en package.json: ${version}`)
  process.exit(1)
}

let cargo = readFileSync(cargoPath, 'utf8')
const cargoPattern = /(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(")/
if (!cargoPattern.test(cargo)) {
  console.error('No se encontró la versión dentro de [package] en Cargo.toml')
  process.exit(1)
}
cargo = cargo.replace(cargoPattern, `$1${version}$2`)
writeFileSync(cargoPath, cargo)

let lock = readFileSync(lockPath, 'utf8')
const lockPattern = /(\[\[package\]\]\nname = "media-downloader"\nversion = ")[^"]+(")/
if (!lockPattern.test(lock)) {
  console.error('No se encontró la entrada de media-downloader en Cargo.lock')
  process.exit(1)
}
lock = lock.replace(lockPattern, `$1${version}$2`)
writeFileSync(lockPath, lock)

const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'))
tauri.version = version
writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`)

console.log(`✓ versión sincronizada: ${version}`)
