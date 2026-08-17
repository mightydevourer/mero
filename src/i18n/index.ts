import { useMemo } from 'react'
import type { UiLanguage } from '../types'
import { useStore } from '../store/useStore'
import { STRINGS, type StringKey } from './strings'
import { COUNTS, type CountKey, type PluralForms } from './plurals'
import {
  daysUntil,
  formatDate,
  formatDateLong,
  formatTime,
} from '../lib/date'

export type { StringKey, CountKey }

export const LANGUAGES: UiLanguage[] = ['en', 'ar']

export function directionOf(lang: UiLanguage): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

/**
 * BCP-47 tag for the language. English resolves to `undefined` so it keeps
 * following the reader's own system locale, exactly as it did before Arabic
 * was added.
 *
 * Arabic pins the numbering system to Arabic-Indic (٠١٢٣) with the `-u-nu-arab`
 * extension. Bare `'ar'` cannot be trusted here: the default numbering system
 * is a per-build ICU choice — Chromium resolves it to `latn` — so without the
 * extension the same page renders Western digits in one browser and
 * Arabic-Indic in another. Swap `arab` for `latn` to use Western digits
 * throughout; nothing else needs to change.
 */
const AR_LOCALE = 'ar-u-nu-arab'

function localeOf(lang: UiLanguage): string | undefined {
  return lang === 'ar' ? AR_LOCALE : undefined
}

type Params = Record<string, string | number>

/** Intl objects are comparatively expensive, so build each one once. */
const numberFormats = new Map<UiLanguage, Intl.NumberFormat>()
const pluralRules = new Map<UiLanguage, Intl.PluralRules>()

function numberFormat(lang: UiLanguage): Intl.NumberFormat {
  let f = numberFormats.get(lang)
  if (!f) {
    f = new Intl.NumberFormat(localeOf(lang))
    numberFormats.set(lang, f)
  }
  return f
}

function pluralRule(lang: UiLanguage): Intl.PluralRules {
  let r = pluralRules.get(lang)
  if (!r) {
    r = new Intl.PluralRules(localeOf(lang) ?? 'en')
    pluralRules.set(lang, r)
  }
  return r
}

export interface Translator {
  lang: UiLanguage
  dir: 'ltr' | 'rtl'
  isRTL: boolean
  /** Look up a string, substituting any `{placeholders}`. */
  t: (key: StringKey, params?: Params) => string
  /** Look up a counted phrase and inflect it for `n`. */
  tn: (key: CountKey, n: number) => string
  fmt: {
    number: (n: number) => string
    percent: (n: number) => string
    /** 'Aug 25' / '٢٥ أغسطس' */
    date: (iso: string | undefined) => string
    /** 'Mon, Aug 25' / 'الاثنين، ٢٥ أغسطس' */
    dateLong: (iso: string | undefined) => string
    /** '9:00 AM' / '٩:٠٠ ص' — empty string when there is no time. */
    time: (time: string | undefined) => string
    /** Weekday name for a `Date.prototype.getDay()` index. */
    weekday: (day: number) => string
    weekdayShort: (day: number) => string
    /** 'Due in 5 days' / 'مستحق بعد ٥ أيام' */
    due: (iso: string | undefined) => string
    /** 'In 8 days' / 'بعد ٨ أيام' */
    countdown: (iso: string | undefined) => string
  }
}

/**
 * Build a translator for a language. Exported separately from the hook so the
 * same logic can be exercised in tests or called outside a component.
 */
export function createTranslator(lang: UiLanguage): Translator {
  const locale = localeOf(lang)
  const nf = numberFormat(lang)
  const rules = pluralRule(lang)

  const num = (n: number) => nf.format(n)

  const fill = (template: string, params?: Params) => {
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      if (!(key in params)) return match
      const value = params[key]
      return typeof value === 'number' ? num(value) : String(value)
    })
  }

  const t = (key: StringKey, params?: Params) => fill(STRINGS[lang][key], params)

  const tn = (key: CountKey, n: number) => {
    const forms = COUNTS[lang][key] as PluralForms
    const category = rules.select(n) as keyof PluralForms
    // A language leaves categories it never selects undefined; `other` is the
    // guaranteed fallback in every CLDR plural set.
    const template = forms[category] ?? forms.other
    return fill(template, { n })
  }

  const due = (iso: string | undefined) => {
    const days = daysUntil(iso)
    if (days === null) return t('date.noDeadline')
    if (days === 0) return t('date.dueToday')
    if (days === 1) return t('date.dueTomorrow')
    if (days === -1) return t('date.overdueOneDay')
    if (days < 0) return tn('overdue.byDays', -days)
    return tn('due.inDays', days)
  }

  const countdown = (iso: string | undefined) => {
    const days = daysUntil(iso)
    if (days === null) return t('date.none')
    if (days === 0) return t('date.today')
    if (days === 1) return t('date.tomorrow')
    if (days === -1) return t('date.yesterday')
    if (days < 0) return tn('countdown.daysAgo', -days)
    return tn('countdown.inDays', days)
  }

  return {
    lang,
    dir: directionOf(lang),
    isRTL: lang === 'ar',
    t,
    tn,
    fmt: {
      number: num,
      // Arabic writes the percent sign as ٪ and takes a fraction, while
      // English keeps the plain '27%' the app rendered before i18n.
      percent: (n) =>
        lang === 'ar'
          ? new Intl.NumberFormat(AR_LOCALE, {
              style: 'percent',
              maximumFractionDigits: 0,
            }).format(n / 100)
          : `${n}%`,
      date: (iso) => formatDate(iso, locale) ?? t('date.none'),
      dateLong: (iso) => formatDateLong(iso, locale) ?? t('date.none'),
      time: (time) => formatTime(time, locale) ?? '',
      weekday: (day) => t(`weekday.${day}` as StringKey),
      weekdayShort: (day) => t(`weekdayShort.${day}` as StringKey),
      due,
      countdown,
    },
  }
}

/**
 * The interface language, read from the persisted settings store. The
 * translator is rebuilt only when the language actually changes.
 */
export function useI18n(): Translator {
  const lang = useStore((s) => s.settings.uiLanguage)
  return useMemo(() => createTranslator(lang), [lang])
}
