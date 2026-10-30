# Releasing

## The rule

There is a single source of truth: **`version` in `package.json`**.

- **Push to `master` with a new version** → CI builds Windows, Linux and macOS, then publishes a GitHub release.
- **Push without bumping the version** → CI builds and tests the same three platforms, but publishes nothing.
- **Pull request** → CI builds and tests, never publishes.

The tag is created by CI, not by your machine. If a build fails, no tag is left behind.

## Day-to-day

```bash
pnpm dev        # desktop app with hot reload
pnpm dev        # (same) Vite + Tauri
pnpm check      # frontend build + typecheck + TS tests + YAML lint + Rust tests
pnpm test:e2e   # Playwright (web, no network)
```

## Publish a version

```bash
pnpm release patch     # 0.1.0 -> 0.1.1
# or: pnpm release minor | major | 1.2.3
```

`scripts/release.mjs`:

1. Verifies the working tree is clean.
2. Bumps `package.json`.
3. Runs `scripts/sync-version.mjs` → `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`.
4. Commits `chore(release): vX.Y.Z`.
5. Pushes to the current branch.

It does **not** create a tag or a release.

## What CI does

Workflow: `.github/workflows/build.yml`

| Job | Runner | Purpose |
| --- | --- | --- |
| `version` | Ubuntu | Reads `package.json`, checks whether `vX.Y.Z` already exists, decides `publish` |
| `audit` | Ubuntu | `pnpm audit --prod` (informative, does not block) |
| `build` | matrix: Windows, Linux, macOS | Install, provision engine, build, test, bundle, normalize names, upload artifacts |
| `publish` | Ubuntu, only if `publish=true` | Download the three artifacts, add `INSTALL.md` + `SHA256SUMS.txt`, attest provenance, create/update the release |

Build matrix:

| Runner | Bundles | Artifact prefix |
| --- | --- | --- |
| `windows-latest` | `msi,nsis` | `Media-Downloader_<version>_windows-x64` |
| `ubuntu-22.04` | `deb,appimage` | `Media-Downloader_<version>_linux-x64` |
| `macos-latest` | `dmg` | `Media-Downloader_<version>_macos-arm64` |

Every build runs:

```bash
pnpm install --frozen-lockfile
pnpm setup:binaries        # yt-dlp + ffmpeg for that OS
pnpm build                 # dist/ is required by tauri::generate_context!
pnpm test                  # Vitest
pnpm test:rust             # cargo test
pnpm tauri build --bundles <...>
node scripts/collect-artifacts.mjs --prefix ...
```

## Republish the same version

Actions → **Release** → **Run workflow** → enable **force**.

The `version` job sets `publish=true` even if the release exists. The publish job
uploads the new files with `--clobber`.

## Local installers

```bash
pnpm setup:binaries
pnpm build:installer
```

Outputs:

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`
- `src-tauri/target/release/bundle/deb/`, `appimage/`, `dmg/` on those systems

## Repository settings (configure once)

**Settings → Branches → `master` protection**

- Require a pull request before merging (1 approval).
- Require review from Code Owners.
- Dismiss stale approvals.
- Require status checks: `Resolve version`, `Windows x64`, `Linux x64`, `macOS arm64`.
- Require conversation resolution.
- Do **not** allow force pushes or deletions.
- Do not enforce on admins (maintainers keep the bypass).

**Settings → General**

- Squash merge only.
- Delete branches on merge.

**Settings → Security**

- Dependabot alerts.
- Dependabot security updates.

## How the pieces fit

```
package.json version
        │
        ▼
scripts/sync-version.mjs ──► Cargo.toml + Cargo.lock + tauri.conf.json
        │
        ▼
scripts/release.mjs ──► commit + push
        │
        ▼
CI: version ─► build ×3 ─► publish
```

- `scripts/collect-artifacts.mjs` normalizes installer names and generates `SHA256SUMS.txt`.
- `scripts/lint-yaml.mjs` validates jobs, `needs` and SHA pinning before a push.
- `.github/dependabot.yml` groups npm, cargo and Actions updates weekly.

## Security decisions

- Global `permissions: contents: read`; only `publish` gets `contents: write`.
- `pull_request`, never `pull_request_target`.
- Third-party actions pinned to a 40-character commit SHA.
- No binaries in git: `src-tauri/binaries/` is ignored and provisioned per build.
- Release artifacts are attested with `actions/attest-build-provenance`.
- `concurrency` prevents two pushes from publishing the same version twice.

## Things that already bit us

| Trap | Symptom | Fix |
| --- | --- | --- |
| `cargo test` without `dist/` | `generate_context!` fails | run `pnpm build` before `pnpm test:rust` |
| Missing engine binaries | `tauri build` cannot resolve `bundle.resources` | run `pnpm setup:binaries` first |
| `paths-ignore` on `pull_request` | required checks never report, PR blocked forever | only use `paths-ignore` on `push` |
| Unpinned action tag | a moved tag can inject code into a release | pin to a commit SHA |
| Cross-compiling installers | no `.dmg`/`.deb` from Windows | build on each OS (the matrix does it) |
| Manual tag before CI | tag points to a failed build | let CI create the tag |

## Not implemented yet

- **Windows code signing** (OV/EV certificate or Azure Trusted Signing). Without it, SmartScreen warns.
- **macOS notarization** (Apple Developer + `notarytool`). Without it, Gatekeeper blocks.
- **Auto-update** (`tauri-plugin-updater` + `latest.json` + signing key).
- **Intel macOS** builds (add `macos-13` to the matrix if needed).
