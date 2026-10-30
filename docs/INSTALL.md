# Install Media Downloader

Download the file for your system from the
[latest release](https://github.com/luisfrm/media-downloader/releases/latest).

| System | File |
| --- | --- |
| Windows 10/11 (x64) | `Media-Downloader_<version>_windows-x64-setup.exe` or `.msi` |
| Linux (x64) | `Media-Downloader_<version>_linux-x64.AppImage` or `.deb` |
| macOS (Apple Silicon) | `Media-Downloader_<version>_macos-arm64.dmg` |

The installers bundle `yt-dlp` and `ffmpeg`: you do not need to install anything else.
Downloads are saved to `~/Downloads/Media Downloader` by default and can be changed
from the app (command bar or Settings).

## Windows

1. Run `..._windows-x64-setup.exe` (NSIS) or the `.msi`.
2. Windows SmartScreen may warn because the build is **not code-signed yet**.
   Choose **More info → Run anyway**.
3. Requires WebView2, which ships with Windows 10/11. If it is missing, install it
   from Microsoft's WebView2 page.

Silent install (MSI):

```powershell
msiexec /i .\Media-Downloader_<version>_windows-x64.msi /qn
```

## Linux

AppImage:

```bash
chmod +x Media-Downloader_<version>_linux-x64.AppImage
./Media-Downloader_<version>_linux-x64.AppImage
```

Debian / Ubuntu:

```bash
sudo apt install ./Media-Downloader_<version>_linux-x64.deb
```

The AppImage needs FUSE 2 (`libfuse2` on Ubuntu 22.04+). If running it fails,
extract and run instead:

```bash
./Media-Downloader_<version>_linux-x64.AppImage --appimage-extract-and-run
```

## macOS (Apple Silicon)

1. Open the `.dmg` and drag **Media Downloader** into **Applications**.
2. The build is **not notarized yet**, so Gatekeeper will block the first launch.
   Right-click the app → **Open** → **Open**, or allow it from
   **System Settings → Privacy & Security**.
3. If macOS still refuses: `xattr -dr com.apple.quarantine "/Applications/Media Downloader.app"`.

Only `arm64` is published at the moment. Intel Macs are not supported by the
current release matrix.

## Verify the download

Each release includes `SHA256SUMS.txt`.

Linux:

```bash
sha256sum --ignore-missing -c SHA256SUMS.txt
```

macOS:

```bash
shasum -a 256 --ignore-missing -c SHA256SUMS.txt
```

Windows PowerShell:

```powershell
Get-FileHash .\Media-Downloader_<version>_windows-x64-setup.exe -Algorithm SHA256
# compare with the matching line in SHA256SUMS.txt
```

Build provenance (requires GitHub CLI):

```bash
gh attestation verify Media-Downloader_<version>_windows-x64-setup.exe --repo luisfrm/media-downloader
```

## First run

1. Paste a link from YouTube, X, TikTok, Instagram or Facebook.
2. Pick the resolution, container, audio format or subtitles.
3. Press **Descargar**. The file moves to **Finalizadas** when it completes.

Instagram and Facebook often need a logged-in session: enable
**Settings → Sessions and cookies** and choose the browser to read cookies from.

## Uninstall

- Windows: **Settings → Apps → Media Downloader → Uninstall**.
- Linux (deb): `sudo apt remove media-downloader`.
- macOS: drag the app to the Trash.
- Downloaded media and settings are kept; delete `~/Downloads/Media Downloader`
  and the app's config folder manually if you want a clean removal.
