/**
 * JSON backup for the Study Organizer.
 *
 * Mero keeps everything in localStorage, which a browser can clear without
 * warning, so the backup file is the only way to move a semester between
 * devices or recover after a reset. The file covers every profile stored in
 * `mero-study`; reading preferences live in the other store and are not part
 * of it.
 *
 * Import replaces the study data outright rather than merging: records
 * reference each other by id, and silently reconciling two histories that share
 * ids would produce lectures pointing at the wrong course. Replace is
 * predictable, and the caller confirms first.
 */

import type { Course, Exam, Lecture, Student, Task } from '../types'

export const BACKUP_APP = 'mero-study'
export const BACKUP_VERSION = 1

export interface StudyData {
  students: Student[]
  courses: Course[]
  lectures: Lecture[]
  tasks: Task[]
  exams: Exam[]
}

export interface StudyBackup {
  app: string
  version: number
  /** ISO-8601 timestamp, for the reader's benefit only. */
  exportedAt: string
  data: StudyData
}

/** Why an import was rejected. Each maps to a translated message. */
export type BackupError =
  | 'invalidJson'
  | 'notMeroBackup'
  | 'unsupportedVersion'
  | 'malformed'
  | 'empty'

export type ParseResult =
  | { ok: true; backup: StudyBackup }
  | { ok: false; reason: BackupError }

export function buildBackup(data: StudyData): StudyBackup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** `mero-study-backup-2026-08-17.json` */
export function backupFilename(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `mero-study-backup-${y}-${m}-${d}.json`
}

export function serializeBackup(backup: StudyBackup): string {
  return JSON.stringify(backup, null, 2)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/**
 * Every record must carry the fields the UI dereferences without guarding —
 * an id to key on, and the owning `studentId` the selectors filter by. Anything
 * short of that would render as a blank row or throw during a later edit, so it
 * fails the whole import instead.
 */
function validRecords(list: unknown, required: string[]): boolean {
  if (!Array.isArray(list)) return false
  return list.every(
    (item) => isObject(item) && required.every((key) => isNonEmptyString(item[key])),
  )
}

export function parseBackup(text: string): ParseResult {
  if (!text.trim()) return { ok: false, reason: 'empty' }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalidJson' }
  }

  if (!isObject(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, reason: 'notMeroBackup' }
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, reason: 'unsupportedVersion' }
  }
  if (!isObject(raw.data)) return { ok: false, reason: 'malformed' }

  const d = raw.data
  const shapeOk =
    validRecords(d.students, ['id', 'name']) &&
    validRecords(d.courses, ['id', 'studentId', 'name']) &&
    validRecords(d.lectures, ['id', 'studentId', 'courseId', 'startTime', 'endTime']) &&
    validRecords(d.tasks, ['id', 'studentId', 'title', 'priority', 'status', 'kind']) &&
    validRecords(d.exams, ['id', 'studentId', 'courseId', 'date'])

  if (!shapeOk) return { ok: false, reason: 'malformed' }

  // Lectures store `day` as a number, so it is checked apart from the strings.
  const daysOk = (d.lectures as Record<string, unknown>[]).every(
    (l) => typeof l.day === 'number' && l.day >= 0 && l.day <= 6,
  )
  if (!daysOk) return { ok: false, reason: 'malformed' }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      data: {
        students: d.students as Student[],
        courses: d.courses as Course[],
        lectures: d.lectures as Lecture[],
        tasks: d.tasks as Task[],
        exams: d.exams as Exam[],
      },
    },
  }
}

/** Row counts for the confirmation summary shown before an import. */
export function backupCounts(data: StudyData) {
  return {
    students: data.students.length,
    courses: data.courses.length,
    lectures: data.lectures.length,
    tasks: data.tasks.length,
    exams: data.exams.length,
  }
}
