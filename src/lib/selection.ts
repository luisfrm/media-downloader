export function toPlaylistRanges(indices: number[]): string {
  if (!indices.length) return ''
  const sorted = [...new Set(indices)].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]!
  let previous = start

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]!
    if (current === previous + 1) {
      previous = current
      continue
    }
    parts.push(start === previous ? `${start}` : `${start}-${previous}`)
    start = current
    previous = current
  }

  parts.push(start === previous ? `${start}` : `${start}-${previous}`)
  return parts.join(',')
}

export function selectedSize<T extends { id: string }>(items: T[], selected: Set<string>): number {
  return items.filter((item) => selected.has(item.id)).length
}
