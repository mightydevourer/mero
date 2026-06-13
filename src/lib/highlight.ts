import type { Highlight } from '../types'

export interface Segment {
  text: string
  highlight?: Highlight
}

/**
 * Split a paragraph's plain text into renderable segments, marking the ranges
 * covered by highlights. Overlapping highlights are resolved by letting the
 * earliest-starting one win and clamping any overlap from later ones.
 */
export function segmentParagraph(text: string, highlights: Highlight[]): Segment[] {
  if (highlights.length === 0) return [{ text }]

  const valid = highlights
    .filter((h) => h.start < h.end && h.start >= 0 && h.end <= text.length)
    .sort((a, b) => a.start - b.start || b.end - a.end)

  if (valid.length === 0) return [{ text }]

  const segments: Segment[] = []
  let cursor = 0

  for (const h of valid) {
    const start = Math.max(h.start, cursor)
    const end = Math.min(h.end, text.length)
    if (start >= end) continue // fully overlapped by an earlier highlight
    if (start > cursor) segments.push({ text: text.slice(cursor, start) })
    segments.push({ text: text.slice(start, end), highlight: h })
    cursor = end
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
