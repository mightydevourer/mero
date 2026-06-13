# Mero

**An intensive-reading environment for power readers, academics, and language learners.**

Mero turns reading into an interactive process of knowledge extraction. Highlight a
passage to translate it, mine the word and its original context into a personal
vocabulary bank, and export the whole thing to your spaced-repetition tool of choice —
all without breaking your reading flow.

This repository contains the Mero MVP: a fast, offline-capable, client-side web app
built with **React + TypeScript + Vite**.

---

## The four pillars

### 1. Library Dashboard (`/`)
A visual archive of your texts. Books are grouped into **series shelves**, filterable by
**reading status** and **tag**, and searchable by title/author/tag. A **Continue Reading**
rail puts your most recent texts one click away.

### 2. The Immersive Reader (`/read/:bookId`)
A distraction-free reading surface with total typographic control:

- **Themes:** Light, Sepia, Dark
- **Typography:** typeface, font size, line spacing, reading width, justification
- **Page turn:** continuous **Scroll** or column-based **Paged** mode (← / → or tap zones)
- **Focus mode** + auto-hiding chrome, chapter navigation, and persisted reading progress

### 3. The Active Toolkit
Select any passage to summon a floating toolkit:

- **Highlight** in five colours
- **Note** — annotate a passage (re-openable by clicking the highlight)
- **Translate** — opens a bottom sheet with the source, an auto-detected language, the
  translation, and a one-tap **Save to vocabulary**

Highlights and notes are anchored to character offsets within a paragraph, so they
survive re-rendering and layout changes.

### 4. The Vocabulary Bank (`/vocabulary`)
Every translated term is captured with its meaning and **the exact sentence it came
from**. Review, search, filter, and set a learning status (new / learning / known), then
**export**:

- **Anki** — tab-separated with `#`-header (Term / Translation / Context / Tags, HTML on)
- **Quizlet** — term ⇥ definition
- **CSV** — every field, for spreadsheets and backups

---

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck (tsc) + production build
npm run preview  # serve the production build
```

Open the dev URL Vite prints. On first run, Mero seeds a small multilingual library
(English, Spanish, French, German) so every feature is immediately explorable. All data
(library, highlights, vocabulary, settings) is persisted to `localStorage`.

---

## Architecture

```
src/
  types.ts                 Domain models (Book, Highlight, VocabularyEntry, Settings…)
  store/useStore.ts        Zustand store, persisted to localStorage
  data/
    seedBooks.ts           Starter library (original, multilingual texts)
    dictionary.ts          Bilingual word lists + idiom tables for the mock translator
  services/
    translation.ts         Pluggable translation provider interface + offline mock
    export.ts              Anki / Quizlet / CSV exporters + file download
  lib/
    selection.ts           DOM selection → paragraph-relative character offsets
    highlight.ts           Paragraph text → highlighted render segments
    format.ts, id.ts, toast.ts
  components/
    Chrome, Toast, Icons
    library/   Library, BookCard
    reader/    Reader, Paragraph, SelectionToolkit, TranslationSheet,
               SettingsPanel, HighlightPopover
    vocabulary/Vocabulary
```

### Translation is pluggable

The UI only ever talks to a `TranslationProvider`. The bundled `MockTranslationProvider`
does an **offline, dictionary-driven gloss** (with language auto-detection and idiom
lookups) so the full mining loop works with zero configuration.

To wire a real backend (Claude, DeepL, a self-hosted model, …), implement the interface
and register it once at startup — no component changes required:

```ts
import { setTranslationProvider, type TranslationProvider } from './services/translation'

const claude: TranslationProvider = {
  name: 'Claude',
  async translate({ text, targetLanguage }) {
    // call your API / proxy here
    return { translation, detectedSourceLanguage, targetLanguage, notes }
  },
}

setTranslationProvider(claude)
```

### Importing into Anki

Export produces a `.txt` file with a modern Anki header. In Anki: **File → Import**, choose
the file, confirm the field mapping (Term / Translation / Context), keep **Allow HTML in
fields** enabled, and import.

---

## Roadmap

The MVP intentionally mocks the AI layer and reads from a seeded library. Natural next
steps: real AI translation/grammar notes, EPUB/PDF import, OCR, cloud sync, and direct
spaced-repetition scheduling inside Mero.
