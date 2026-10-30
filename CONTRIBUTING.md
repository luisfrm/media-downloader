# Contributing

Thanks for taking the time to improve Media Downloader.

## Requirements

- Node 24 (see `.node-version`)
- pnpm 11.5.3 (see `packageManager` in `package.json`)
- Rust 1.98.1 (see `rust-toolchain.toml`)
- Tauri system dependencies for your OS: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

## Setup

```bash
pnpm install
pnpm setup:binaries
pnpm dev          # UI in the browser
pnpm tauri dev    # desktop app
```

`pnpm setup:binaries` downloads `yt-dlp` and `ffmpeg` into `src-tauri/binaries/`.
Those binaries are ignored by git and are also bundled as app resources for release builds.

## Before opening a pull request

```bash
pnpm check
```

That runs the frontend build, the typecheck, the TypeScript tests, the YAML lint and the Rust tests.

For end-to-end tests:

```bash
npx playwright install chromium --only-shell
pnpm test:e2e
```

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(ui): add subtitle track picker
fix(engine): resume downloads after a restart
test: cover playlist range selection
docs: explain cookie import
chore(deps): bump tauri
```

Keep each commit focused. Do not mix refactors with behavior changes.

## Pull requests

- Target `master`.
- Describe the user-facing change and how you tested it.
- CI builds Windows, Linux and macOS and runs the tests on every PR.
- A maintainer approval is required before merging.
- Squash merge only; the branch is deleted automatically.

Never commit:

- `src-tauri/binaries/*` (downloaded per platform).
- `dist/`, `src-tauri/target/`, `shots/`, `test-results/`.
- Credentials, cookies or personal download paths.

## Releases

Only maintainers publish. The process is documented in [docs/RELEASING.md](docs/RELEASING.md).

Do not create tags manually: CI creates the tag only after all three platform builds pass.
