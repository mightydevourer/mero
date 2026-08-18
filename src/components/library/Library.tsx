import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import type { Book, ReadingStatus } from '../../types'
import { relativeTime } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { useI18n } from '../../i18n'
import BookCard, { coverGradient } from './BookCard'

type StatusFilter = 'all' | ReadingStatus

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'unread', label: 'Unread' },
  { key: 'finished', label: 'Finished' },
]

const STANDALONE = '__standalone'

export default function Library() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const books = useStore((s) => s.books)
  const resetLibrary = useStore((s) => s.resetLibrary)
  const showToast = useToast((s) => s.show)

  /**
   * Books can be deleted but not added, so without this the library is a
   * one-way door: delete the last one and there is no way back to a text.
   */
  const restore = () => {
    if (!window.confirm(t('library.confirmRestore'))) return
    resetLibrary()
    showToast(t('library.restored'))
  }

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tag, setTag] = useState<string | null>(null)

  const continueReading = useMemo(
    () =>
      books
        .filter((b) => b.status === 'reading' || (b.progress.percent > 0 && b.progress.percent < 100))
        .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0))
        .slice(0, 8),
    [books],
  )

  const allTags = useMemo(
    () => Array.from(new Set(books.flatMap((b) => b.tags))).sort(),
    [books],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((b) => {
      if (status !== 'all' && b.status !== status) return false
      if (tag && !b.tags.includes(tag)) return false
      if (q) {
        const hay = `${b.title} ${b.author} ${b.tags.join(' ')} ${b.series ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [books, query, status, tag])

  const shelves = useMemo(() => {
    const map = new Map<string, Book[]>()
    for (const b of filtered) {
      const key = b.series ?? STANDALONE
      const list = map.get(key)
      if (list) list.push(b)
      else map.set(key, [b])
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === STANDALONE) return 1
      if (b[0] === STANDALONE) return -1
      return a[0].localeCompare(b[0])
    })
  }, [filtered])

  return (
    <div className="library">
      <div className="page-head">
        <h1>Library</h1>
        <p>Your personal reading archive. Open a text to read, mine vocabulary, and annotate.</p>
      </div>

      {continueReading.length > 0 && (
        <section>
          <h2 className="section-title">Continue Reading</h2>
          <div className="continue-row">
            {continueReading.map((b) => (
              <button
                key={b.id}
                className="continue-card"
                onClick={() => navigate(`/read/${b.id}`)}
              >
                <div className="mini-cover" style={{ background: coverGradient(b.coverColor) }} />
                <div className="continue-body">
                  <div className="book-title">{b.title}</div>
                  <div className="book-author">{b.author}</div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${b.progress.percent}%` }} />
                  </div>
                  <div className="continue-meta">
                    {b.progress.percent}% · {relativeTime(b.lastReadAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="lib-toolbar">
        <input
          className="input search"
          placeholder="Search title, author, tag…"
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
        <div className="filter-group">
          {allTags.map((t) => (
            <button
              key={t}
              className={'chip' + (tag === t ? ' active' : '')}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* An emptied library is a distinct state from "the filters match
          nothing", and it needs a way out: books can be deleted but not
          added, so this is the only route back to a text. */}
      {books.length === 0 ? (
        <div className="empty">
          <h3>{t('library.emptyTitle')}</h3>
          <p>{t('library.emptyBody')}</p>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={restore}>
            {t('library.restore')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>No books match</h3>
          <p>Try clearing the search or filters.</p>
        </div>
      ) : (
        shelves.map(([key, list]) => (
          <section className="shelf" key={key}>
            <h3 className="shelf-title">
              {key === STANDALONE ? 'Standalone' : key}
              <span className="count">{list.length} {list.length === 1 ? 'book' : 'books'}</span>
            </h3>
            <div className="book-grid">
              {list.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
