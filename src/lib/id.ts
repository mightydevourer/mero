/** Generate a reasonably unique id, preferring the platform UUID when available. */
export function uid(prefix = 'id'): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') {
    return `${prefix}_${c.randomUUID()}`
  }
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}_${time}${rand}`
}
