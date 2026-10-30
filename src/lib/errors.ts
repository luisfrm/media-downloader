export function friendlyProbeError(raw: string): string {
  const message = raw.replace(/^ERROR:\s*/i, '').trim()

  if (/unsupported url/i.test(message)) {
    return 'Ese enlace todavía no está soportado. Probá con YouTube, X, TikTok, Instagram o Facebook.'
  }
  if (/confirm your age|age.?restricted|inappropriate for some users/i.test(message)) {
    return 'El contenido tiene restricción de edad. Configurá cookies del navegador en Ajustes → Sesiones.'
  }
  if (/sign in|log ?in|login required|cookies|private video|members.?only/i.test(message)) {
    return 'El contenido pide una sesión iniciada. Configurá cookies del navegador en Ajustes → Sesiones.'
  }
  if (/not available|removed|does not exist|404|unavailable/i.test(message)) {
    return 'El contenido no está disponible: puede haber sido borrado o restringido por región.'
  }
  if (/geo.?restrict|not available in your country/i.test(message)) {
    return 'El contenido está restringido en tu región.'
  }
  if (/timed? ?out|timeout|network|connection|temporary failure/i.test(message)) {
    return 'No hubo respuesta del sitio. Revisá tu conexión y probá otra vez.'
  }
  if (/no video formats|requested format/i.test(message)) {
    return 'No se encontraron formatos descargables para ese enlace.'
  }

  if (!message) return 'No se pudo analizar el enlace.'
  return message.length > 220 ? `${message.slice(0, 220)}…` : message
}

export function hasPlaylistParam(url: string): boolean {
  return /[?&]list=|[?&]playlist=|\/playlist\b/i.test(url)
}
