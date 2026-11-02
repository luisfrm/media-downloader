# Auto-updates

La app comprueba una vez al día si hay una versión nueva y ofrece instalarla. Solo
acepta paquetes firmados con la clave de este proyecto.

## Qué ve el usuario

```
app arranca
  └─ a los 10 s
       └─ ¿pasó 1 día desde la última comprobación? → no: no hace nada
            └─ consulta latest.json
                 ├─ sin red / error   → silencio, sin toast
                 ├─ misma versión     → nada
                 └─ versión nueva     → banner bajo la barra de título
                      "v0.2.0 está disponible · Actualizar"
```

- **Actualizar** descarga el paquete firmado y muestra el progreso en el banner.
- **Notas** despliega el cuerpo del release.
- **×** oculta el aviso 7 días.
- **Omitir** no vuelve a ofrecer esa versión (queda en Ajustes).
- **Ajustes → Actualizaciones** muestra la versión actual, el tipo de instalación,
  la última comprobación, un botón **Buscar** y el estado del skip.

Las actualizaciones se **bloquean si hay descargas activas** (`fetching`,
`downloading`, `processing`) o una conversión en curso. La app se reemplaza a sí
misma; si el proceso está usando yt-dlp o ffmpeg, la cola moriría.

## Dónde mira

```json
// src-tauri/tauri.conf.json
"plugins": {
  "updater": {
    "endpoints": [
      "https://github.com/luisfrm/media-downloader/releases/latest/download/latest.json"
    ],
    "pubkey": "…"
  }
}
```

`latest.json` lo genera el job `publish` con `scripts/latest-json.mjs` y se sube al
release:

```json
{
  "version": "0.1.1",
  "notes": "…",
  "pub_date": "2026-11-02T05:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "…minisign…",
      "url": "https://github.com/…/Media-Downloader_0.1.1_windows-x64-setup.exe"
    },
    "linux-x86_64": {
      "signature": "…",
      "url": "https://github.com/…/Media-Downloader_0.1.1_linux-x64.AppImage"
    },
    "darwin-aarch64": {
      "signature": "…",
      "url": "https://github.com/…/Media-Downloader_0.1.1_macos-arm64.app.tar.gz"
    }
  }
}
```

En Windows el updater descarga el NSIS y lo ejecuta en silencio. En Linux reemplaza
el AppImage. macOS queda manual hasta que la app esté firmada y notarizada.

## Claves

| Clave | Dónde |
| --- | --- |
| Pública | `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` |
| Privada | secreto `TAURI_SIGNING_PRIVATE_KEY` y `.secrets/tauri-updater.key` (gitignored) |
| Contraseña | secreto `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` y `.secrets/tauri-updater.password.txt` |

Se generaron con:

```bash
pnpm tauri signer generate -w .secrets/tauri-updater.key -p "<password>" --ci
```

**Si se pierde la clave privada o la contraseña, no se pueden firmar más
actualizaciones.** La app instalada rechaza cualquier paquete con otra clave. Guardá
`.secrets/` en un gestor de contraseñas y en una copia offline.

## Qué instalaciones se actualizan solas

La app consulta `runtime_info` (`src-tauri/src/runtime.rs`) para decidir:

| Instalación | Auto-update | Por qué |
| --- | --- | --- |
| Windows `.exe` (NSIS) | Sí | Instalación por usuario; reemplaza el binario |
| Linux AppImage | Sí | Reemplaza el archivo en su lugar |
| Linux `.deb` | No | Lo administra el gestor de paquetes |
| Windows `.msi` | No | Instalación por máquina en Program Files; el updater instalaría una segunda copia |
| macOS `.dmg` | No | Sin firma/notarización, Gatekeeper puede bloquear el reemplazo |
| `pnpm dev` | No | No hay binario empaquetado |

Cuando no se puede, el banner y Ajustes muestran un enlace a la página de releases en
lugar del botón de actualización.

## Estado entre actualizaciones

- Ajustes e historial viven en `localStorage`; el instalador no los toca.
- La cola se vacía por diseño: la actualización se bloquea con descargas activas.
- `lastCheck`, `snoozedUntil` y `skippedVersion` se guardan en
  `media-downloader.updater.v1`.

## Probar el flujo completo

Hacen falta **dos releases**:

1. Instalá la versión N (con el plugin updater).
2. Publicá N+1 con `latest.json` y los `.sig`.
3. Abrí la app y esperá 10 s (o usá Ajustes → Buscar).

En `pnpm dev` no aparece nada: el updater solo existe en builds empaquetados.

| Síntoma | Revisar |
| --- | --- |
| Nunca aparece el banner | `latest.json` está en `/releases/latest/download/latest.json` y es público |
| Aparece pero falla la instalación | El `.sig` corresponde al paquete y la `pubkey` es la que firmó |
| «Al día» con un release publicado | El release debe estar publicado (no draft) e incluir tu plataforma |
| Error de firma al compilar | Faltan `TAURI_SIGNING_PRIVATE_KEY` / `..._PASSWORD` o `createUpdaterArtifacts` |
| Windows descarga e instala dos copias | Se instaló el MSI; usá el `.exe` (NSIS) |
