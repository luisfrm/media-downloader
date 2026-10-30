#!/usr/bin/env node
/**
 * Descarga yt-dlp + ffmpeg para la plataforma actual dentro de src-tauri/binaries.
 * Uso: npm run setup:engine
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, chmodSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { pipeline } from 'node:stream/promises'

const root = process.cwd()
const binDir = path.join(root, 'src-tauri', 'binaries')
const tmpDir = path.join(os.tmpdir(), 'media-downloader-engine')
const isWindows = process.platform === 'win32'

mkdirSync(binDir, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

const exe = (name) => (isWindows ? `${name}.exe` : name)

async function download(url, destination) {
  process.stdout.write(`→ ${url}\n`)
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`HTTP ${response.status} al descargar ${url}`)
  await pipeline(response.body, createWriteStream(destination))
}

async function ensureYtDlp() {
  const target = path.join(binDir, exe('yt-dlp'))
  if (existsSync(target)) {
    console.log(`✓ yt-dlp ya existe en ${target}`)
    return
  }

  const urls = {
    win32: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    darwin: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    linux: `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux${process.arch === 'arm64' ? '_aarch64' : ''}`,
  }
  const url = urls[process.platform]
  if (!url) throw new Error(`Plataforma no soportada: ${process.platform}`)
  await download(url, target)
  if (!isWindows) chmodSync(target, 0o755)
  console.log(`✓ yt-dlp listo`)
}

async function ensureFfmpeg() {
  const target = path.join(binDir, exe('ffmpeg'))
  if (existsSync(target)) {
    console.log(`✓ ffmpeg ya existe en ${target}`)
    return
  }

  if (process.platform === 'win32') {
    const archive = path.join(tmpDir, 'ffmpeg.zip')
    await download(
      'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip',
      archive,
    )
    const extracted = path.join(tmpDir, 'ffmpeg-extracted')
    rmSync(extracted, { recursive: true, force: true })
    execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${extracted}' -Force`,
    ])
    const found = findFile(extracted, 'ffmpeg.exe')
    if (!found) throw new Error('No se encontró ffmpeg.exe dentro del archivo descargado')
    renameSync(found, target)
    console.log('✓ ffmpeg listo')
    return
  }

  if (process.platform === 'darwin' && process.arch === 'arm64') {
    console.warn('! ffmpeg para macOS arm64: instalalo con "brew install ffmpeg" y copiá el binario a src-tauri/binaries/ffmpeg')
    return
  }

  if (process.platform === 'darwin') {
    const archive = path.join(tmpDir, 'ffmpeg.zip')
    await download('https://evermeet.cx/ffmpeg/getrelease/zip', archive)
    execFileSync('unzip', ['-o', archive, '-d', path.join(tmpDir, 'ffmpeg-extracted')])
    const found = findFile(path.join(tmpDir, 'ffmpeg-extracted'), 'ffmpeg')
    if (!found) throw new Error('No se encontró el binario ffmpeg')
    renameSync(found, target)
    chmodSync(target, 0o755)
    console.log('✓ ffmpeg listo')
    return
  }

  if (process.platform === 'linux') {
    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
    const archive = path.join(tmpDir, `ffmpeg-${arch}.tar.xz`)
    await download(`https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${arch}-static.tar.xz`, archive)
    const extracted = path.join(tmpDir, 'ffmpeg-extracted')
    rmSync(extracted, { recursive: true, force: true })
    mkdirSync(extracted, { recursive: true })
    execFileSync('tar', ['-xf', archive, '-C', extracted])
    const found = findFile(extracted, 'ffmpeg')
    if (!found) throw new Error('No se encontró el binario ffmpeg')
    renameSync(found, target)
    chmodSync(target, 0o755)
    console.log('✓ ffmpeg listo')
    return
  }

  console.warn(`! Plataforma sin descarga automática de ffmpeg: ${process.platform}`)
}

function findFile(directory, name) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = findFile(full, name)
      if (nested) return nested
    } else if (entry.name === name) {
      return full
    }
  }
  return null
}

try {
  await ensureYtDlp()
  await ensureFfmpeg()
  console.log('\nMotor listo. Reiniciá la app si estaba abierta.')
} catch (error) {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
