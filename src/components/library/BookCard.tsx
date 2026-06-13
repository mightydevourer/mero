import { useNavigate } from 'react-router-dom'
import type { Book, ReadingStatus } from '../../types'

export function coverGradient(color: string): string {
  return `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 62%, #000))`
}

const STATUS_LABEL: Record<ReadingStatus, string> = {
  reading: 'Reading',
  finished: 'Finished',
  unread: 'Unread',
}

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
}

export default function BookCard({ book }: { book: Book }) {
  const navigate = useNavigate()
  const open = () => navigate(`/read/${book.id}`)
  const showProgress = book.status !== 'unread'

  return (
    <div
      className="book-card"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className="cover" style={{ background: coverGradient(book.coverColor) }}>
        <span className="cover-lang">{book.language.toUpperCase()}</span>
        <div className="cover-title">{book.title}</div>
        <div className="cover-author">{book.author}</div>
      </div>
      <div className="card-body">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div className="card-meta">
          <StatusBadge status={book.status} />
          {book.tags.slice(0, 1).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        {showProgress && (
          <div className="progress" title={`${book.progress.percent}% read`}>
            <div className="progress-fill" style={{ width: `${book.progress.percent}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
