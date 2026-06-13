// Pluggable translation/AI layer.
//
// The UI only ever talks to a `TranslationProvider`, so a real backend
// (Claude, DeepL, a self-hosted model, …) can be dropped in via
// `setTranslationProvider()` without touching any components. The bundled
// `MockTranslationProvider` performs an offline, dictionary-driven gloss so the
// whole mining loop works with zero configuration.

import { DICTIONARIES, IDIOMS } from '../data/dictionary'

export interface TranslationRequest {
  text: string
  /** Undefined means "auto-detect". */
  sourceLanguage?: string
  targetLanguage: string
}

export interface TranslationResult {
  translation: string
  detectedSourceLanguage: string
  targetLanguage: string
  /** Short note about provenance / caveats, shown under the translation. */
  notes?: string
  /** True when the whole selection matched a known idiom. */
  idiom?: boolean
}

export interface TranslationProvider {
  readonly name: string
  translate(req: TranslationRequest): Promise<TranslationResult>
}

// --- Language detection (lightweight heuristic) ---------------------------

const STOPWORDS: Record<string, string[]> = {
  es: ['el', 'la', 'los', 'las', 'que', 'de', 'y', 'un', 'una', 'con', 'por', 'en', 'del', 'no', 'se', 'su', 'para', 'como', 'pero', 'más'],
  fr: ['le', 'la', 'les', 'des', 'un', 'une', 'et', 'est', 'que', 'de', 'du', 'dans', 'pour', 'avec', 'ne', 'pas', 'sur', 'elle', 'mais', 'plus'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'den', 'dem', 'mit', 'auf', 'für', 'sich', 'auch', 'sehr', 'wird', 'war', 'aber', 'wie'],
  en: ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'that', 'it', 'for', 'was', 'with', 'as', 'his', 'on', 'be', 'at', 'by', 'this', 'are'],
}

const DIACRITICS: Record<string, RegExp> = {
  es: /[ñáíóú¿¡]/i,
  fr: /[àâçèêëîïôûœ]/i,
  de: /[äöüß]/i,
}

export function detectLanguage(text: string): string {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? []
  const scores: Record<string, number> = { es: 0, fr: 0, de: 0, en: 0 }

  for (const [lang, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list)
    for (const w of words) if (set.has(w)) scores[lang] += 2
  }
  for (const [lang, re] of Object.entries(DIACRITICS)) {
    if (re.test(text)) scores[lang] += 3
  }
  // Dictionary coverage — a lighter signal that rescues short selections and
  // lone content words which carry no stopwords (e.g. "faro" -> es).
  for (const lang of ['es', 'fr', 'de'] as const) {
    const dict = DICTIONARIES[lang]
    for (const w of words) if (dict[w] !== undefined) scores[lang] += 1
  }

  let best = 'en'
  let bestScore = 0
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = lang
      bestScore = score
    }
  }
  return bestScore === 0 ? 'en' : best
}

// --- Mock dictionary translation ------------------------------------------

function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?¿¡"“”'’()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const WORD_SHAPE = /^([^\p{L}]*)([\p{L}][\p{L}'’-]*)([^\p{L}]*)$/u

function glossText(text: string, source: string): { translation: string; idiom: boolean } {
  const idiom = IDIOMS[source]?.[normalizePhrase(text)]
  if (idiom) return { translation: idiom, idiom: true }

  const dict = DICTIONARIES[source]
  if (!dict) return { translation: text, idiom: false }

  // For French, expand elisions (l'escalier -> "l' escalier") so the article
  // and the noun can each be looked up.
  const prepared = source === 'fr' ? text.replace(/[’']/g, "' ") : text

  const tokens = prepared.split(/(\s+)/)
  const out = tokens.map((tok) => {
    if (tok === '' || /^\s+$/.test(tok)) return tok
    const m = tok.match(WORD_SHAPE)
    if (!m) return tok
    const [, pre, core, post] = m
    const replacement = dict[core.toLowerCase()]
    if (replacement === undefined) return pre + core + post // unknown → keep
    if (replacement === '') return pre + post // dropped token
    const capitalized =
      core[0] !== core[0].toLowerCase() && core[0] === core[0].toUpperCase()
    const word = capitalized
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement
    return pre + word + post
  })

  const translation = out.join('').replace(/\s{2,}/g, ' ').trim()
  return { translation, idiom: false }
}

export class MockTranslationProvider implements TranslationProvider {
  readonly name = 'Mock (offline)'

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    // A touch of latency so loading states are exercised, like a real API.
    await new Promise((r) => setTimeout(r, 220))

    const text = req.text.trim()
    const source = req.sourceLanguage && req.sourceLanguage !== 'auto'
      ? req.sourceLanguage
      : detectLanguage(text)

    if (source === req.targetLanguage || (source === 'en' && req.targetLanguage === 'en')) {
      return {
        translation: text,
        detectedSourceLanguage: source,
        targetLanguage: req.targetLanguage,
        notes:
          'Source already in the target language. Connect a real AI provider for definitions, paraphrases, or grammar notes.',
      }
    }

    const { translation, idiom } = glossText(text, source)
    const notes = idiom
      ? 'Idiomatic expression — translated as a unit rather than word-by-word.'
      : 'Offline word-by-word gloss. Swap in a real AI provider for fluent, contextual translations.'

    return {
      translation,
      detectedSourceLanguage: source,
      targetLanguage: req.targetLanguage,
      notes,
      idiom,
    }
  }
}

// --- Provider registry -----------------------------------------------------

let provider: TranslationProvider = new MockTranslationProvider()

export function getTranslationProvider(): TranslationProvider {
  return provider
}

export function setTranslationProvider(next: TranslationProvider): void {
  provider = next
}
