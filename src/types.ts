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

/* ==========================================================================
   Study Organizer
   ========================================================================== */

export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'done'
/** Assignments and day-to-day study tasks share one record shape. */
export type TaskKind = 'assignment' | 'task'
/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * A local study profile. Mero has no backend, so this scopes data on one
 * device — it is not an authenticated account. See README.
 */
export interface Student {
  id: string
  name: string
  email: string
  createdAt: number
}

export interface Course {
  id: string
  studentId: string
  name: string
  instructor: string
  /** Short code shown on compact cards, e.g. 'CS-204'. */
  code?: string
  /** Any valid CSS colour, used to tint the course across the UI. */
  color: string
  createdAt: number
}

/** A recurring weekly lecture slot. */
export interface Lecture {
  id: string
  studentId: string
  courseId: string
  day: Weekday
  /** 24-hour 'HH:MM'. */
  startTime: string
  endTime: string
  location?: string
}

export interface Task {
  id: string
  studentId: string
  courseId?: string
  kind: TaskKind
  title: string
  description?: string
  /** 'YYYY-MM-DD'. Optional for undated study tasks. */
  deadline?: string
  priority: Priority
  status: TaskStatus
  createdAt: number
  completedAt?: number
}

export interface Exam {
  id: string
  studentId: string
  courseId: string
  title: string
  /** 'YYYY-MM-DD'. */
  date: string
  /** 24-hour 'HH:MM'. */
  time?: string
  location?: string
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
