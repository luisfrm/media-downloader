# Landing

La landing vive en `landing/` y se publica como **assets estáticos** en Cloudflare
Workers. No comparte toolchain, lockfile ni CI con la app de escritorio.

```
landing/
├─ src/pages/          index, descargar, privacidad, 404, robots.txt
├─ src/components/     Header, Footer, DownloadSection, FAQ, SEO…
├─ src/data/           site.ts (contenido) y release.json (versión + assets)
├─ src/assets/         capturas, icono y las fuentes del OG image
├─ scripts/            fetch-release, generate-shared-image, preview
├─ public/             shared-image.png, iconos, _headers, _redirects
├─ wrangler.jsonc      Worker assets-only
└─ astro.config.mjs    site, sitemap, Tailwind v4, CSP
```

## Por qué Astro y no Vite + React

La página no tiene estado ni formularios: es contenido y descargas. Astro genera
HTML estático y solo envía el JavaScript mínimo (hoy: un script de ~300 bytes que
detecta el sistema operativo). Un SPA de React enviaría el runtime completo para
mostrar texto, y el HTML inicial llegaría vacío a los crawlers.

El repo ya usa Vite 8 y Tailwind v4, así que Astro reutiliza el mismo motor. La
landing no copia los tokens de la app: es una superficie de marketing con su propio
tema (Cobalt), mientras `DESIGN.md` sigue gobernando la interfaz de escritorio.

## Diseño: Cobalt

El tema se eligió con el `theme.mjs` de Hallmark (1 de 3): papel frío casi blanco,
tinta azul gris, un solo cobalto eléctrico, **Familjen Grotesk** para titulares,
**IBM Plex Sans** para texto y **JetBrains Mono** para valores de máquina.

- La página sigue la anatomía **try** de un producto de escritorio: la acción de
  descarga por sistema en el hero, el producto en marcha con capturas reales, las
  plataformas, la tabla de descargas, la privacidad, las preguntas y una banda final
  con la descarga otra vez.
- La firma es la **cola real** con una descarga de X completada, no un mockup.
- El campo ASCII del hero es tráfico real del producto (plataformas, formatos,
  tamaños), no un fondo decorativo.
- Sin degradados en títulos, sin barras de navegador dibujadas, sin etiquetas en
  mayúsculas con tracking y sin puntos de estado decorativos.
- Los controles son keycaps con transición de `transform`, `box-shadow` y color;
  `prefers-reduced-motion` las reduce a cero.
- La shared image se regenera con el mismo tema y la misma captura.

La estructura y el sitemap no cambiaron: `/`, `/descargar`, `/privacidad`, `/404`.

## Por qué Workers Static Assets y no R2

La suposición de que R2 "no consume peticiones" es al revés para HTML:

| Opción | Requests | Coste |
| --- | --- | --- |
| **Worker assets-only** (lo que usamos) | **0 invocaciones de Worker**; los assets son gratis e ilimitados | $0 |
| R2 detrás de un Worker | 1 invocación de Worker por objeto + operaciones R2 | Worker + R2 |
| R2 con dominio público (sin Worker) | Sin Worker, pero es almacenamiento de objetos | R2 storage/egress |
| GitHub Releases | Sin coste para los instaladores | $0 |

`wrangler.jsonc` no declara `main` ni bindings: Cloudflare sirve `dist/` desde su
capa de assets. En el plan Free, las peticiones a assets **no cuentan** contra las
100.000 invocaciones diarias de Workers.

R2 tiene sentido si algún día querés espejar instaladores de cientos de MB. En ese
caso se usa un bucket público con dominio propio, no un proxy Worker. Por ahora los
instaladores viven en GitHub Releases, con checksums y atestación de procedencia.

## Requisitos para publicar

1. **Cuenta de Cloudflare** (el plan Free alcanza).
2. **Subdominio `workers.dev` habilitado** en el dashboard (Workers & Pages →
   Settings). Sin eso, `wrangler deploy` no puede darte una URL pública.
3. **Autenticación local**: `cd landing && pnpm exec wrangler login`.
4. **Secretos de GitHub** para el deploy automático:
   - `CLOUDFLARE_API_TOKEN`: token con la plantilla **Edit Cloudflare Workers**
     (Workers Scripts:Edit; si usás dominio propio, además Zone:Workers Routes:Edit).
   - `CLOUDFLARE_ACCOUNT_ID`: el ID de la cuenta (dashboard → Workers).
5. **Variable de repositorio** `LANDING_URL` con la URL final, por ejemplo
   `https://media-downloader.tudominio.com`. Se usa para canonical, sitemap, OG y
   JSON-LD. Si no existe, el build usa un placeholder.
6. **Dominio propio (opcional)**: agregá la zona a Cloudflare y descomentá `routes`
   en `wrangler.jsonc`:

   ```jsonc
   "routes": [{ "pattern": "media-downloader.tudominio.com", "custom_domain": true }]
   ```

   Después actualizá `LANDING_URL`.

Sin los secretos, el CI compila y valida la landing pero **no despliega**; deja el
aviso en el summary del job. El resto del repo sigue verde.

## Desarrollo

```bash
cd landing
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # astro check
pnpm build        # sincroniza release.json + genera la shared image + astro build
pnpm preview      # wrangler dev: sirve dist/ como el Worker real (http://localhost:8787)
pnpm deploy       # wrangler deploy
```

`pnpm preview` es la prueba que importa: valida `_headers`, `_redirects`, el
`not_found_handling` y las rutas sin extensión.

> No corras `pnpm build` mientras `wrangler dev` está sirviendo `dist/`: Wrangler
> vigila esa carpeta y puede intentar leer un asset que Astro acaba de borrar.
> Pará el preview, compilá y volvé a levantarlo.

## SEO

- `Seo.astro`: title, description, canonical normalizado (sin `.html`), OG/Twitter,
  `og:locale`, `max-image-preview:large`.
- JSON-LD: `SoftwareApplication` + `WebSite` + `FAQPage` en el home;
  `BreadcrumbList` en `/descargar`; `noindex` en 404.
- `@astrojs/sitemap` genera `sitemap-index.xml` / `sitemap-0.xml`.
- `robots.txt` se genera con la URL absoluta del sitemap.
- `og:image` apunta a `/shared-image.png` (1200×630).
- CSP con hashes: Astro firma los scripts inline y las hojas de estilo. No hay
  `'unsafe-inline'` en `script-src` ni `style-src`.
- Fuentes self-hosted (Inter, Geist, JetBrains Mono) con `unicode-range`.
- Capturas en WebP con `srcset`, dimensiones explícitas y `alt` descriptivo.
- No hay analytics, cookies ni requests a terceros.

## La shared image

`landing/scripts/generate-shared-image.mjs` renderiza la tarjeta social con
**Satori + resvg** en tiempo de build:

- 1200×630, fondo `#0B111E`, glow cian, wordmark e icono real de la app.
- Toma la captura `src/assets/app-home.png` y la recorta a la zona útil.
- Usa las fuentes TTF de `src/assets/fonts/` (Geist, Inter, JetBrains Mono).
- Genera también `apple-touch-icon.png`, `icon-192.png` e `icon-512.png`.

```bash
pnpm shared-image
```

La salida está commiteada para que un deploy no dependa de que el render funcione.
El script es determinístico: la misma entrada produce el mismo PNG.

## Sincronización con los releases

La landing no llama a GitHub en runtime. `scripts/fetch-release.mjs` consulta la
API en el build y escribe `src/data/release.json` con:

- versión, tag, fecha, URL del release;
- URLs y tamaños de `.exe`, `.msi`, `.AppImage`, `.deb`, `.dmg`;
- `SHA256SUMS.txt` e `INSTALL.md`.

Si la API falla (sin red, rate limit, fork sin token), conserva el archivo
commiteado y el build sigue. Los links directos se generan desde ese JSON; para
la versión más nueva siempre existe la página `/releases/latest`.

El workflow `Landing` se dispara con `workflow_run` cuando termina `Release`. Así,
al publicar `v0.1.1`, la landing se reconstruye y la tabla de descargas apunta a los
assets nuevos sin intervención manual.

## Aislamiento de CI

| Cambio | `CI` (Release) | `Landing` |
| --- | --- | --- |
| `src/**`, `src-tauri/**` | matriz de 3 SO | no-op (check verde) |
| `landing/**` | no-op (check verde) | build + deploy |
| `release: published` | — | rebuild + deploy |
| PR de landing | `CI` verde sin compilar la app | build (sin deploy) |

`build.yml` usa `dorny/paths-filter` para decidir si corre la matriz, y el job
agregado `CI` siempre reporta (incluye el caso "build skipped"). `landing.yml`
siempre reporta `Landing`, aunque no haya cambios. Por eso la protección de
`master` exige **`CI` + `Landing`** y no los cinco checks antiguos.

## Coste esperado

- Workers Free: assets ilimitados, 0 invocaciones.
- Build minutes: ~1 min por deploy de landing; la app solo corre cuando cambia.
- GitHub Releases: almacenamiento y bandwidth de los instaladores.

## Troubleshooting

| Síntoma | Causa / solución |
| --- | --- |
| El deploy no corre en `master` | Faltan `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Mirá el summary. |
| El canonical apunta al placeholder | Definí `LANDING_URL` en *Settings → Variables*. |
| 404 en `/descargar` | Sirve con `pnpm preview` (Worker), no con un servidor que no entienda `_redirects`. |
| `ENOENT` en `wrangler dev` al compilar | Pará el preview antes de `pnpm build`. |
| La versión de la landing está vieja | Revisá que el workflow `Landing` haya corrido tras el release, o ejecutalo a mano. |
