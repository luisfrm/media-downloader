# Security policy

## Supported versions

Only the latest released version receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting on this repository:
**Security → Advisories → Report a vulnerability**.

Include:

- Affected version and operating system.
- Steps to reproduce.
- Impact (data exposure, code execution, etc.).
- Any suggested fix.

You should get an initial response within 72 hours.

## Scope

Media Downloader runs entirely on your machine:

- No telemetry, no analytics, no account.
- Browser cookies are read locally only when you enable that option.
- Downloads and conversions happen through the bundled `yt-dlp` and `ffmpeg` binaries.

Out of scope:

- Content downloaded by the user or violations of a platform's terms of service.
- DRM circumvention (the app does not implement it).
- Vulnerabilities in third-party platforms or in `yt-dlp`/`ffmpeg` themselves (report those upstream, but tell us if the app's integration makes them worse).

## Supply chain

- GitHub Actions are pinned to commit SHAs.
- `pnpm install` uses a frozen lockfile in CI and pnpm's supply-chain policy.
- Release artifacts include build provenance attestations and `SHA256SUMS.txt`.
