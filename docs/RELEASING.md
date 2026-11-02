# Release

Un release es un comando. Este documento explica qué hace ese comando, qué hace CI
después y qué hacer cuando algo sale mal.

## La regla

La versión vive en `package.json`. Nada más.

`scripts/sync-version.mjs` la copia a `src-tauri/Cargo.toml`, `Cargo.lock` y
`tauri.conf.json`, así el binario, el MSI y el DMG llevan el mismo número.

Cuando la versión cambia y el push llega a `master`, CI publica. Cuando no cambia,
CI compila y testea pero no publica.

## Publicar

```bash
pnpm release:patch      # 0.1.0 → 0.1.1
pnpm release:minor      # 0.1.0 → 0.2.0
pnpm release:major      # 0.1.0 → 1.0.0
pnpm release:set 2.0.0  # versión exacta
```

Cada uno:

1. Verifica que el árbol esté limpio y que la versión no baje.
2. Bumpea `package.json`.
3. Sincroniza `Cargo.toml`, `Cargo.lock` y `tauri.conf.json`.
4. Commitea `chore(release): vX.Y.Z`.
5. Pushea la rama actual.

El tag **no** lo crea el script: lo crea CI cuando publica.

### Flujo con rama

```bash
git checkout -b release/0.1.1
pnpm release:patch
# se pushea la rama; abrí un PR
```

El PR corre la matriz completa y los checks. Cuando se mergea a `master`, el push
lleva la versión nueva y CI publica. Dos reglas hacen esto seguro:

- Un PR nunca publica, aunque tenga una versión nueva.
- El workflow se niega a publicar desde cualquier rama que no sea `master`.

`--no-push` deja el commit local:

```bash
pnpm release:patch --no-push
```

El script no corre en detached HEAD.

## Qué hace CI

Workflow: [`.github/workflows/build.yml`](../.github/workflows/build.yml)

```
changes ──┬─ version ── build ×3 (Windows · Linux · macOS) ── publish
          │
          └─ checks
                    └──────────── CI (agregado, siempre reporta)
```

| Job | Qué hace |
| --- | --- |
| `changes` | `dorny/paths-filter` decide si hay cambios de app (`src/**`, `src-tauri/**`, scripts, configs). Un push que solo toca `landing/**` o docs no compila la app. |
| `version` | Lee `package.json`, calcula `vX.Y.Z` y decide `publish`. En PRs siempre `false`. Si el tag/release ya existe, `false`. Con `force=true`, `true`. |
| `audit` | `pnpm audit --prod` (informativo). |
| `checks` | `pnpm lint:yaml`. |
| `build` ×3 | Windows, Linux y macOS en paralelo. Instala, baja yt-dlp/ffmpeg, compila, testea TS + Rust + E2E (Linux), firma si hay clave, empaqueta, normaliza y sube artifacts. |
| `publish` | Solo en `master` con `publish=true`: crea/retoma el **draft**, genera `latest.json` y `SHA256SUMS.txt`, firma la procedencia, sube todo y publica. |
| `CI` | Agregado: exige `changes`, `version` y `checks` en verde; acepta `build` `success` o `skipped`. Es el check requerido. |

Cada build corre `pnpm check` (bundle + typecheck + Vitest + lint YAML + Rust) y en
Linux además Playwright. `fail-fast: false`: si una plataforma falla, las otras
terminan y ves los tres resultados.

## Firma y actualizaciones

Si `TAURI_SIGNING_PRIVATE_KEY` está configurada, el build pasa
`--config src-tauri/tauri.signing.conf.json` y Tauri genera:

- `*.exe.sig` / `*.AppImage.sig` / `*.app.tar.gz.sig`;
- el `.app.tar.gz` de macOS (el updater no usa el `.dmg`).

Sin clave (por ejemplo un PR desde un fork) el build sigue, pero sin artefactos de
actualización. El job `publish` exige las firmas y falla si faltan.

`latest.json` se genera después de crear el draft para incluir las notas del
release. Formato y claves: [auto-updates.md](./AUTO_UPDATES.md).

## Drafts y releases inmutables

El pipeline **no** publica directo:

```
crear draft → subir assets → gh release edit --draft=false --latest
```

Un release publicado no se puede modificar. La consecuencia práctica: **no se
parchea un release**. Si el build salió mal, se publica una versión nueva.

La opción **immutable releases** del repositorio está activada: ni siquiera un
admin puede reemplazar assets de un release publicado.

Si el upload falla a mitad de camino, el draft queda. Se completa con:

Actions → **Release** → *Run workflow* → `force = true`.

Si el release ya está publicado, `force` falla con un mensaje que pide bumpear la
versión. No se sobreescribe.

## Artefactos

`scripts/collect-artifacts.mjs` normaliza los nombres:

```
Media-Downloader_0.1.1_windows-x64-setup.exe
Media-Downloader_0.1.1_windows-x64.msi
Media-Downloader_0.1.1_macos-arm64.dmg
Media-Downloader_0.1.1_macos-arm64.app.tar.gz
Media-Downloader_0.1.1_linux-x64.AppImage
Media-Downloader_0.1.1_linux-x64.deb
INSTALL.md
SHA256SUMS.txt
latest.json
```

Los `.sig` acompañan a los paquetes que pueden autoactualizarse.

## Reintentar a mano

Actions → **Release** → *Run workflow*.

- `force = false`: igual que un push normal.
- `force = true`: retoma un draft o republica si el release aún no existe.

No sobreescribe releases publicados.

## Aislamiento de la landing

La landing tiene su propio workflow (`landing.yml`). Un cambio en `landing/**` no
ejecuta la matriz de la app; un cambio en `src/**` no despliega la landing. El job
`Landing` siempre reporta (no-op si no hay cambios) y el job `CI` siempre reporta
(no-op si no hay cambios de app). Por eso la protección exige **`CI` + `Landing`**.

Cuando `Release` termina en `master`, `Landing` se dispara con `workflow_run` y
reconstruye la tabla de descargas con el release nuevo.

## Protección de `master`

| Control | Valor |
| --- | --- |
| PR obligatorio | Sí |
| Aprobaciones | 1, del code owner |
| Aprobaciones stale | Se descartan con commits nuevos |
| Checks requeridos | `CI`, `Landing` |
| Conversación resuelta | Sí |
| Force push / borrado | Bloqueado |
| Bypass de admin | Permitido (`pnpm release` puede pushear a `master`) |

Si activás “enforce admins”, `pnpm release` deja de funcionar en `master`; usá el
flujo con rama + PR.

## Cuando algo sale mal

| Problema | Qué hacer |
| --- | --- |
| Falla una plataforma | Corregí y pusheá otra vez. La versión no cambió, no se publica. |
| Falla `publish` después del draft | Reintentá con `force = true`. |
| Un build malo llegó a usuarios | Publicá un patch. No hay rollback. |
| Necesitás rehacer la misma versión | No se puede: bumpeá el patch. |
| Faltan las firmas | Configurá `TAURI_SIGNING_PRIVATE_KEY` y `_PASSWORD`. |
| El deploy de la landing se omite | Faltan los secretos de Cloudflare (ver [LANDING.md](./LANDING.md)). |
| Windows: `EXDEV` al mover artefactos | El temp está en `C:` y el workspace en `D:`. `collect-artifacts.mjs` usa `copyFileSync`, no `renameSync`. |

## Checklist antes de publicar

- [ ] `pnpm check` pasa localmente (incluye Rust)
- [ ] `cd landing && pnpm check && pnpm build` si tocaste la landing
- [ ] La rama está actualizada con `master`
- [ ] El bump es el que querés (`patch`, `minor`, `major` o `set`)
- [ ] El PR se mergeó y el run de `master` está verde
- [ ] No hay secretos en el stage (`git status`)
- [ ] `.secrets/` sigue fuera de git
