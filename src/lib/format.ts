export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  auto: 'Auto-detect',
}

export function languageName(code?: string): string {
  if (!code) return 'Unknown'
  return LANGUAGE_NAMES[code] ?? code.toUpperCase()
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function relativeTime(ts?: number): string {
  if (!ts) return 'never'
  const diff = Date.now() - ts
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(ts).toLocaleDateString()
}

/** First sentence (or a trimmed slice) of a paragraph, for compact previews. */
export function snippet(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + '…'
}
