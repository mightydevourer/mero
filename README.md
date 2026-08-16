# Mero

**An intensive-reading environment for power readers, academics, and language learners.**

Mero turns reading into an interactive process of knowledge extraction. Highlight a
passage to translate it, mine the word and its original context into a personal
vocabulary bank, and export the whole thing to your spaced-repetition tool of choice —
all without breaking your reading flow.

For students, a built-in **Study Organizer** keeps courses, timetable, assignments, exams
and daily study tasks beside the texts they are set against.

This repository contains the Mero MVP: a fast, offline-capable, client-side web app
built with **React + TypeScript + Vite**.

---

## The five pillars

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

### 5. The Study Organizer (`/study`)
The academic half of Mero: what you have to read *by when*, next to the reading itself.

- **Dashboard** (`/study`) — a completion ring over all tasks, tiles for open / due today /
  overdue / exams ahead, then today's tasks, today's lectures, and countdowns to upcoming
  assignments and exams. Overdue work gets its own band at the top.
- **Courses** (`/study/courses`) — courses with instructor, code and colour, plus a
  Sunday-first **weekly schedule** of recurring lecture slots (day, time, room).
- **Tasks** (`/study/tasks`) — assignments (deadline-bearing coursework) and day-to-day study
  tasks in one list, each with **High / Medium / Low** priority and an optional course and
  deadline. Filter by type, status or course, search by text, and tick items off inline.
- **Exams** (`/study/exams`) — exam dates per course, split into upcoming and past, counting
  down in days.

Deleting a course cascades to its lectures, tasks and exams. Every course is tinted, and that
tint follows it onto the schedule grid, task rows and dashboard.

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

The Study Organizer starts empty behind a profile picker — create a profile, or hit
**Explore with sample data** for a populated semester whose deadlines are dated relative to
today.

---

## Architecture

```
src/
  types.ts                 Domain models (Book, Highlight, VocabularyEntry, Settings,
                           Student, Course, Lecture, Task, Exam…)
  store/
    useStore.ts            Reader store (library, highlights, vocabulary, settings)
    useStudyStore.ts       Study store (profiles, courses, lectures, tasks, exams)
  data/
    seedBooks.ts           Starter library (original, multilingual texts)
    seedStudy.ts           Sample semester, dated relative to today
    dictionary.ts          Bilingual word lists + idiom tables for the mock translator
  services/
    translation.ts         Pluggable translation provider interface + offline mock
    export.ts              Anki / Quizlet / CSV exporters + file download
  lib/
    selection.ts           DOM selection → paragraph-relative character offsets
    highlight.ts           Paragraph text → highlighted render segments
    date.ts                Calendar-date parsing, countdowns and weekday helpers
    courseColors.ts        Course tint palette
    format.ts, id.ts, toast.ts
  components/
    Chrome, Toast, Icons
    library/   Library, BookCard
    reader/    Reader, Paragraph, SelectionToolkit, TranslationSheet,
               SettingsPanel, HighlightPopover
    vocabulary/Vocabulary
    study/     StudyLayout, Dashboard, Courses, Tasks, Exams, SignIn, ui
```

The two stores persist under separate localStorage keys (`mero-store` and `mero-study`), so
the reading side and the study side evolve independently.

### Dates

Calendar dates are stored as `'YYYY-MM-DD'` and times as `'HH:MM'` — the shapes a SQL `DATE`
and `TIME` column would hold. `new Date('2026-08-25')` parses as *UTC* midnight and can land
on the previous day west of Greenwich, so `lib/date.ts` splits and rebuilds every date through
the local-time constructor instead. Use those helpers rather than passing date strings to
`new Date()` directly.

### The study data model

The domain types map onto a conventional relational schema, with `studentId` standing in for
the `user_id` foreign key:

| Type      | Table    | Notes                                                          |
| --------- | -------- | -------------------------------------------------------------- |
| `Student` | `users`  | Local profile — see below.                                      |
| `Course`  | `courses`| `name`, `instructor`, plus an optional code and a colour.       |
| `Task`    | `tasks`  | Assignments *and* study tasks; `kind` discriminates the two.    |
| `Exam`    | `exams`  | Belongs to a course.                                            |
| `Lecture` | —        | Recurring weekly slots backing the schedule grid.               |

### Profiles are local, not accounts

Mero is a client-side app with no backend, so a profile **scopes data on one device rather
than authenticating anyone**. No password is asked for and none is stored: persisting one in
`localStorage` next to the data it is meant to protect would only look like security. Anything
entered on a shared or public computer stays in that browser.

Real accounts need a server — session handling, hashed credentials (`password_hash()` in PHP,
bcrypt/argon2 elsewhere), and per-user queries. The store is the seam for that work: replace
the action bodies in `useStudyStore.ts` with API calls and the components stay as they are.

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

For the Study Organizer: a real authenticated backend (see above), then the features that
only make sense once one exists — reminders and notifications, calendar (`.ics`) export,
recurring tasks, and attaching a library text to a course so a reading assignment and the
text itself are one click apart.
