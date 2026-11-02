# Fonts

The TTF files in this folder are used only at build time by
`scripts/generate-shared-image.mjs` (Satori + resvg). The site loads the
variable WOFF2 files from `@fontsource-variable/*`.

| File | Family | Source | License |
| --- | --- | --- | --- |
| `FamiljenGrotesk-Medium.ttf`, `FamiljenGrotesk-SemiBold.ttf` | Familjen Grotesk | https://github.com/googlefonts/familjen-grotesk | SIL OFL 1.1 |
| `IBMPlexSans-Regular.ttf`, `IBMPlexSans-Medium.ttf` | IBM Plex Sans | https://github.com/IBM/plex | SIL OFL 1.1 |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono | https://github.com/JetBrains/JetBrainsMono | SIL OFL 1.1 |

Static instances were generated from the upstream variable fonts with
`fonttools varLib.instancer`. The full license text is in `OFL.txt`.

- Familjen Grotesk: Copyright 2023 The Familjen Grotesk Project Authors.
- IBM Plex Sans: Copyright 2017 The IBM Plex Project Authors.
- JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors.
