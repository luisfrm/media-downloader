# Media Downloader

App de escritorio para descargar video, audio, miniaturas y subtítulos de YouTube, X, TikTok, Instagram y Facebook. Elegís resolución, contenedor y formato de audio antes de encolar.

Dark UI en azul/cian, barra lateral colapsable, cola con progreso real y biblioteca local.

Landing y descargas: [código de la landing](landing/) · [cómo se despliega en Workers](docs/LANDING.md). El sitio es estático y se publica con Cloudflare Workers.

## Descargas

Última versión: **[v0.1.0](https://github.com/luisfrm/media-downloader/releases/latest)**

| Sistema | Instalador | Descarga |
|---|---|---|
| Windows 10/11 x64 | `Media-Downloader_0.1.0_windows-x64-setup.exe` (NSIS) | [Descargar](https://github.com/luisfrm/media-downloader/releases/download/v0.1.0/Media-Downloader_0.1.0_windows-x64-setup.exe) |
| Windows 10/11 x64 | `Media-Downloader_0.1.0_windows-x64.msi` | [Descargar](https://github.com/luisfrm/media-downloader/releases/download/v0.1.0/Media-Downloader_0.1.0_windows-x64.msi) |
| Linux x64 | `Media-Downloader_0.1.0_linux-x64.AppImage` | [Descargar](https://github.com/luisfrm/media-downloader/releases/download/v0.1.0/Media-Downloader_0.1.0_linux-x64.AppImage) |
| Linux x64 | `Media-Downloader_0.1.0_linux-x64.deb` | [Descargar](https://github.com/luisfrm/media-downloader/releases/download/v0.1.0/Media-Downloader_0.1.0_linux-x64.deb) |
| macOS arm64 | `Media-Downloader_0.1.0_macos-arm64.dmg` | [Descargar](https://github.com/luisfrm/media-downloader/releases/download/v0.1.0/Media-Downloader_0.1.0_macos-arm64.dmg) |

Los instaladores ya incluyen `yt-dlp` y `ffmpeg`. No hace falta instalar nada más.

- Instalación por sistema, SmartScreen/Gatekeeper y verificación de checksums: [docs/INSTALL.md](docs/INSTALL.md).
- El `.exe` (NSIS) y el AppImage se actualizan solos con paquetes firmados; el `.msi`, el `.deb` y el `.dmg` se reinstalan a mano. Ver [docs/AUTO_UPDATES.md](docs/AUTO_UPDATES.md).
- macOS Intel no está publicado todavía; solo `arm64`.
- Los nombres de archivo incluyen la versión. Para la versión más reciente usá siempre la [página de releases](https://github.com/luisfrm/media-downloader/releases/latest) o la [landing](https://media-downloader-landing.luisfrm.workers.dev/descargar).

## Stack

| Capa | Tecnología |
|---|---|
| Shell | Tauri 2 (Rust) |
| UI | React 19 + TypeScript + Vite 8 |
| Estilos | Tailwind CSS v4 con tokens propios |
| Estado | Zustand + persistencia local |
| Motor | yt-dlp + ffmpeg (bundled en el instalador) |
| Tooling | pnpm 11 + Node 24 + Rust 1.98 |

Rust solo hace de pegamento: resuelve binarios, lanza procesos, parsea progreso y persiste ajustes. yt-dlp hace la extracción; ffmpeg fusiona y convierte.

## Requisitos

- Node 24 (`.node-version`)
- pnpm 11.5.3 (`packageManager` en `package.json`)
- Rust 1.98.1 (`rust-toolchain.toml`) + toolchain de C++
- Windows: WebView2 (viene con Windows 10/11)
- macOS: Xcode Command Line Tools
- Linux: `webkit2gtk-4.1`, `libayatana-appindicator3`, `librsvg2`

## Arranque

```bash
pnpm install
pnpm setup:binaries   # descarga yt-dlp + ffmpeg a src-tauri/binaries
pnpm dev              # UI en el navegador (http://127.0.0.1:5173)
pnpm tauri dev        # app de escritorio real
```

En modo navegador, `dev/plugin.ts` expone el mismo contrato que los comandos de Tauri (`/api/probe`, `/api/downloads`, `/api/jobs`) para poder iterar la UI y correr Playwright sin compilar Rust.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | UI con motor real vía API de desarrollo |
| `pnpm tauri dev` | App de escritorio |
| `pnpm test` | Tests unitarios y de componentes (Vitest) |
| `pnpm test:e2e` | E2E con Playwright |
| `pnpm test:rust` | Tests de Rust (parser de progreso y paths) |
| `pnpm check` | Build + typecheck + tests TS + lint YAML + tests Rust |
| `pnpm build` | Typecheck + build de producción |
| `pnpm build:installer` | Instaladores locales (`tauri build`) |
| `pnpm setup:binaries` | Descarga yt-dlp y ffmpeg para tu SO |
| `pnpm release:patch` | Bump patch + commit + push; CI publica al llegar a `master` |
| `pnpm release:minor` / `major` / `set X.Y.Z` | Igual, con otro salto de versión |
| `cd landing && pnpm dev` | Landing en `http://localhost:4321` |
| `cd landing && pnpm build` | Landing estática (sincroniza el último release y el OG) |

## Arquitectura

```
React (WebView)
  └─ engine.ts  ── invoke/listen ──  Rust (Tauri)
                                     ├─ probe      → yt-dlp -J
                                     ├─ download   → yt-dlp + progreso
                                     ├─ convert    → ffmpeg
                                     ├─ settings   → settings.json
                                     └─ registry   → pausa / cancelación
```

- `src/lib/probe.ts` normaliza el JSON crudo de yt-dlp y construye las opciones de calidad (muxed vs. merge, tamaños estimados, HDR, subtítulos).
- `src/lib/ytdlp.ts` arma los argumentos de yt-dlp/ffmpeg. La UI es la única fuente de verdad; Rust solo ejecuta.
- La cola vive en el frontend y se persiste; Rust es un ejecutor sin estado. Al reiniciar, lo que estaba activo queda pausado y se reanuda con `-c`.
- El estado se agrupa explícitamente: **En curso** (activas, en cola, en pausa, con error) y **Finalizadas**. La cola repite esos grupos con contadores.
- Los binarios del motor se empaquetan como recursos (`src-tauri/tauri.*.conf.json`) y se resuelven primero desde `app_data/bin`, luego desde `resource_dir()/bin`, luego desde `src-tauri/binaries` (solo dev) y por último el `PATH`.

### Nota sobre Windows

yt-dlp (Python 3.14) falla con `OSError: [Errno 22]` al escribir el progreso en un pipe anónimo creado por `std::process`. Por eso el ejecutor de Rust no usa `Stdio::piped()` para la descarga: escribe stdout/stderr a un log temporal y lo lee de forma incremental cada 150 ms. Es el mismo enfoque que usan otros wrappers de yt-dlp y además evita bloqueos por buffer lleno.

## Decisiones de producto

- **Pausa real**: yt-dlp no tiene pausa nativa. Se mata el proceso y se reanuda con el `.part` existente.
- **Progreso**: se emite como máximo ~8 veces por segundo para no saturar React.
- **Playlists**: se prueban con `--flat-playlist`, se seleccionan ítems y se descargan con `--playlist-items 1-3,7`.
- **Sin cuenta**: todo es local. Las cookies se leen del navegador que elijas y nunca salen del equipo.
- **Límites**: no se evade DRM ni se accede a contenido privado. Instagram y Facebook suelen requerir sesión; la app lo explica en Ajustes.

## Tests

```bash
pnpm test                # 91 tests unitarios y de componentes
pnpm test:rust           # 11 tests de Rust (progreso, paths, runtime)
pnpm test:e2e            # 6 flujos E2E en Chromium (sin red: yt-dlp stubbeado)
```

Para probar la **app de escritorio real** con Playwright (CDP):

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
pnpm tauri dev
# en otra terminal
node e2e/native.mjs
```

Ese script analiza el link real de X, descarga el MP4 y verifica que pase a **Finalizadas**.

## Flujo de release

La versión vive en un solo lugar: `package.json`.

```bash
git checkout -b release/0.1.1
pnpm release:patch     # 0.1.1
# o: pnpm release:minor | release:major | release:set 2.0.0
```

`scripts/release.mjs`:

1. Verifica que el árbol de trabajo esté limpio y que la versión no baje.
2. Sube `version` en `package.json`.
3. Ejecuta `scripts/sync-version.mjs` → `Cargo.toml`, `Cargo.lock` y `tauri.conf.json`.
4. Commitea `chore(release): vX.Y.Z`.
5. Pushea la rama actual (`--no-push` para dejarlo local).

El tag **no** lo crea el script: lo crea CI cuando publica. Un PR nunca publica;
el push del merge a `master` es el que dispara el release.

### Qué hace CI

Workflow: `.github/workflows/build.yml`

| Job | Qué hace |
|---|---|
| `changes` | Detecta si hay cambios de app. Un push que solo toca `landing/**` o docs no compila la app. |
| `version` | Lee `package.json` y decide `publish`. En PRs siempre `false`; si el tag/release existe, `false`; con `force=true`, `true`. |
| `audit` | `pnpm audit --prod` (informativo). |
| `checks` | `pnpm lint:yaml`. |
| `build` ×3 | Windows, Linux y macOS: instala, baja `yt-dlp`/`ffmpeg`, compila, testea TS + Rust + E2E (Linux), firma, empaqueta y sube artifacts. |
| `publish` | Solo en `master` con `publish=true`: crea/retoma un **draft**, genera `latest.json` + `SHA256SUMS.txt`, firma la procedencia, sube los assets y publica. |
| `CI` | Agregado que siempre reporta. Es el check requerido junto a `Landing`. |

Resultado: 5 instaladores + `.sig` de actualización + `.app.tar.gz` de macOS +
`INSTALL.md` + `SHA256SUMS.txt` + `latest.json`.

### Reglas

- **Push sin bump de versión**: compila y testea, pero **no publica**.
- **PR**: compila y testea, nunca publica.
- **Reintentar / completar un draft**: Actions → **Release** → *Run workflow* → `force`.
- **Release ya publicado**: es inmutable; no se sobreescribe. Se publica una versión nueva.
- **Firma**: el `.exe` (NSIS) y el AppImage se actualizan solos con minisign. El `.msi`, `.deb` y `.dmg` son manuales. Claves en [docs/AUTO_UPDATES.md](docs/AUTO_UPDATES.md).
- **Landing**: workflow aparte. Un push a `landing/**` no corre la matriz de la app; al publicar un release, `Landing` se reconstruye con `workflow_run`.

Detalle completo (branch protection, drafts, trampas conocidas): [docs/RELEASING.md](docs/RELEASING.md).
Landing y Workers: [docs/LANDING.md](docs/LANDING.md).
Instalación por sistema: [docs/INSTALL.md](docs/INSTALL.md).

## Estado

- [x] UI completa (home, cola, biblioteca, conversor, ajustes)
- [x] Detección de plataforma, análisis real, playlists, selección de calidad
- [x] Descarga con progreso, pausa/reanudar/cancelar, historial
- [x] Backend Tauri con ejecución de procesos y persistencia
- [x] Motor empaquetado en los instaladores (yt-dlp + ffmpeg)
- [x] Release multiplataforma automatizado con checksums y attestation
- [x] Actualizaciones firmadas en Windows `.exe` y Linux AppImage
- [x] Landing estática con SEO, shared image y deploy en Cloudflare Workers
- [x] CI separado para app y landing (checks `CI` + `Landing`)
- [ ] Firma de código Windows / notarización macOS (SmartScreen/Gatekeeper)
- [ ] macOS Intel (el matrix publica solo arm64)
