/**
 * Counted phrases, kept apart from `strings.ts` because Arabic inflects on
 * number far more than English does.
 *
 * English selects between `one` and `other`; Arabic uses all six CLDR
 * categories — zero, one (1), two (2), few (3–10), many (11–99) and other
 * (100+, and fractions). `Intl.PluralRules` picks the category for the active
 * language, so neither list hard-codes any thresholds.
 */

export interface PluralForms {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  /** Required: every language falls back here when its category is unset. */
  other: string
}

export const enCounts = {
  'count.lecture': {
    one: '{n} lecture',
    other: '{n} lectures',
  },
  'count.openTask': {
    one: '{n} open task',
    other: '{n} open tasks',
  },
  'count.exam': {
    one: '{n} exam',
    other: '{n} exams',
  },
  'count.profile': {
    one: '{n} profile',
    other: '{n} profiles',
  },
  'count.course': {
    one: '{n} course',
    other: '{n} courses',
  },
  'count.task': {
    one: '{n} task',
    other: '{n} tasks',
  },
  'exams.ahead': {
    one: '{n} exam ahead.',
    other: '{n} exams ahead.',
  },
  'due.inDays': {
    one: 'Due in {n} day',
    other: 'Due in {n} days',
  },
  'overdue.byDays': {
    one: 'Overdue by {n} day',
    other: 'Overdue by {n} days',
  },
  'countdown.inDays': {
    one: 'In {n} day',
    other: 'In {n} days',
  },
  'countdown.daysAgo': {
    one: '{n} day ago',
    other: '{n} days ago',
  },
  'dash.noAssignmentsHorizon': {
    one: 'No assignments in the next {n} day.',
    other: 'No assignments in the next {n} days.',
  },
} as const satisfies Record<string, PluralForms>

export type CountKey = keyof typeof enCounts

export const arCounts: Record<CountKey, PluralForms> = {
  'count.lecture': {
    zero: 'لا محاضرات',
    one: 'محاضرة واحدة',
    two: 'محاضرتان',
    few: '{n} محاضرات',
    many: '{n} محاضرة',
    other: '{n} محاضرة',
  },
  'count.openTask': {
    zero: 'لا مهام مفتوحة',
    one: 'مهمة مفتوحة واحدة',
    two: 'مهمتان مفتوحتان',
    few: '{n} مهام مفتوحة',
    many: '{n} مهمة مفتوحة',
    other: '{n} مهمة مفتوحة',
  },
  'count.exam': {
    zero: 'لا اختبارات',
    one: 'اختبار واحد',
    two: 'اختباران',
    few: '{n} اختبارات',
    many: '{n} اختبارًا',
    other: '{n} اختبار',
  },
  'count.profile': {
    zero: 'لا ملفات شخصية',
    one: 'ملف شخصي واحد',
    two: 'ملفان شخصيان',
    few: '{n} ملفات شخصية',
    many: '{n} ملفًا شخصيًا',
    other: '{n} ملف شخصي',
  },
  'count.course': {
    zero: 'لا مقررات',
    one: 'مقرر واحد',
    two: 'مقرران',
    few: '{n} مقررات',
    many: '{n} مقررًا',
    other: '{n} مقرر',
  },
  'count.task': {
    zero: 'لا مهام',
    one: 'مهمة واحدة',
    two: 'مهمتان',
    few: '{n} مهام',
    many: '{n} مهمة',
    other: '{n} مهمة',
  },
  'exams.ahead': {
    zero: 'لا اختبارات قادمة.',
    one: 'اختبار واحد قادم.',
    two: 'اختباران قادمان.',
    few: '{n} اختبارات قادمة.',
    many: '{n} اختبارًا قادمًا.',
    other: '{n} اختبار قادم.',
  },
  'due.inDays': {
    zero: 'مستحق اليوم',
    one: 'مستحق غدًا',
    two: 'مستحق بعد يومين',
    few: 'مستحق بعد {n} أيام',
    many: 'مستحق بعد {n} يومًا',
    other: 'مستحق بعد {n} يوم',
  },
  'overdue.byDays': {
    zero: 'متأخر',
    one: 'متأخر بيوم واحد',
    two: 'متأخر بيومين',
    few: 'متأخر بـ{n} أيام',
    many: 'متأخر بـ{n} يومًا',
    other: 'متأخر بـ{n} يوم',
  },
  'countdown.inDays': {
    zero: 'اليوم',
    one: 'غدًا',
    two: 'بعد يومين',
    few: 'بعد {n} أيام',
    many: 'بعد {n} يومًا',
    other: 'بعد {n} يوم',
  },
  'countdown.daysAgo': {
    zero: 'اليوم',
    one: 'أمس',
    two: 'قبل يومين',
    few: 'قبل {n} أيام',
    many: 'قبل {n} يومًا',
    other: 'قبل {n} يوم',
  },
  'dash.noAssignmentsHorizon': {
    zero: 'لا واجبات قادمة.',
    one: 'لا واجبات غدًا.',
    two: 'لا واجبات خلال اليومين القادمين.',
    few: 'لا واجبات خلال {n} أيام القادمة.',
    many: 'لا واجبات خلال {n} يومًا القادمًا.',
    other: 'لا واجبات خلال {n} يوم القادم.',
  },
}

export const COUNTS = { en: enCounts, ar: arCounts } as const
