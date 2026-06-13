import { useState } from 'react'
import type { Highlight, HighlightColor } from '../../types'
import { TrashIcon } from '../Icons'

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'purple']

interface Props {
  highlight: Highlight
  x: number
  y: number
  onColor: (color: HighlightColor) => void
  onNote: (note: string) => void
  onDelete: () => void
  onClose: () => void
}

export default function HighlightPopover({
  highlight,
  x,
  y,
  onColor,
  onNote,
  onDelete,
  onClose,
}: Props) {
  const [note, setNote] = useState(highlight.note ?? '')

  return (
    <>
      <div className="panel-backdrop" style={{ background: 'transparent' }} onClick={onClose} />
      <div className="hl-popover" style={{ left: x, top: y }}>
        <div className="row">
          <div className="tk-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch swatch-${c}`}
                title={c}
                aria-label={`Recolor ${c}`}
                style={c === highlight.color ? { borderColor: 'var(--accent)' } : undefined}
                onClick={() => onColor(c)}
              />
            ))}
          </div>
          <button className="icon-btn danger" onClick={onDelete} aria-label="Delete highlight">
            <TrashIcon />
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
        />
        <div className="tk-note-actions" style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onNote(note)
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}
