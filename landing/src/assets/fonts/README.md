# Fonts

The TTF files in this folder are used only at build time by
`scripts/generate-shared-image.mjs` (Satori + resvg). The site itself loads the
variable WOFF2 files from the `@fontsource-variable/*` packages.

| File | Family | Source | License |
| --- | --- | --- | --- |
| `Geist-Regular.ttf`, `Geist-SemiBold.ttf` | Geist | https://github.com/vercel/geist-font | SIL OFL 1.1 |
| `Inter-Regular.ttf`, `Inter-SemiBold.ttf` | Inter | https://github.com/rsms/inter | SIL OFL 1.1 |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono | https://github.com/JetBrains/JetBrainsMono | SIL OFL 1.1 |

Static instances were generated from the upstream variable fonts with
`fonttools varLib.instancer`. The full license text is in `OFL.txt`.

- Inter: Copyright 2016 The Inter Project Authors.
- Geist: Copyright 2024 The Geist Project Authors.
- JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors.
