import { openPath, revealPath } from './engine'

/** Datos mínimos para ubicar una descarga en el disco. */
export interface LocatedFile {
  filePath: string | null
  outputDir: string
}

/**
 * Abre el explorador con el archivo seleccionado. Si la descarga no expone un
 * archivo (por ejemplo, una playlist sin ruta final), abre la carpeta destino.
 */
export async function revealItem(item: LocatedFile): Promise<void> {
  if (item.filePath) return revealPath(item.filePath)
  return openPath(item.outputDir)
}

/** Abre el archivo con la aplicación por defecto del sistema (reproductor). */
export async function playItem(item: Pick<LocatedFile, 'filePath'>): Promise<void> {
  if (!item.filePath) throw new Error('El archivo no está disponible en el disco')
  return openPath(item.filePath)
}
