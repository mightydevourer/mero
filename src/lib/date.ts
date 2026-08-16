/**
 * Date helpers for the Study Organizer.
 *
 * Calendar dates are stored as 'YYYY-MM-DD' and times as 'HH:MM' — the same
 * shapes a MySQL DATE / TIME column would hold. Everything is interpreted in
 * the reader's local timezone: `new Date('2026-08-25')` parses as UTC midnight
 * and can land on the previous day west of Greenwich, so dates are always
 * split and rebuilt through the local-time constructor instead.
 */

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const DAY_MS = 86_400_000

/** Local midnight for a 'YYYY-MM-DD' string, or `null` if it is malformed. */
export function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

/** 'YYYY-MM-DD' for a Date, using its local calendar day. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Calendar days from today to `iso`; negative when the date has passed. */
export function daysUntil(iso: string | undefined): number | null {
  const target = parseDate(iso)
  if (!target) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / DAY_MS)
}

export function isToday(iso: string | undefined): boolean {
  return daysUntil(iso) === 0
}

export function isOverdue(iso: string | undefined): boolean {
  const d = daysUntil(iso)
  return d !== null && d < 0
}

/** 'Aug 25' — or 'Aug 25, 2027' when the date falls outside the current year. */
export function formatDate(iso: string | undefined): string {
  const date = parseDate(iso)
  if (!date) return 'No date'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** 'Mon, Aug 25' — the long form used in list rows and detail headers. */
export function formatDateLong(iso: string | undefined): string {
  const date = parseDate(iso)
  if (!date) return 'No date'
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** '09:00' → '9:00 AM', honouring the reader's locale clock. */
export function formatTime(time: string | undefined): string {
  if (!time) return ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return time
  const date = new Date()
  date.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Human countdown for a deadline: 'Due in 5 days', 'Due today', 'Overdue by 2 days'. */
export function dueLabel(iso: string | undefined): string {
  const days = daysUntil(iso)
  if (days === null) return 'No deadline'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return 'Overdue by 1 day'
  if (days < 0) return `Overdue by ${-days} days`
  return `Due in ${days} days`
}

/** Neutral countdown for dated events: 'In 8 days', 'Today', '3 days ago'. */
export function countdownLabel(iso: string | undefined): string {
  const days = daysUntil(iso)
  if (days === null) return 'No date'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${-days} days ago`
  return `In ${days} days`
}

/** Sort comparator putting the soonest date first; undated entries sink. */
export function byDate<T>(get: (item: T) => string | undefined) {
  return (a: T, b: T) => {
    const av = get(a)
    const bv = get(b)
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    return av < bv ? -1 : av > bv ? 1 : 0
  }
}
