import { languageName } from '../../lib/format'
import type { TranslationResult } from '../../services/translation'
import { CloseIcon, PlusIcon } from '../Icons'

interface Props {
  source: string
  loading: boolean
  result: TranslationResult | null
  targetLanguage: string
  onClose: () => void
  onSave: () => void
}

export default function TranslationSheet({
  source,
  loading,
  result,
  targetLanguage,
  onClose,
  onSave,
}: Props) {
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Translation">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span className="lang-pill">
            {result ? languageName(result.detectedSourceLanguage) : 'Detecting…'}
          </span>
          <span className="arrow">→</span>
          <span className="lang-pill">{languageName(targetLanguage)}</span>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="sheet-source">{source}</div>

        <div className={'sheet-translation' + (loading ? ' loading' : '')}>
          {loading ? (
            <>
              <span className="spinner" />
              Translating…
            </>
          ) : (
            result?.translation
          )}
        </div>

        {!loading && result?.notes && (
          <div className={'sheet-notes' + (result.idiom ? ' idiom' : '')}>{result.notes}</div>
        )}

        <div className="sheet-actions">
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Mined from this passage</span>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" disabled={loading} onClick={onSave}>
            <PlusIcon /> Save to vocabulary
          </button>
        </div>
      </div>
    </>
  )
}
