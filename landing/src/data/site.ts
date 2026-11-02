export const site = {
  name: 'Media Downloader',
  tagline: 'Bajá el video o el audio.',
  description:
    'Descargá videos, audio, miniaturas y subtítulos de YouTube, X, TikTok, Instagram y Facebook. Open source, sin cuenta y sin subir enlaces a un servidor.',
  repo: 'https://github.com/luisfrm/media-downloader',
  repoName: 'luisfrm/media-downloader',
  releases: 'https://github.com/luisfrm/media-downloader/releases',
  latestRelease: 'https://github.com/luisfrm/media-downloader/releases/latest',
  installDocs: 'https://github.com/luisfrm/media-downloader/blob/master/docs/INSTALL.md',
  security: 'https://github.com/luisfrm/media-downloader/security/policy',
  license: 'MIT',
  author: 'luisfrm',
} as const

export const nav = [
  { href: '/#producto', label: 'Producto' },
  { href: '/#plataformas', label: 'Plataformas' },
  { href: '/#preguntas', label: 'Preguntas' },
] as const

export const platforms = [
  {
    id: 'youtube',
    name: 'YouTube',
    what: 'Videos, playlists, audio y subtítulos',
    formats: 'MP4, MP3, FLAC, VTT',
  },
  {
    id: 'x',
    name: 'X',
    what: 'Videos y GIF',
    formats: 'MP4',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    what: 'Videos sin marca de agua',
    formats: 'MP4',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    what: 'Reels, carruseles y fotos',
    formats: 'MP4, JPG',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    what: 'Watch y Reels',
    formats: 'MP4',
  },
] as const

export const faqs = [
  {
    q: '¿Es gratis?',
    a: 'Sí. Media Downloader es open source y se distribuye bajo licencia MIT. No hay cuentas, anuncios ni versión paga.',
  },
  {
    q: '¿Tengo que instalar yt-dlp o ffmpeg?',
    a: 'No. Los instaladores incluyen yt-dlp y ffmpeg para tu sistema. Si compilás desde el código, podés bajarlos con pnpm setup:binaries.',
  },
  {
    q: '¿La app sube mis enlaces a un servidor?',
    a: 'No. La descarga la hace yt-dlp en tu equipo. Esta web es solo contenido estático: no tiene backend ni recibe tus enlaces.',
  },
  {
    q: '¿Qué sistemas están soportados?',
    a: 'Windows 10/11 x64, Linux x64 con AppImage o .deb, y macOS con Apple Silicon. macOS Intel todavía no está publicado.',
  },
  {
    q: '¿Puedo descargar playlists completas?',
    a: 'Sí, en YouTube. Al analizar una lista podés elegir la playlist completa o un video puntual antes de descargar.',
  },
  {
    q: '¿Sirve para contenido privado o con DRM?',
    a: 'No. La app no evade DRM ni accede a contenido privado. Descargá solo material que tengas derecho a usar.',
  },
  {
    q: '¿Cómo se actualiza?',
    a: 'El .exe de Windows y el AppImage de Linux se actualizan solos con paquetes firmados. El .msi, el .deb y el .dmg se reinstalan a mano.',
  },
  {
    q: '¿Dónde veo los checksums?',
    a: 'Cada release publica SHA256SUMS.txt junto a los instaladores. También podés verificar la procedencia desde GitHub Actions.',
  },
] as const

export const downloads = [
  {
    os: 'windows',
    name: 'Windows',
    arch: 'x64, Windows 10/11',
    primary: 'windowsSetup',
    secondary: 'windowsMsi',
    primaryLabel: 'Instalador .exe',
    secondaryLabel: 'Paquete .msi',
    note: 'Instalación por usuario. El .exe se actualiza solo; el .msi se reinstala a mano.',
  },
  {
    os: 'linux',
    name: 'Linux',
    arch: 'x64, glibc',
    primary: 'linuxAppImage',
    secondary: 'linuxDeb',
    primaryLabel: 'AppImage',
    secondaryLabel: 'Paquete .deb',
    note: 'El AppImage se actualiza solo. El .deb lo administra tu distribución.',
  },
  {
    os: 'macos',
    name: 'macOS',
    arch: 'Apple Silicon, arm64',
    primary: 'macosDmg',
    secondary: null,
    primaryLabel: 'Imagen .dmg',
    secondaryLabel: null,
    note: 'Firma y notarización pendientes: Gatekeeper puede pedir confirmación.',
  },
] as const

export type Download = (typeof downloads)[number]

export const jsonLdOrganization = {
  '@type': 'Organization',
  '@id': 'https://github.com/luisfrm',
  name: 'Media Downloader',
  url: 'https://github.com/luisfrm/media-downloader',
  sameAs: ['https://github.com/luisfrm/media-downloader'],
}
