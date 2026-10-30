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
| Motor | yt-dlp + ffmpeg (binarios locales) |

Rust solo hace de pegamento: resuelve binarios, lanza procesos, parsea progreso y persiste ajustes. yt-dlp hace la extracción; ffmpeg fusiona y convierte.

## Requisitos

- Node 20+
- Rust estable + toolchain de C++
- Windows: WebView2 (viene con Windows 10/11)
- macOS: Xcode Command Line Tools
- Linux: `webkit2gtk-4.1`, `libappindicator3`, `librsvg2`

## Arranque

```bash
npm install
npm run setup:engine   # descarga yt-dlp + ffmpeg a src-tauri/binaries
npm run dev            # UI en el navegador (http://localhost:5173)
npm run tauri dev      # app de escritorio real
```

En modo navegador, `dev/plugin.ts` expone el mismo contrato que los comandos de Tauri (`/api/probe`, `/api/downloads`, `/api/jobs`) para poder iterar la UI y correr Playwright sin compilar Rust.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | UI con motor real vía API de desarrollo |
| `npm run tauri dev` | App de escritorio |
| `npm test` | Tests unitarios y de componentes (Vitest) |
| `npm run test:e2e` | E2E con Playwright |
| `npm run build` | Typecheck + build de producción |
| `npm run setup:engine` | Descarga yt-dlp y ffmpeg para tu SO |

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
npm test                 # 85 tests unitarios y de componentes
npm run test:e2e         # 6 flujos E2E en Chromium (sin red: yt-dlp stubbeado)
```

Para probar la **app de escritorio real** con Playwright (CDP):

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
npm run tauri dev
# en otra terminal
node e2e/native.mjs
```

Ese script analiza el link real de X, descarga el MP4 y verifica que pase a **Finalizadas**.

## Estado

- [x] UI completa (home, cola, biblioteca, conversor, ajustes)
- [x] Detección de plataforma, análisis real, playlists, selección de calidad
- [x] Descarga con progreso, pausa/reanudar/cancelar, historial
- [x] Backend Tauri con ejecución de procesos y persistencia
- [ ] Instalación automática del motor desde la app (hoy: `npm run setup:engine`)
- [ ] Firma de código / notarización
