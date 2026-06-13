import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Book,
  Highlight,
  ReadingProgress,
  ReadingStatus,
  Settings,
  VocabStatus,
  VocabularyEntry,
} from '../types'
import { seedBooks } from '../data/seedBooks'
import { uid } from '../lib/id'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'sepia',
  fontFamily: 'var(--font-serif)',
  fontSize: 19,
  lineHeight: 1.7,
  contentWidth: 680,
  pageMode: 'scroll',
  justify: false,
  targetLanguage: 'en',
}

interface StoreState {
  books: Book[]
  highlights: Highlight[]
  vocab: VocabularyEntry[]
  settings: Settings

  // Books
  getBook: (id: string) => Book | undefined
  addBook: (book: Book) => void
  updateBook: (id: string, patch: Partial<Book>) => void
  removeBook: (id: string) => void
  setProgress: (bookId: string, progress: ReadingProgress) => void
  setStatus: (bookId: string, status: ReadingStatus) => void

  // Highlights
  addHighlight: (h: Omit<Highlight, 'id' | 'createdAt'>) => Highlight
  updateHighlight: (id: string, patch: Partial<Highlight>) => void
  removeHighlight: (id: string) => void

  // Vocabulary
  addVocab: (
    v: Omit<VocabularyEntry, 'id' | 'createdAt' | 'status'> & { status?: VocabStatus },
  ) => VocabularyEntry
  updateVocab: (id: string, patch: Partial<VocabularyEntry>) => void
  removeVocab: (id: string) => void

  // Settings
  updateSettings: (patch: Partial<Settings>) => void

  resetLibrary: () => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      books: seedBooks(),
      highlights: [],
      vocab: [],
      settings: DEFAULT_SETTINGS,

      getBook: (id) => get().books.find((b) => b.id === id),

      addBook: (book) => set((s) => ({ books: [book, ...s.books] })),

      updateBook: (id, patch) =>
        set((s) => ({ books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      removeBook: (id) =>
        set((s) => ({
          books: s.books.filter((b) => b.id !== id),
          highlights: s.highlights.filter((h) => h.bookId !== id),
        })),

      setProgress: (bookId, progress) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b
            const status: ReadingStatus =
              progress.percent >= 99 ? 'finished' : b.status === 'unread' ? 'reading' : b.status
            return { ...b, progress, status, lastReadAt: Date.now() }
          }),
        })),

      setStatus: (bookId, status) =>
        set((s) => ({ books: s.books.map((b) => (b.id === bookId ? { ...b, status } : b)) })),

      addHighlight: (h) => {
        const highlight: Highlight = { ...h, id: uid('hl'), createdAt: Date.now() }
        set((s) => ({ highlights: [...s.highlights, highlight] }))
        return highlight
      },

      updateHighlight: (id, patch) =>
        set((s) => ({
          highlights: s.highlights.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

      addVocab: (v) => {
        const entry: VocabularyEntry = {
          ...v,
          status: v.status ?? 'new',
          id: uid('vocab'),
          createdAt: Date.now(),
        }
        set((s) => ({ vocab: [entry, ...s.vocab] }))
        return entry
      },

      updateVocab: (id, patch) =>
        set((s) => ({ vocab: s.vocab.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),

      removeVocab: (id) => set((s) => ({ vocab: s.vocab.filter((v) => v.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetLibrary: () => set({ books: seedBooks(), highlights: [] }),
    }),
    {
      name: 'mero-store',
      version: 1,
      partialize: (s) => ({
        books: s.books,
        highlights: s.highlights,
        vocab: s.vocab,
        settings: s.settings,
      }),
      // Merge persisted data over the live state, keeping action functions and
      // backfilling any settings keys added since the data was written.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
    },
  ),
)

// Convenience selectors -----------------------------------------------------

export function useBook(id: string | undefined): Book | undefined {
  return useStore((s) => (id ? s.books.find((b) => b.id === id) : undefined))
}
