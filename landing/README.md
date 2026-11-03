# Media Downloader — landing

Sitio estático (Astro 7 + Tailwind v4) con la información del producto y las
descargas por sistema. Tema **Cobalt**: papel frío, cobalto, Familjen Grotesk,
IBM Plex Sans y JetBrains Mono. Se publica en Cloudflare Workers como assets, sin
backend.

- Documentación completa: [`docs/LANDING.md`](../docs/LANDING.md)
- Deploy: `pnpm deploy` (después de `wrangler login`)
- Build: `pnpm build` (sincroniza el último release y regenera la shared image)

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # astro check
pnpm build
pnpm preview      # wrangler dev (Worker real)
pnpm deploy
```

## Variables

| Nombre | Dónde | Para qué |
| --- | --- | --- |
| `SITE_URL` | entorno del build | canonical, sitemap, OG, JSON-LD |
| `LANDING_URL` | variable de GitHub | valor de `SITE_URL` en CI |
| `GITHUB_TOKEN` | CI | evitar el rate limit al leer el último release |
| `CLOUDFLARE_API_TOKEN` | secreto de GitHub | `wrangler deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | secreto de GitHub | `wrangler deploy` |

Sin `CLOUDFLARE_API_TOKEN`, el CI compila y valida pero no despliega.

## Releases

`src/data/release.json` guarda la versión y los assets del último release
(**v0.1.1** al momento de este commit). `pnpm build` lo reescribe con
`scripts/fetch-release.mjs` consultando la API de GitHub; si la API no responde,
se conserva el archivo commiteado como fallback. Para refrescarlo sin compilar:

```bash
pnpm sync:release
```
