// Helpers for turning a DOM text selection into paragraph-relative character
// offsets that we can persist and later re-render as highlights.

export interface ParagraphSelection {
  paragraphEl: HTMLElement
  paragraphIndex: number
  start: number
  end: number
  text: string
  rect: DOMRect
}

/** Find the nearest ancestor that represents a reader paragraph. */
function closestParagraph(node: Node | null): HTMLElement | null {
  const el = node instanceof Element ? node : node?.parentElement ?? null
  return (el?.closest('[data-paragraph-index]') as HTMLElement | null) ?? null
}

/**
 * Character offset of a (node, offset) DOM position relative to the start of
 * `root`. Uses a Range so it works regardless of how many text nodes / inline
 * highlight spans the paragraph has been split into.
 */
function offsetWithin(root: Element, node: Node, nodeOffset: number): number {
  const range = document.createRange()
  range.selectNodeContents(root)
  try {
    range.setEnd(node, nodeOffset)
  } catch {
    return root.textContent?.length ?? 0
  }
  return range.toString().length
}

/**
 * Read the current selection and, if it lies within a single paragraph,
 * return its paragraph-relative offsets plus a bounding rect for positioning UI.
 * Returns null for collapsed, empty, or cross-paragraph selections.
 */
export function getParagraphSelection(): ParagraphSelection | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const selectedText = sel.toString()
  if (!selectedText.trim()) return null

  const range = sel.getRangeAt(0)
  const startPara = closestParagraph(range.startContainer)
  const endPara = closestParagraph(range.endContainer)
  // Only support selections contained within one paragraph.
  if (!startPara || startPara !== endPara) return null

  const paragraphEl = startPara
  const a = offsetWithin(paragraphEl, range.startContainer, range.startOffset)
  const b = offsetWithin(paragraphEl, range.endContainer, range.endOffset)
  const start = Math.min(a, b)
  const end = Math.max(a, b)
  if (end <= start) return null

  const paragraphIndex = Number(paragraphEl.getAttribute('data-paragraph-index'))
  const rect = range.getBoundingClientRect()

  return { paragraphEl, paragraphIndex, start, end, text: selectedText, rect }
}

export function clearSelection(): void {
  const sel = window.getSelection()
  sel?.removeAllRanges()
}
