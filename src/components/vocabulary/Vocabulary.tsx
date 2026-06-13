import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import type { VocabStatus } from '../../types'
import { languageName, relativeTime } from '../../lib/format'
import { downloadTextFile, toAnki, toCSV, toQuizlet } from '../../services/export'
import { useToast } from '../../lib/toast'
import { DownloadIcon, TrashIcon } from '../Icons'

type StatusFilter = 'all' | VocabStatus

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'learning', label: 'Learning' },
  { key: 'known', label: 'Known' },
]

function markTerm(context: string, term: string) {
  if (!term) return context
  const idx = context.toLowerCase().indexOf(term.toLowerCase())
  if (idx < 0) return context
  return (
    <>
      {context.slice(0, idx)}
      <mark>{context.slice(idx, idx + term.length)}</mark>
      {context.slice(idx + term.length)}
    </>
  )
}

export default function Vocabulary() {
  const vocab = useStore((s) => s.vocab)
  const updateVocab = useStore((s) => s.updateVocab)
  const removeVocab = useStore((s) => s.removeVocab)
  const showToast = useToast((s) => s.show)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [lang, setLang] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const languages = useMemo(
    () => Array.from(new Set(vocab.map((v) => v.sourceLanguage))).sort(),
    [vocab],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vocab.filter((v) => {
      if (status !== 'all' && v.status !== status) return false
      if (lang && v.sourceLanguage !== lang) return false
      if (q) {
        const hay = `${v.term} ${v.translation} ${v.context}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [vocab, query, status, lang])

  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, known: 0 }
    for (const v of vocab) c[v.status]++
    return c
  }, [vocab])

  const doExport = (kind: 'anki' | 'quizlet' | 'csv') => {
    setExportOpen(false)
    if (filtered.length === 0) return
    if (kind === 'anki') {
      downloadTextFile('mero-anki.txt', toAnki(filtered), 'text/tab-separated-values')
      showToast(`Exported ${filtered.length} cards for Anki`)
    } else if (kind === 'quizlet') {
      downloadTextFile('mero-quizlet.txt', toQuizlet(filtered), 'text/tab-separated-values')
      showToast(`Exported ${filtered.length} terms for Quizlet`)
    } else {
      downloadTextFile('mero-vocabulary.csv', toCSV(filtered), 'text/csv')
      showToast(`Exported ${filtered.length} rows to CSV`)
    }
  }

  if (vocab.length === 0) {
    return (
      <div className="vocabulary">
        <div className="page-head">
          <h1>Vocabulary Bank</h1>
          <p>Words you mine while reading land here — with their meaning and the sentence they came from.</p>
        </div>
        <div className="empty">
          <h3>Nothing mined yet</h3>
          <p>
            Open a book, select a word or phrase, and tap <strong>Translate</strong> → <strong>Save to
            vocabulary</strong>. <Link to="/" style={{ color: 'var(--accent)' }}>Go to your library →</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="vocabulary">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1>Vocabulary Bank</h1>
          <p>
            {vocab.length} terms · {counts.new} new · {counts.learning} learning · {counts.known} known
          </p>
        </div>
        <div className="export-wrap">
          <button className="btn btn-primary" onClick={() => setExportOpen((o) => !o)}>
            <DownloadIcon /> Export
          </button>
          {exportOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 29 }}
                onClick={() => setExportOpen(false)}
              />
              <div className="export-menu">
                <button className="export-item" onClick={() => doExport('anki')}>
                  <strong>Anki</strong>
                  <span>Tab-separated deck with term, translation & context</span>
                </button>
                <button className="export-item" onClick={() => doExport('quizlet')}>
                  <strong>Quizlet</strong>
                  <span>Term / definition, ready to paste or import</span>
                </button>
                <button className="export-item" onClick={() => doExport('csv')}>
                  <strong>CSV</strong>
                  <span>Every field, for spreadsheets & backups</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="vocab-toolbar">
        <input
          className="input search"
          placeholder="Search terms, meanings, context…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-group">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={'chip' + (status === f.key ? ' active' : '')}
              onClick={() => setStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {languages.length > 1 && (
          <div className="filter-group">
            {languages.map((l) => (
              <button
                key={l}
                className={'chip' + (lang === l ? ' active' : '')}
                onClick={() => setLang(lang === l ? null : l)}
              >
                {languageName(l)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>No terms match</h3>
          <p>Try clearing the search or filters.</p>
        </div>
      ) : (
        <div className="vocab-list">
          {filtered.map((v) => (
            <div className="vocab-card" key={v.id}>
              <div className="v-head">
                <span className="v-term">{v.term}</span>
                <span className="v-translation">{v.translation}</span>
              </div>
              <div className="v-actions">
                <select
                  className="v-status"
                  value={v.status}
                  onChange={(e) => updateVocab(v.id, { status: e.target.value as VocabStatus })}
                  aria-label="Learning status"
                >
                  <option value="new">New</option>
                  <option value="learning">Learning</option>
                  <option value="known">Known</option>
                </select>
                <button
                  className="icon-btn"
                  onClick={() => removeVocab(v.id)}
                  aria-label="Delete entry"
                >
                  <TrashIcon />
                </button>
              </div>
              {v.context && <div className="v-context">“{markTerm(v.context, v.term)}”</div>}
              <div className="v-meta">
                <span className="tag">{languageName(v.sourceLanguage)}</span>
                {v.bookId && v.bookTitle && (
                  <Fragment>
                    <span>·</span>
                    <Link to={`/read/${v.bookId}`} style={{ color: 'var(--accent)' }}>
                      {v.bookTitle}
                    </Link>
                  </Fragment>
                )}
                <span>·</span>
                <span>{relativeTime(v.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
