#!/usr/bin/env node
/**
 * Valida los workflows antes de pushear:
 * - que exista `on` y `jobs`
 * - que cada `needs` apunte a un job real
 * - que cada job tenga `runs-on`
 * - que las actions estén fijadas a un SHA
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

const directory = '.github/workflows'
if (!existsSync(directory)) {
  console.log('Sin workflows para validar.')
  process.exit(0)
}

const files = readdirSync(directory).filter((file) => /\.ya?ml$/i.test(file))
const errors = []
const warnings = []

for (const file of files) {
  const full = path.join(directory, file)
  let document
  try {
    document = parse(readFileSync(full, 'utf8'))
  } catch (error) {
    errors.push(`${file}: YAML inválido (${error.message})`)
    continue
  }

  if (!document || typeof document !== 'object') {
    errors.push(`${file}: el documento está vacío`)
    continue
  }
  if (!document.on) errors.push(`${file}: falta la clave "on"`)
  if (!document.jobs || typeof document.jobs !== 'object') {
    errors.push(`${file}: falta la clave "jobs"`)
    continue
  }

  const jobs = Object.keys(document.jobs)

  for (const name of jobs) {
    const job = document.jobs[name]
    if (!job || typeof job !== 'object') {
      errors.push(`${file}: el job "${name}" está vacío`)
      continue
    }
    if (!job['runs-on'] && !job.uses) {
      errors.push(`${file}: el job "${name}" no tiene "runs-on"`)
    }

    const needs = job.needs ? (Array.isArray(job.needs) ? job.needs : [job.needs]) : []
    for (const dependency of needs) {
      if (!jobs.includes(dependency)) {
        errors.push(`${file}: "${name}" necesita "${dependency}", que no existe`)
      }
    }

    const steps = Array.isArray(job.steps) ? job.steps : []
    for (const step of steps) {
      if (!step?.uses) continue
      if (step.uses.startsWith('./') || step.uses.startsWith('docker://')) continue
      if (!/@[0-9a-f]{40}$/i.test(step.uses)) {
        warnings.push(`${file}: action sin pin de SHA: ${step.uses}`)
      }
    }
  }
}

for (const warning of warnings) console.warn(`! ${warning}`)

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  process.exit(1)
}

console.log(`✓ ${files.length} workflow(s) válidos${warnings.length ? ` (${warnings.length} avisos)` : ''}`)
