import type { Plugin } from 'vite'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { parseProgressLine, detectPostProcess, parseFilePathLine } from '../src/lib/ytdlp.ts'

const isWin = process.platform === 'win32'

function binPath(name: string): string {
  return path.resolve(process.cwd(), 'src-tauri', 'binaries', isWin ? `${name}.exe` : name)
}

function resolveYtdlp(): { cmd: string; prefix: string[] } {
  const local = binPath('yt-dlp')
  if (fs.existsSync(local)) return { cmd: local, prefix: [] }
  return { cmd: isWin ? 'python' : 'python3', prefix: ['-m', 'yt_dlp'] }
}

function resolveFfmpeg(): string | null {
  const local = binPath('ffmpeg')
  if (fs.existsSync(local)) return local
  const dir = path.dirname(local)
  if (fs.existsSync(dir)) {
    const found = fs.readdirSync(dir).find((entry) => /^ffmpeg.*\.exe$/i.test(entry) || entry === 'ffmpeg')
    if (found) return path.join(dir, found)
  }
  return null
}

function defaultDownloadDir(): string {
  return path.join(os.homedir(), 'Downloads', 'Media Downloader')
}

function run(cmd: string, args: string[], timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { windowsHide: true })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('timeout'))
    }, timeoutMs)
    proc.stdout?.on('data', (chunk) => (out += chunk.toString()))
    proc.stderr?.on('data', (chunk) => (err += chunk.toString()))
    proc.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(out.trim())
      else reject(new Error(err.trim() || `exit ${code}`))
    })
  })
}

interface DevJob {
  id: string
  proc: ChildProcess | null
  phase: string
  percent: number
  downloadedBytes: number
  totalBytes: number | null
  speedBps: number | null
  etaSec: number | null
  filePath: string | null
  error: string | null
  seq: number
  paused: boolean
  canceled: boolean
  stderr: string[]
  startedAt: number
}

const jobs = new Map<string, DevJob>()

function touch(job: DevJob) {
  job.seq += 1
}

function killTree(job: DevJob) {
  const proc = job.proc
  if (!proc || proc.killed || proc.exitCode != null) return
  if (isWin && proc.pid) {
    spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true })
  } else {
    proc.kill('SIGTERM')
  }
}

function startJob(id: string, args: string[]) {
  const existing = jobs.get(id)
  if (existing) killTree(existing)

  const yt = resolveYtdlp()
  const ffmpeg = resolveFfmpeg()
  const fullArgs = [...yt.prefix, ...args, ...(ffmpeg ? ['--ffmpeg-location', ffmpeg] : [])]

  const job: DevJob = {
    id,
    proc: null,
    phase: 'fetching',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: null,
    speedBps: null,
    etaSec: null,
    filePath: null,
    error: null,
    seq: 1,
    paused: false,
    canceled: false,
    stderr: [],
    startedAt: Date.now(),
  }
  jobs.set(id, job)

  const proc = spawn(yt.cmd, fullArgs, { windowsHide: true })
  job.proc = proc

  proc.stdout?.setEncoding('utf8')
  proc.stderr?.setEncoding('utf8')

  let buffer = ''
  proc.stdout?.on('data', (chunk: string) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) handleLine(job, line)
  })

  proc.stderr?.on('data', (chunk: string) => {
    const lines = chunk.split(/\r?\n/).filter(Boolean)
    for (const line of lines) {
      if (job.stderr.length > 40) job.stderr.shift()
      job.stderr.push(line)
      if (/error|unable|failed|unsupported url/i.test(line) && !job.error) {
        job.error = line.trim()
      }
      touch(job)
    }
  })

  proc.on('error', (error) => {
    job.phase = 'error'
    job.error = error.message
    touch(job)
  })

  proc.on('close', (code) => {
    if (job.paused) {
      job.phase = 'paused'
    } else if (job.canceled) {
      job.phase = 'canceled'
    } else if (code === 0) {
      job.phase = 'done'
      job.percent = 1
      job.speedBps = null
      job.etaSec = null
    } else {
      job.phase = 'error'
      job.error = job.error ?? job.stderr.slice(-1)[0] ?? `yt-dlp terminó con código ${code}`
    }
    touch(job)
  })
}

function handleLine(job: DevJob, line: string) {
  const progress = parseProgressLine(line)
  if (progress) {
    job.phase = job.phase === 'processing' ? 'processing' : 'downloading'
    job.downloadedBytes = progress.downloadedBytes
    job.totalBytes = progress.totalBytes
    job.speedBps = progress.speedBps
    job.etaSec = progress.etaSec
    job.percent = progress.percent
    touch(job)
    return
  }

  if (detectPostProcess(line)) {
    job.phase = 'processing'
    job.speedBps = null
    job.etaSec = null
    touch(job)
    return
  }

  const filePath = parseFilePathLine(line)
  if (filePath && !/\s/.test(filePath.slice(-1))) {
    job.filePath = filePath
    touch(job)
  }
}

function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function json(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

async function probe(args: string[]): Promise<unknown> {
  const yt = resolveYtdlp()
  const ffmpeg = resolveFfmpeg()
  const fullArgs = [...yt.prefix, ...args, ...(ffmpeg ? ['--ffmpeg-location', ffmpeg] : [])]

  return new Promise((resolve, reject) => {
    const proc = spawn(yt.cmd, fullArgs, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('La consulta tardó demasiado. Probá de nuevo.'))
    }, 90_000)

    proc.stdout?.setEncoding('utf8')
    proc.stderr?.setEncoding('utf8')
    proc.stdout?.on('data', (chunk: string) => (stdout += chunk))
    proc.stderr?.on('data', (chunk: string) => (stderr += chunk))

    proc.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        const reason = stderr
          .split(/\r?\n/)
          .filter((line) => line.trim() && !line.startsWith('WARNING'))
          .slice(-3)
          .join(' ')
        reject(new Error(reason || 'No se pudo leer el enlace.'))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error('Respuesta inesperada del motor de descarga.'))
      }
    })
  })
}

export function devEngine(): Plugin {
  return {
    name: 'media-downloader-dev-engine',
    apply: 'serve',
    configureServer(server) {
      const yt = resolveYtdlp()
      const ffmpeg = resolveFfmpeg()

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (!url.pathname.startsWith('/api/')) return next()

        try {
          if (url.pathname === '/api/health' && req.method === 'GET') {
            let ytdlpVersion: string | null = null
            let ffmpegVersion: string | null = null
            try {
              ytdlpVersion = await run(yt.cmd, [...yt.prefix, '--version'])
            } catch {
              ytdlpVersion = null
            }
            if (ffmpeg) {
              try {
                const out = await run(ffmpeg, ['-version'])
                const match = out.match(/ffmpeg version\s+([^\s]+)/i)
                const version = match?.[1] ?? 'ok'
                ffmpegVersion = version.match(/^(\d+(?:\.\d+){0,2})/)?.[1] ?? version
              } catch {
                ffmpegVersion = null
              }
            }
            json(res, 200, {
              ytdlp: ytdlpVersion,
              ffmpeg: ffmpegVersion,
              binDir: path.resolve(process.cwd(), 'src-tauri', 'binaries'),
              platform: process.platform,
              defaultDir: defaultDownloadDir(),
            })
            return
          }

          if (url.pathname === '/api/probe' && req.method === 'POST') {
            const body = (await readBody(req)) as { args?: string[] }
            if (!Array.isArray(body.args)) return json(res, 400, { error: 'args requeridos' })
            const data = await probe(body.args)
            json(res, 200, { data })
            return
          }

          if (url.pathname === '/api/downloads' && req.method === 'POST') {
            const body = (await readBody(req)) as { id?: string; args?: string[] }
            if (!body.id || !Array.isArray(body.args)) return json(res, 400, { error: 'id y args requeridos' })
            startJob(body.id, body.args)
            json(res, 200, { ok: true })
            return
          }

          const actionMatch = url.pathname.match(/^\/api\/downloads\/([^/]+)\/(pause|cancel|resume)$/)
          if (actionMatch && req.method === 'POST') {
            const [, id, action] = actionMatch as unknown as [string, string, string]
            const job = jobs.get(id)
            if (!job) return json(res, 404, { error: 'job no encontrado' })
            if (action === 'pause') {
              job.paused = true
              killTree(job)
            } else if (action === 'cancel') {
              job.canceled = true
              killTree(job)
            } else if (action === 'resume') {
              job.paused = false
              job.phase = 'fetching'
              touch(job)
            }
            json(res, 200, { ok: true })
            return
          }

          if (url.pathname === '/api/jobs' && req.method === 'GET') {
            json(res, 200, {
              jobs: [...jobs.values()].map((job) => ({
                id: job.id,
                phase: job.phase,
                percent: job.percent,
                downloadedBytes: job.downloadedBytes,
                totalBytes: job.totalBytes,
                speedBps: job.speedBps,
                etaSec: job.etaSec,
                filePath: job.filePath,
                error: job.error,
                seq: job.seq,
              })),
            })
            return
          }

          if (url.pathname === '/api/convert' && req.method === 'POST') {
            const body = (await readBody(req)) as { id?: string; args?: string[] }
            if (!body.id || !Array.isArray(body.args)) return json(res, 400, { error: 'id y args requeridos' })
            if (!ffmpeg) return json(res, 400, { error: 'ffmpeg no está disponible' })
            const job: DevJob = {
              id: body.id,
              proc: null,
              phase: 'processing',
              percent: 0,
              downloadedBytes: 0,
              totalBytes: null,
              speedBps: null,
              etaSec: null,
              filePath: null,
              error: null,
              seq: 1,
              paused: false,
              canceled: false,
              stderr: [],
              startedAt: Date.now(),
            }
            jobs.set(body.id, job)
            const proc = spawn(ffmpeg, body.args, { windowsHide: true })
            job.proc = proc
            proc.stderr?.setEncoding('utf8')
            proc.stderr?.on('data', (chunk: string) => {
              for (const line of chunk.split(/\r?\n/)) {
                if (/error/i.test(line)) job.error = line.trim()
              }
            })
            proc.on('close', (code) => {
              if (code === 0) {
                job.phase = 'done'
                job.percent = 1
              } else {
                job.phase = 'error'
                job.error = job.error ?? 'La conversión falló'
              }
              touch(job)
            })
            json(res, 200, { ok: true })
            return
          }

          if (url.pathname === '/api/open' && req.method === 'POST') {
            const body = (await readBody(req)) as { path?: string }
            if (!body.path) return json(res, 400, { error: 'path requerido' })
            const dir = body.path
            if (isWin) spawn('explorer', [dir], { windowsHide: true, detached: true }).unref()
            else if (process.platform === 'darwin') spawn('open', [dir], { detached: true }).unref()
            else spawn('xdg-open', [dir], { detached: true }).unref()
            json(res, 200, { ok: true })
            return
          }

          json(res, 404, { error: 'no encontrado' })
        } catch (error) {
          json(res, 500, { error: error instanceof Error ? error.message : 'Error inesperado' })
        }
      })
    },
  }
}
