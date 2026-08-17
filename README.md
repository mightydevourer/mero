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

- **Data** (`/study/data`) — export every profile to a JSON backup, restore one, or clear
  everything behind a typed confirmation.

Deleting a course cascades to its lectures, tasks and exams. Every course is tinted, and that
tint follows it onto the schedule grid, task rows and dashboard.

---

## Languages and direction

The interface ships in **English and Arabic**, switchable from the toggle in the top bar and
persisted with the rest of the settings. Choosing Arabic sets `dir="rtl"` and `lang="ar"` on
`<html>`, so the layout mirrors and native pieces the React tree does not own — scrollbars,
`select` popups, date and time pickers, `window.confirm` — follow suit.

- **Weekdays** are indexed by `Date.prototype.getDay()`, so the Sunday-first schedule grid
  reads **الأحد ← السبت** right-to-left under RTL from the same array that drives English.
- **Plurals** go through `Intl.PluralRules`. Arabic selects across all six CLDR categories, so
  counts inflect properly — `محاضرة واحدة` (1), `محاضرتان` (2), `٤ مقررات` (3–10),
  `١١ مهمة` (11–99) — rather than bolting an "s" onto a noun.
- **Numbers and dates** use `Intl` pinned to `ar-u-nu-arab`, giving Arabic-Indic digits
  (`٢٧٪`, `٢٥ أغسطس`). The extension is deliberate: the default numbering system for bare
  `'ar'` is a per-build ICU choice — Chromium resolves it to `latn` — so without pinning, the
  same page renders Western digits in one browser and Arabic-Indic in another. For Western
  digits throughout, change `AR_LOCALE` in `src/i18n/index.ts` to `ar-u-nu-latn`.
- **Layout** uses CSS logical properties (`margin-inline-start`, `border-inline-start`,
  `inset-inline-end`) rather than physical ones, so nothing needs a mirrored stylesheet.
- **The Reader is pinned to `dir="ltr"`.** Paged mode lays text out in CSS columns and scrolls
  them with `translateX`, with the ←/→ keys and tap zones wired to that axis; flipping it would
  reverse the page-turn direction. The bundled texts are LTR anyway.

`src/i18n/strings.ts` holds plain copy and `plurals.ts` the counted phrases. English is the
source of truth in both: the Arabic table is typed as `Record<StringKey, string>`, so a missing
or misspelled key fails `tsc` instead of rendering a key name to a student. Messages held in
component state are stored **as keys, not resolved strings**, so an error already on screen
re-renders in the new language when the toggle is used.

Library and Vocabulary copy is still English only — translating the reading side was outside
this work — but both mirror correctly under RTL.

---

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck (tsc) + production build
npm run preview  # serve the production build
```

---

## Deploying to Netlify

Netlify builds the site itself from the repository, or takes a folder you drop
on it. Either way it needs one thing beyond the files: a rule telling it that
`/study/courses` is a client-side route, not a missing file.

### Option A — connect the Git repository (recommended)

Netlify reads `netlify.toml` at the repo root and needs no manual settings:
build command `npm run build`, publish directory `dist`, Node 20 pinned so a
platform default cannot shift the build. Every push redeploys.

### Option B — drag and drop

Build locally, then drag the **`dist` folder** onto Netlify's deploy area:

```bash
npm ci
npm run build
```

A dropped folder never sees `netlify.toml` — that file sits at the repo root,
outside `dist`. The SPA rule is therefore duplicated in `public/_redirects`,
which Vite copies into `dist/`, so this path works too.

### The redirect rule

```
/*    /index.html    200
```

Status **200 rewrites** rather than redirecting, so the router still sees the
URL the visitor asked for — `/study/courses` stays `/study/courses` in the
address bar. A 301 would rewrite it to `/` and lose the route.

`netlify.toml` also sets the security headers, caches the fingerprinted assets
in `assets/` for a year as immutable, and marks `index.html` `no-cache` so
visitors are never stranded on a stale build.

### About the .htaccess

`dist/` also contains `.htaccess`, which is Apache configuration for the
InfinityFree path below. **Netlify ignores it entirely** — it is not a
supported format there. It is harmless, and `_redirects` returns 404 for it so
it is not served as plain text.

---

## Deploying to InfinityFree (or any static Apache host)

Mero is a pure client-side build: no PHP, no database, no server-side anything. It needs static
file hosting and nothing else.

```bash
npm ci
npm run build          # writes dist/
```

Upload **the contents of `dist/`** — not the folder itself — into `htdocs/` on the host. That
includes the leading-dot `.htaccess`; FTP clients hide dotfiles by default, so enable "show
hidden files" in FileZilla (*Server → Force showing hidden files*) or the file manager, and
confirm it arrived. Everything the app needs is in `dist/`; `node_modules/` and `src/` are not
uploaded.

### Why the `.htaccess` matters

`/study`, `/study/courses` and `/read/<id>` exist only in the browser's router — there are no
such directories on disk. Without the rewrite in `public/.htaccess`, loading or refreshing one
of those URLs directly, or opening a shared link, returns the host's 404 page instead of the
app. The rewrite serves `index.html` for any path that is not a real file, while leaving
`assets/*` to be served normally. It also sets UTF-8 (the Arabic copy depends on it), long
immutable caching for the fingerprinted assets, `no-cache` for `index.html` so visitors are
never stranded on a stale build, and denies access to dotfiles — including itself.

If the host returns **500 Internal Server Error** after upload, its `AllowOverride` does not
permit `Options` in `.htaccess`: delete the two `Options` lines (`-MultiViews` near the top,
`-Indexes` at the bottom). Everything else works without them.

### Publishing into a subdirectory

To serve from `example.com/mero/` rather than the domain root, build with a matching base and
edit one line in the uploaded `.htaccess`:

```bash
VITE_BASE=/mero/ npm run build     # then set: RewriteBase /mero/
```

`src/main.tsx` feeds the same value to the router's `basename`, so client-side routes stay in
step with where the assets live. A relative base (`./`) is deliberately not used — assets would
resolve against the current URL, so `/study/courses` would look for `/study/assets/…` and 404.

### Before you clear a browser

All data lives in `localStorage` on the device. Clearing site data, using private browsing, or
switching machines loses it. Export a backup from **Study → Data** first; the same page
restores one.

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
  i18n/
    strings.ts             English + Arabic copy, keyed and type-checked
    plurals.ts             Counted phrases across the six CLDR plural categories
    index.ts               useI18n(): t / tn / number, date, weekday, countdown
  services/
    translation.ts         Pluggable translation provider interface + offline mock
    export.ts              Anki / Quizlet / CSV exporters + file download
    backup.ts              Study JSON backup: build, serialize, validate on import
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
    study/     StudyLayout, Dashboard, Courses, Tasks, Exams, Data, SignIn, ui
public/
  .htaccess                Apache: SPA rewrite, UTF-8, caching, dotfile deny
  _redirects               Netlify: SPA rewrite (both are copied into dist/)
netlify.toml               Netlify build settings, redirects and headers
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

### Backups

`services/backup.ts` writes a versioned JSON file (`app`, `version`, `exportedAt`, `data`)
covering every profile in `mero-study`; reading settings live in the other store and are not
included. Import **replaces** rather than merges: records reference each other by id, and
reconciling two histories that share ids would leave lectures pointing at the wrong course.
Files are validated field-by-field before anything is written, and a rejected file leaves the
store untouched with a specific reason shown.

Restore stays reachable with no profile selected — `/study/data` is exempt from the profile
gate, and the gate itself links to it. That is the state a new device or a just-cleared browser
starts in, which is exactly when a backup needs to go back in.

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
