/**
 * Date maths and locale formatting for the Study Organizer.
 *
 * Calendar dates are stored as 'YYYY-MM-DD' and times as 'HH:MM' — the same
 * shapes a MySQL DATE / TIME column would hold. Everything is interpreted in
 * the reader's local timezone: `new Date('2026-08-25')` parses as UTC midnight
 * and can land on the previous day west of Greenwich, so dates are always
 * split and rebuilt through the local-time constructor instead.
 *
 * Nothing here produces user-facing words. Weekday names, countdowns and the
 * "no date" fallbacks are translated copy and live in `src/i18n`; these
 * functions take a BCP-47 tag and return `null` when a value cannot be parsed,
 * leaving the wording to the caller.
 */

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

/**
 * Options shared by every date format. Arabic locales in some ICU builds
 * default to a Hijri calendar; university deadlines are Gregorian, so the
 * calendar is pinned rather than left to the locale.
 */
const CALENDAR = { calendar: 'gregory' } as const

/** 'Aug 25' — or 'Aug 25, 2027' when the date falls outside the current year. */
export function formatDate(iso: string | undefined, locale?: string): string | null {
  const date = parseDate(iso)
  if (!date) return null
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(locale, {
    ...CALENDAR,
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** 'Mon, Aug 25' — the long form used in list rows and detail headers. */
export function formatDateLong(iso: string | undefined, locale?: string): string | null {
  const date = parseDate(iso)
  if (!date) return null
  return date.toLocaleDateString(locale, {
    ...CALENDAR,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** '09:00' → '9:00 AM' (or '٩:٠٠ ص'), honouring the locale's clock. */
export function formatTime(time: string | undefined, locale?: string): string | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return time
  const date = new Date()
  date.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
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
