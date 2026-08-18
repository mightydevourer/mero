/**
 * Trigger a browser download for text generated in the page.
 *
 * Used by the study backup export. Lives in lib/ rather than services/ because
 * it is a browser mechanism, not a domain service.
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the download a tick to start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
