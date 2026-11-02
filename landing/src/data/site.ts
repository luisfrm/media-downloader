export const site = {
  name: 'Media Downloader',
  tagline: 'Bajá videos y audio de tus redes.',
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
  { href: '/#funciones', label: 'Funciones' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#descargas', label: 'Descargas' },
  { href: '/#faq', label: 'FAQ' },
] as const

export const platforms = [
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0033',
    tint: 'rgba(255,0,51,0.10)',
    detail: '4K · MP3 · listas · subtítulos',
  },
  {
    id: 'x',
    name: 'X',
    color: '#E7E9EA',
    tint: 'rgba(231,233,234,0.08)',
    detail: 'MP4 directo · hasta 4K',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#25F4EE',
    tint: 'rgba(37,244,238,0.10)',
    detail: 'Sin marca de agua',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    tint: 'rgba(225,48,108,0.10)',
    detail: 'Reels · carruseles',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    tint: 'rgba(24,119,242,0.12)',
    detail: 'Watch · Reels',
  },
] as const

export const features = [
  {
    icon: 'sliders',
    title: 'Elegís calidad y formato',
    body: '4K, 1080p, 720p o solo audio. MP4, MKV, WebM, MP3 y FLAC, antes de empezar la descarga.',
  },
  {
    icon: 'audio',
    title: 'Audio y subtítulos aparte',
    body: 'Extraé la pista de audio o los subtítulos sin bajar el video completo. Se guardan junto al archivo.',
  },
  {
    icon: 'pause',
    title: 'Cola con progreso real',
    body: 'Pausá, reanudá o cancelá cada descarga. Velocidad, tamaño y tiempo restante en tiempo real.',
  },
  {
    icon: 'convert',
    title: 'Conversor local',
    body: 'Cambiá el contenedor o extraé audio de archivos que ya tenés, sin volver a descargarlos.',
  },
  {
    icon: 'folder',
    title: 'Biblioteca y carpeta propia',
    body: 'Elegí dónde se guarda cada archivo. El historial y los ajustes quedan en tu equipo.',
  },
  {
    icon: 'shield',
    title: 'Sin cuenta, sin servidores',
    body: 'No hay login ni backend propio. La app no envía tus enlaces a ningún lado: usa yt-dlp localmente.',
  },
] as const

export const steps = [
  {
    number: '01',
    title: 'Pegá el enlace',
    body: 'Copiá la URL del video, reel o playlist. La app detecta la plataforma y los formatos disponibles.',
  },
  {
    number: '02',
    title: 'Elegí qué bajar',
    body: 'Resolución, contenedor, audio y subtítulos. Si no querés pensar, “Mejor calidad” ya deja todo listo.',
  },
  {
    number: '03',
    title: 'Descargá y listo',
    body: 'La cola muestra el progreso real. Al terminar podés abrir la carpeta, convertirlo o verlo en la biblioteca.',
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
    a: 'Windows 10/11 x64, Linux x64 (AppImage o .deb) y macOS con Apple Silicon (arm64). macOS Intel todavía no está publicado.',
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
    arch: 'x64 · Windows 10/11',
    primary: 'windowsSetup',
    secondary: 'windowsMsi',
    primaryLabel: 'Instalador .exe',
    secondaryLabel: 'Paquete .msi',
    note: 'Instalación por usuario. El .exe se actualiza solo; el .msi se reinstala a mano.',
    icon: 'windows',
  },
  {
    os: 'linux',
    name: 'Linux',
    arch: 'x64 · glibc',
    primary: 'linuxAppImage',
    secondary: 'linuxDeb',
    primaryLabel: 'AppImage',
    secondaryLabel: 'Paquete .deb',
    note: 'El AppImage se actualiza solo. El .deb lo administra tu distribución.',
    icon: 'linux',
  },
  {
    os: 'macos',
    name: 'macOS',
    arch: 'Apple Silicon · arm64',
    primary: 'macosDmg',
    secondary: null,
    primaryLabel: 'Imagen .dmg',
    secondaryLabel: null,
    note: 'Firma y notarización pendientes: Gatekeeper puede pedir confirmación.',
    icon: 'apple',
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
