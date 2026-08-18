// Core domain models for the Study Organizer.

export type ThemeName = 'light' | 'sepia' | 'dark'

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

/** Language the interface is rendered in. Arabic switches the app to RTL. */
export type UiLanguage = 'en' | 'ar'

export interface Settings {
  theme: ThemeName
  /** Language of the interface. Arabic switches the app to RTL. */
  uiLanguage: UiLanguage
}
