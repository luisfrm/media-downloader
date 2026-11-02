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
- The landing is static: no backend, no cookies, no third-party requests.

Out of scope:

- Content downloaded by the user or violations of a platform's terms of service.
- DRM circumvention (the app does not implement it).
- Vulnerabilities in third-party platforms or in `yt-dlp`/`ffmpeg` themselves (report those upstream, but tell us if the app's integration makes them worse).

## The model

- The web UI has no file-system access. All I/O goes through Rust commands
  registered in `src-tauri/src/lib.rs`.
- Tauri capabilities (`src-tauri/capabilities/default.json`) are kept to the
  minimum: `dialog`, `opener`, `updater`, `process`, `clipboard-manager` and the
  window permissions needed by the custom titlebar.
- No secrets live in the repository. `.secrets/` is gitignored.
- Pull requests from forks run with a read-only token and no secrets.

## CI permissions

The release workflow starts with read-only access. Only `publish` can write:

```yaml
permissions:
  contents: read          # default for every job
...
publish:
  permissions:
    contents: write       # release assets
    actions: read
    id-token: write       # provenance attestation
    attestations: write
```

The landing workflow only has `contents: read`; it deploys with a Cloudflare API
token stored as a secret. Fork PRs get neither secrets nor write access.

## Actions are pinned to a commit

Every `uses:` points to a full 40-character SHA, not a tag. A moved tag cannot
inject code into a build. Dependabot updates the SHAs weekly.

`pnpm lint:yaml` (part of `pnpm check` and the `checks` job) fails if a new action
uses a floating tag.

## Install scripts

pnpm blocks install scripts by default. The root workspace allows none. The
landing needs two native binaries and opts in explicitly:

```yaml
# landing/pnpm-workspace.yaml
allowBuilds:
  esbuild: true
  workerd: true
```

Adding a dependency with a postinstall script does nothing until someone adds it
there on purpose.

The root `pnpm-workspace.yaml` also carries pnpm's `minimumReleaseAge` policy for
supply-chain attacks; exceptions are listed explicitly.

## Repository protections

| Control | Value |
| --- | --- |
| Pull request required for `master` | Yes |
| Approvals required | 1, from the code owner |
| Stale approvals dismissed on new commits | Yes |
| Required checks | `CI`, `Landing` |
| Conversation must be resolved | Yes |
| Force push / branch deletion | Blocked |
| Admin bypass | Allowed (the owner can still run `pnpm release` on `master`) |
| Squash-only merges | Yes |
| Delete branch on merge | Yes |

`CI` is an aggregate in `build.yml`: it reports success when the app did not change
and the matrix was intentionally skipped. `Landing` does the same for the static
site. This keeps both checks meaningful without requiring a 3-OS build for a CSS
change.

## Release signing

Updates are signed with **minisign**. The private key lives in the GitHub secret
`TAURI_SIGNING_PRIVATE_KEY` and in `.secrets/tauri-updater.key` (gitignored). The
password lives in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` and
`.secrets/tauri-updater.password.txt`.

**If the private key or password is lost, no further updates can be signed.** Every
installed app will reject new packages. Back up `.secrets/` in a password manager
and offline.

`latest.json` is generated at publish time from the `.sig` files emitted by the
signed build. Publishing fails if a signature is missing.

## Supply chain

- `pnpm install --frozen-lockfile` in CI.
- Install scripts are blocked by default (see above).
- Release assets include `SHA256SUMS.txt` and a GitHub build provenance attestation.
- Releases are published as drafts first, then made public. A published release is
  not modified in place.

## If a secret leaks

1. **Rotate it first.** Assume it is public. Revoke the token, regenerate the key,
   change the password.
2. Remove it from the code and push.
3. Remove it from history if it was committed.
4. If it was a GitHub token, check the audit log for use.
5. If it was the signing key, publish a new key only if you control the distribution
   channel; otherwise users must reinstall manually.

Rotating is the part that matters. Deleting the commit is not enough.
