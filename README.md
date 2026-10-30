# Media Downloader

App de escritorio para descargar video, audio, miniaturas y subtítulos de YouTube, X, TikTok, Instagram y Facebook. Elegís resolución, contenedor y formato de audio antes de encolar.

Dark UI en azul/cian, barra lateral colapsable, cola con progreso real y biblioteca local.

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
| `pnpm release patch` | Bump + commit + push; CI publica el release |

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
pnpm test                # 85 tests unitarios y de componentes
pnpm test:rust           # 6 tests de Rust
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

## Releases

El proceso es **version-driven**: la versión vive en `package.json` y CI decide si publica.

```bash
pnpm release patch     # 0.1.0 -> 0.1.1
```

Un push con versión nueva compila Windows, Linux y macOS, corre los tests, normaliza los instaladores, genera `SHA256SUMS.txt`, firma la procedencia y crea el release. Un push sin bump solo verifica.

Detalle completo, configuración de branch protection y trampas conocidas: [docs/RELEASING.md](docs/RELEASING.md).

Instalación por sistema: [docs/INSTALL.md](docs/INSTALL.md).

## Estado

- [x] UI completa (home, cola, biblioteca, conversor, ajustes)
- [x] Detección de plataforma, análisis real, playlists, selección de calidad
- [x] Descarga con progreso, pausa/reanudar/cancelar, historial
- [x] Backend Tauri con ejecución de procesos y persistencia
- [x] Motor empaquetado en los instaladores (yt-dlp + ffmpeg)
- [x] Release multiplataforma automatizado con checksums y attestation
- [ ] Firma de código Windows / notarización macOS
- [ ] Auto-update
- [ ] macOS Intel (el matrix publica solo arm64)
