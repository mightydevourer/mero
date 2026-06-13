// Export the vocabulary bank into formats consumed by the wider
// spaced-repetition ecosystem. Mero is a mining front-end, not a walled garden.

import type { VocabularyEntry } from '../types'
import { languageName } from '../lib/format'

function tsvField(value: string): string {
  // Anki/Quizlet TSV: tabs separate columns and newlines separate rows, so
  // those characters must be neutralised inside a field. With HTML enabled,
  // <br> renders as a line break on the card.
  return value.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')
}

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Anki text import format. Modern Anki (2.1.41+) honours the `#`-prefixed
 * header lines, mapping columns to Term / Translation / Context / Tags and
 * allowing HTML so line breaks and emphasis survive.
 */
export function toAnki(entries: VocabularyEntry[]): string {
  const header = [
    '#separator:tab',
    '#html:true',
    '#columns:Term\tTranslation\tContext\tTags',
    '#tags column:4',
  ].join('\n')

  const rows = entries.map((e) => {
    const tags = ['mero', languageName(e.sourceLanguage).toLowerCase(), e.status]
      .map((t) => t.replace(/\s+/g, '-'))
      .join(' ')
    const context = e.context ? `<i>${tsvField(e.context)}</i>` : ''
    return [tsvField(e.term), tsvField(e.translation), context, tags].join('\t')
  })

  return `${header}\n${rows.join('\n')}\n`
}

/** Quizlet "import from text": term, then a tab, then the definition. */
export function toQuizlet(entries: VocabularyEntry[]): string {
  return (
    entries
      .map((e) => {
        const def = e.context ? `${e.translation} — ${e.context}` : e.translation
        return `${tsvField(e.term)}\t${tsvField(def)}`
      })
      .join('\n') + '\n'
  )
}

/** Spreadsheet-friendly CSV with every field. */
export function toCSV(entries: VocabularyEntry[]): string {
  const header = ['Term', 'Translation', 'Context', 'Source', 'Target', 'Status', 'Book', 'Notes']
  const rows = entries.map((e) =>
    [
      e.term,
      e.translation,
      e.context,
      languageName(e.sourceLanguage),
      languageName(e.targetLanguage),
      e.status,
      e.bookTitle ?? '',
      e.notes ?? '',
    ]
      .map(csvField)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n') + '\n'
}

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
