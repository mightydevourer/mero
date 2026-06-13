import type { HighlightColor } from '../../types'
import { CopyIcon, NoteIcon, TranslateIcon } from '../Icons'

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'purple']

interface Props {
  x: number
  y: number
  noteMode: boolean
  noteDraft: string
  onNoteDraft: (value: string) => void
  onHighlight: (color: HighlightColor) => void
  onStartNote: () => void
  onCancelNote: () => void
  onSaveNote: () => void
  onTranslate: () => void
  onCopy: () => void
}

export default function SelectionToolkit(props: Props) {
  return (
    <div className="sel-toolkit" style={{ left: props.x, top: props.y }}>
      {props.noteMode ? (
        <div className="tk-note">
          <textarea
            autoFocus
            value={props.noteDraft}
            onChange={(e) => props.onNoteDraft(e.target.value)}
            placeholder="Write a note for this passage…"
          />
          <div className="tk-note-actions">
            <button className="btn btn-ghost" onClick={props.onCancelNote}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={props.onSaveNote}>
              Save note
            </button>
          </div>
        </div>
      ) : (
        // preventDefault on mousedown keeps the text selection alive while the
        // user clicks an action.
        <div className="tk-bar" onMouseDown={(e) => e.preventDefault()}>
          <div className="tk-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch swatch-${c}`}
                title={`Highlight ${c}`}
                aria-label={`Highlight ${c}`}
                onClick={() => props.onHighlight(c)}
              />
            ))}
          </div>
          <span className="tk-divider" />
          <button className="tk-btn" onClick={props.onStartNote}>
            <NoteIcon /> Note
          </button>
          <span className="tk-divider" />
          <button className="tk-btn accent" onClick={props.onTranslate}>
            <TranslateIcon /> Translate
          </button>
          <button className="tk-btn" onClick={props.onCopy} title="Copy" aria-label="Copy">
            <CopyIcon />
          </button>
        </div>
      )}
    </div>
  )
}
