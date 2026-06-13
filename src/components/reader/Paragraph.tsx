import { memo } from 'react'
import type { Highlight } from '../../types'
import { segmentParagraph } from '../../lib/highlight'

interface Props {
  index: number
  text: string
  highlights: Highlight[]
  onHighlightClick: (highlight: Highlight, rect: DOMRect) => void
}

function ParagraphImpl({ index, text, highlights, onHighlightClick }: Props) {
  const segments = segmentParagraph(text, highlights)
  return (
    <p className="para" data-paragraph-index={index}>
      {segments.map((seg, i) => {
        if (!seg.highlight) return <span key={i}>{seg.text}</span>
        const h = seg.highlight
        return (
          <mark
            key={i}
            className={`hl hl-${h.color}${h.note ? ' has-note' : ''}`}
            data-hl-id={h.id}
            title={h.note || undefined}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onHighlightClick(h, e.currentTarget.getBoundingClientRect())
            }}
          >
            {seg.text}
          </mark>
        )
      })}
    </p>
  )
}

export default memo(ParagraphImpl)
