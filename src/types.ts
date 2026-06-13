// Core domain models for Mero.

export type ReadingStatus = 'unread' | 'reading' | 'finished'
export type ThemeName = 'light' | 'sepia' | 'dark'
export type PageMode = 'scroll' | 'paged'
export type VocabStatus = 'new' | 'learning' | 'known'
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Chapter {
  id: string
  title: string
  paragraphs: string[]
}

export interface ReadingProgress {
  chapterIndex: number
  /** Index of the top-most paragraph that was last visible. */
  paragraphIndex: number
  /** Whole-book completion, 0–100. */
  percent: number
}

export interface Book {
  id: string
  title: string
  author: string
  /** BCP-47-ish primary language code, e.g. 'en', 'es', 'fr', 'de'. */
  language: string
  /** Placeholder cover colour (any valid CSS colour). */
  coverColor: string
  tags: string[]
  series?: string
  status: ReadingStatus
  chapters: Chapter[]
  addedAt: number
  lastReadAt?: number
  progress: ReadingProgress
}

export interface Highlight {
  id: string
  bookId: string
  chapterId: string
  /** Paragraph index within the chapter. */
  paragraphIndex: number
  /** Character offsets within the paragraph's plain text. */
  start: number
  end: number
  text: string
  color: HighlightColor
  note?: string
  createdAt: number
}

export interface VocabularyEntry {
  id: string
  term: string
  translation: string
  /** The original sentence/paragraph the term was mined from. */
  context: string
  sourceLanguage: string
  targetLanguage: string
  bookId?: string
  bookTitle?: string
  status: VocabStatus
  notes?: string
  createdAt: number
}

export interface Settings {
  theme: ThemeName
  fontFamily: string
  /** Base reading font size in px. */
  fontSize: number
  /** Unitless line height. */
  lineHeight: number
  /** Max width of the reading column in px. */
  contentWidth: number
  pageMode: PageMode
  /** Justify body text. */
  justify: boolean
  /** Language vocabulary/translations are rendered into. */
  targetLanguage: string
}
