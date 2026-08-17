import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useStore } from '../../store/useStore'
import type { Book, Highlight, HighlightColor } from '../../types'
import { clamp, languageName } from '../../lib/format'
import { clearSelection, getParagraphSelection } from '../../lib/selection'
import { getTranslationProvider, type TranslationResult } from '../../services/translation'
import { useToast } from '../../lib/toast'
import {
  ArrowLeft,
  BookIcon,
  ChevronLeft,
  ChevronRight,
  FocusIcon,
  ListIcon,
  TypeIcon,
} from '../Icons'
import Paragraph from './Paragraph'
import SelectionToolkit from './SelectionToolkit'
import TranslationSheet from './TranslationSheet'
import SettingsPanel from './SettingsPanel'
import HighlightPopover from './HighlightPopover'

export default function Reader() {
  const { bookId } = useParams()
  const book = useStore((s) => s.books.find((b) => b.id === bookId))
  if (!book) return <Navigate to="/" replace />
  // Remount (fresh state) when navigating between books.
  return <ReaderView key={book.id} book={book} />
}

interface Pending {
  paragraphIndex: number
  start: number
  end: number
  text: string
  context: string
}

interface ActiveHighlight {
  highlight: Highlight
  x: number
  y: number
}

interface TranslationState {
  open: boolean
  loading: boolean
  source: string
  context: string
  result: TranslationResult | null
}

function ReaderView({ book }: { book: Book }) {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const allHighlights = useStore((s) => s.highlights)
  const addHighlight = useStore((s) => s.addHighlight)
  const updateHighlight = useStore((s) => s.updateHighlight)
  const removeHighlight = useStore((s) => s.removeHighlight)
  const addVocab = useStore((s) => s.addVocab)
  const setProgress = useStore((s) => s.setProgress)
  const showToast = useToast((s) => s.show)

  const [chapterIndex, setChapterIndex] = useState(() =>
    clamp(book.progress.chapterIndex, 0, book.chapters.length - 1),
  )
  const chapter = book.chapters[chapterIndex]

  const [immersive, setImmersive] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chaptersOpen, setChaptersOpen] = useState(false)

  const [pending, setPending] = useState<Pending | null>(null)
  const [toolkit, setToolkit] = useState<{ x: number; y: number } | null>(null)
  const [noteMode, setNoteMode] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const [activeHL, setActiveHL] = useState<ActiveHighlight | null>(null)
  const [translation, setTranslation] = useState<TranslationState>({
    open: false,
    loading: false,
    source: '',
    context: '',
    result: null,
  })

  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pageGeom = useRef<{ W: number; margin: number } | null>(null)
  const pageRef = useRef(0)
  const progressTimer = useRef<ReturnType<typeof setTimeout>>()
  const scrollRaf = useRef(false)
  const lastScrollTop = useRef(0)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  // --- Derived data --------------------------------------------------------

  const totalParagraphs = useMemo(
    () => book.chapters.reduce((n, c) => n + c.paragraphs.length, 0),
    [book],
  )
  const paragraphsBefore = useMemo(
    () => book.chapters.slice(0, chapterIndex).reduce((n, c) => n + c.paragraphs.length, 0),
    [book, chapterIndex],
  )

  const hlByParagraph = useMemo(() => {
    const map = new Map<number, Highlight[]>()
    for (const h of allHighlights) {
      if (h.bookId !== book.id || h.chapterId !== chapter.id) continue
      const list = map.get(h.paragraphIndex)
      if (list) list.push(h)
      else map.set(h.paragraphIndex, [h])
    }
    return map
  }, [allHighlights, book.id, chapter.id])

  // --- Progress ------------------------------------------------------------

  const commitProgress = useCallback(
    (paragraphIndex: number, pageInfo?: { page: number; pageCount: number }) => {
      let percent: number
      if (settings.pageMode === 'paged' && pageInfo && pageInfo.pageCount > 0) {
        const frac = (pageInfo.page + 1) / pageInfo.pageCount
        percent = Math.round(
          ((paragraphsBefore + frac * chapter.paragraphs.length) / Math.max(1, totalParagraphs)) *
            100,
        )
      } else {
        const globalIndex = paragraphsBefore + paragraphIndex
        percent = Math.round((globalIndex / Math.max(1, totalParagraphs - 1)) * 100)
      }
      setProgress(book.id, { chapterIndex, paragraphIndex, percent: clamp(percent, 0, 100) })
    },
    [settings.pageMode, paragraphsBefore, chapter, totalParagraphs, chapterIndex, book.id, setProgress],
  )

  const scheduleProgress = useCallback(
    (paragraphIndex: number, pageInfo?: { page: number; pageCount: number }) => {
      if (progressTimer.current) clearTimeout(progressTimer.current)
      progressTimer.current = setTimeout(() => commitProgress(paragraphIndex, pageInfo), 500)
    },
    [commitProgress],
  )

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current)
    }
  }, [])

  // --- Paged layout --------------------------------------------------------

  const measurePages = useCallback(() => {
    if (settings.pageMode !== 'paged') return
    const vp = viewportRef.current
    const content = contentRef.current
    if (!vp || !content) return
    const W = vp.clientWidth
    if (W <= 0) return

    const minMargin = clamp(Math.round(W * 0.08), 28, 96)
    const colWidth = Math.max(220, Math.min(settings.contentWidth, W - 2 * minMargin))
    const margin = Math.round((W - colWidth) / 2)
    const gap = W - colWidth

    content.style.columnWidth = `${colWidth}px`
    content.style.columnGap = `${gap}px`

    const count = Math.max(1, Math.round((content.scrollWidth + gap) / W))
    const np = clamp(pageRef.current, 0, count - 1)

    pageGeom.current = { W, margin }
    content.style.setProperty('--page-x', `${margin - np * W}px`)
    setPageCount(count)
    if (np !== pageRef.current) setPage(np)
  }, [settings.pageMode, settings.contentWidth])

  // Re-measure when content or relevant typography changes.
  useLayoutEffect(() => {
    measurePages()
  }, [measurePages, chapterIndex, settings.fontSize, settings.lineHeight, settings.fontFamily, settings.justify])

  useEffect(() => {
    if (settings.pageMode !== 'paged') return
    const vp = viewportRef.current
    if (!vp) return
    const ro = new ResizeObserver(() => measurePages())
    ro.observe(vp)
    return () => ro.disconnect()
  }, [settings.pageMode, measurePages])

  // Slide to the active page.
  useEffect(() => {
    if (settings.pageMode !== 'paged') return
    const content = contentRef.current
    const geom = pageGeom.current
    if (content && geom) content.style.setProperty('--page-x', `${geom.margin - page * geom.W}px`)
  }, [page, settings.pageMode])

  // Persist paged progress.
  useEffect(() => {
    if (settings.pageMode === 'paged' && pageCount > 0) scheduleProgress(0, { page, pageCount })
  }, [page, pageCount, settings.pageMode, scheduleProgress])

  // --- Scroll mode progress + chrome auto-hide -----------------------------

  const handleScrollNow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const st = el.scrollTop
    if (st > lastScrollTop.current + 6 && st > 90) setImmersive(true)
    else if (st < lastScrollTop.current - 6) setImmersive(false)
    lastScrollTop.current = st

    const paras = contentRef.current?.querySelectorAll<HTMLElement>('.para')
    if (paras && paras.length) {
      const top = el.getBoundingClientRect().top + 100
      let idx = 0
      for (let i = 0; i < paras.length; i++) {
        if (paras[i].getBoundingClientRect().bottom >= top) {
          idx = Number(paras[i].dataset.paragraphIndex) || 0
          break
        }
      }
      scheduleProgress(idx)
    }
  }, [scheduleProgress])

  const onScroll = useCallback(() => {
    if (scrollRaf.current) return
    scrollRaf.current = true
    requestAnimationFrame(() => {
      scrollRaf.current = false
      handleScrollNow()
    })
  }, [handleScrollNow])

  // Restore reading position on first mount (scroll mode only).
  useEffect(() => {
    if (settings.pageMode !== 'scroll') return
    const idx = book.progress.paragraphIndex
    if (idx > 0 && chapterIndex === book.progress.chapterIndex) {
      const el = contentRef.current?.querySelector<HTMLElement>(`[data-paragraph-index="${idx}"]`)
      el?.scrollIntoView({ block: 'start' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Navigation ----------------------------------------------------------

  const goToChapter = useCallback(
    (i: number) => {
      const next = clamp(i, 0, book.chapters.length - 1)
      setChapterIndex(next)
      setPage(0)
      pageRef.current = 0
      setChaptersOpen(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
    },
    [book.chapters.length],
  )

  const dismiss = useCallback(() => {
    setToolkit(null)
    setPending(null)
    setNoteMode(false)
    setActiveHL(null)
  }, [])

  const nextPage = useCallback(() => {
    if (page < pageCount - 1) setPage(page + 1)
    else if (chapterIndex < book.chapters.length - 1) goToChapter(chapterIndex + 1)
  }, [page, pageCount, chapterIndex, book.chapters.length, goToChapter])

  const prevPage = useCallback(() => {
    if (page > 0) setPage(page - 1)
    else if (chapterIndex > 0) goToChapter(chapterIndex - 1)
  }, [page, chapterIndex, goToChapter])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false)
        setChaptersOpen(false)
        setTranslation((t) => ({ ...t, open: false }))
        dismiss()
      }
      if (settings.pageMode === 'paged') {
        if (e.key === 'ArrowRight') nextPage()
        if (e.key === 'ArrowLeft') prevPage()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings.pageMode, nextPage, prevPage, dismiss])

  // --- Selection + actions -------------------------------------------------

  const handleSelection = useCallback(() => {
    const sel = getParagraphSelection()
    setActiveHL(null)
    if (!sel || !contentRef.current?.contains(sel.paragraphEl)) {
      setPending(null)
      setToolkit(null)
      setNoteMode(false)
      return
    }
    const paraText = chapter.paragraphs[sel.paragraphIndex] ?? ''
    const text = paraText.slice(sel.start, sel.end) || sel.text
    setPending({
      paragraphIndex: sel.paragraphIndex,
      start: sel.start,
      end: sel.end,
      text,
      context: paraText || sel.text,
    })
    setToolkit({
      x: clamp(sel.rect.left + sel.rect.width / 2, 90, window.innerWidth - 90),
      y: Math.max(64, sel.rect.top - 10),
    })
    setNoteMode(false)
  }, [chapter])

  const onTouchEnd = useCallback(() => {
    window.setTimeout(handleSelection, 10)
  }, [handleSelection])

  const createHighlight = useCallback(
    (color: HighlightColor, note?: string) => {
      if (!pending) return
      addHighlight({
        bookId: book.id,
        chapterId: chapter.id,
        paragraphIndex: pending.paragraphIndex,
        start: pending.start,
        end: pending.end,
        text: pending.text,
        color,
        note,
      })
      clearSelection()
      dismiss()
    },
    [pending, addHighlight, book.id, chapter.id, dismiss],
  )

  const saveNote = useCallback(() => {
    createHighlight('yellow', noteDraft.trim() || undefined)
    setNoteDraft('')
  }, [createHighlight, noteDraft])

  const doTranslate = useCallback(async () => {
    if (!pending) return
    const source = pending.text
    const context = pending.context
    setTranslation({ open: true, loading: true, source, context, result: null })
    clearSelection()
    setToolkit(null)
    setNoteMode(false)
    try {
      const result = await getTranslationProvider().translate({
        text: source,
        targetLanguage: settings.targetLanguage,
      })
      setTranslation((t) => (t.open ? { ...t, loading: false, result } : t))
    } catch {
      setTranslation((t) =>
        t.open
          ? {
              ...t,
              loading: false,
              result: {
                translation: 'Translation failed. Please try again.',
                detectedSourceLanguage: 'auto',
                targetLanguage: settings.targetLanguage,
              },
            }
          : t,
      )
    }
  }, [pending, settings.targetLanguage])

  const copySelection = useCallback(() => {
    if (pending) {
      navigator.clipboard?.writeText(pending.text).catch(() => undefined)
      showToast('Copied to clipboard')
    }
    clearSelection()
    dismiss()
  }, [pending, showToast, dismiss])

  const saveTranslationToVocab = useCallback(() => {
    setTranslation((t) => {
      if (t.result) {
        addVocab({
          term: t.source,
          translation: t.result.translation,
          context: t.context,
          sourceLanguage: t.result.detectedSourceLanguage,
          targetLanguage: settings.targetLanguage,
          bookId: book.id,
          bookTitle: book.title,
        })
        showToast('Saved to vocabulary')
      }
      return { ...t, open: false }
    })
  }, [addVocab, settings.targetLanguage, book.id, book.title, showToast])

  // --- Highlight popover ---------------------------------------------------

  const onHighlightClick = useCallback((h: Highlight, rect: DOMRect) => {
    setToolkit(null)
    setPending(null)
    setActiveHL({
      highlight: h,
      x: clamp(rect.left + rect.width / 2, 90, window.innerWidth - 90),
      y: Math.max(64, rect.top - 8),
    })
  }, [])

  const recolorHighlight = useCallback(
    (color: HighlightColor) => {
      if (!activeHL) return
      updateHighlight(activeHL.highlight.id, { color })
      setActiveHL((a) => (a ? { ...a, highlight: { ...a.highlight, color } } : a))
    },
    [activeHL, updateHighlight],
  )

  const noteHighlight = useCallback(
    (note: string) => {
      if (activeHL) updateHighlight(activeHL.highlight.id, { note: note.trim() || undefined })
    },
    [activeHL, updateHighlight],
  )

  const deleteHighlight = useCallback(() => {
    if (activeHL) removeHighlight(activeHL.highlight.id)
    setActiveHL(null)
  }, [activeHL, removeHighlight])

  // --- Render --------------------------------------------------------------

  const readerStyle: CSSProperties = {
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    maxWidth: settings.pageMode === 'paged' ? 'none' : `${settings.contentWidth}px`,
    textAlign: settings.justify ? 'justify' : 'left',
    hyphens: settings.justify ? 'auto' : 'manual',
  }

  const body = (
    <div className="reader-content" ref={contentRef} style={readerStyle} onMouseUp={handleSelection} onTouchEnd={onTouchEnd}>
      <h1 className="chapter-title">{chapter.title}</h1>
      {chapter.paragraphs.map((text, i) => (
        <Paragraph
          key={i}
          index={i}
          text={text}
          highlights={hlByParagraph.get(i) ?? []}
          onHighlightClick={onHighlightClick}
        />
      ))}
      {settings.pageMode === 'scroll' && (
        <div className="reader-end">
          {chapterIndex < book.chapters.length - 1 ? '— End of chapter —' : '— The End —'}
        </div>
      )}
    </div>
  )

  return (
    // Pinned to LTR even when the interface is Arabic: paged mode lays the text
    // out in CSS columns and scrolls them with translateX, and the ←/→ keys and
    // tap zones are wired to that axis. The books themselves are LTR too.
    <div className={'reader' + (immersive ? ' immersive' : '')} dir="ltr">
      <div className="reader-progressline" style={{ width: `${book.progress.percent}%` }} />

      <header className="reader-topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back to library">
          <ArrowLeft />
        </button>
        <div className="reader-title">
          {book.title}
          <small>
            {chapter.title} · {languageName(book.language)}
          </small>
        </div>
        <div className="reader-spacer" />
        <button className="icon-btn" onClick={() => setChaptersOpen((o) => !o)} aria-label="Chapters">
          <ListIcon />
        </button>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Reading settings">
          <TypeIcon />
        </button>
        <button className="icon-btn" onClick={() => setImmersive((i) => !i)} aria-label="Toggle focus mode">
          <FocusIcon />
        </button>
        <Link className="icon-btn" to="/vocabulary" aria-label="Vocabulary bank">
          <BookIcon />
        </Link>
        {chaptersOpen && (
          <div className="popover" style={{ top: 56, right: 12 }}>
            {book.chapters.map((c, i) => (
              <button
                key={c.id}
                className={'popover-item' + (i === chapterIndex ? ' active' : '')}
                onClick={() => goToChapter(i)}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </header>

      {settings.pageMode === 'scroll' ? (
        <div className="reader-scroll" ref={scrollRef} onScroll={onScroll}>
          {body}
        </div>
      ) : (
        <div className="reader-paged">
          <div className="pages-viewport" ref={viewportRef}>
            {body}
          </div>
          <div className="page-zone left" onClick={prevPage} aria-hidden="true" />
          <div className="page-zone right" onClick={nextPage} aria-hidden="true" />
        </div>
      )}

      <footer className="reader-bottombar">
        <button
          className="icon-btn"
          onClick={() => goToChapter(chapterIndex - 1)}
          disabled={chapterIndex === 0}
          aria-label="Previous chapter"
        >
          <ChevronLeft />
        </button>
        <span className="chap-label">
          {settings.pageMode === 'paged'
            ? `Page ${page + 1} of ${pageCount}`
            : `${book.progress.percent}% · Chapter ${chapterIndex + 1} of ${book.chapters.length}`}
        </span>
        <button
          className="icon-btn"
          onClick={() => goToChapter(chapterIndex + 1)}
          disabled={chapterIndex === book.chapters.length - 1}
          aria-label="Next chapter"
        >
          <ChevronRight />
        </button>
      </footer>

      {toolkit && pending && (
        <SelectionToolkit
          x={toolkit.x}
          y={toolkit.y}
          noteMode={noteMode}
          noteDraft={noteDraft}
          onNoteDraft={setNoteDraft}
          onHighlight={(c) => createHighlight(c)}
          onStartNote={() => setNoteMode(true)}
          onCancelNote={() => setNoteMode(false)}
          onSaveNote={saveNote}
          onTranslate={doTranslate}
          onCopy={copySelection}
        />
      )}

      {activeHL && (
        <HighlightPopover
          highlight={activeHL.highlight}
          x={activeHL.x}
          y={activeHL.y}
          onColor={recolorHighlight}
          onNote={noteHighlight}
          onDelete={deleteHighlight}
          onClose={() => setActiveHL(null)}
        />
      )}

      {translation.open && (
        <TranslationSheet
          source={translation.source}
          loading={translation.loading}
          result={translation.result}
          targetLanguage={settings.targetLanguage}
          onClose={() => setTranslation((t) => ({ ...t, open: false }))}
          onSave={saveTranslationToVocab}
        />
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
