import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, Exam, Lecture, Student, Task, TaskStatus } from '../types'
import { uid } from '../lib/id'
import { sampleStudyData } from '../data/seedStudy'
import type { StudyData } from '../services/backup'

interface StudyState {
  students: Student[]
  currentStudentId: string | null
  courses: Course[]
  lectures: Lecture[]
  tasks: Task[]
  exams: Exam[]

  // Profiles
  signUp: (name: string, email: string) => Student
  signIn: (studentId: string) => void
  signOut: () => void
  removeStudent: (studentId: string) => void
  loadSampleProfile: () => Student

  // Courses
  addCourse: (course: Omit<Course, 'id' | 'studentId' | 'createdAt'>) => Course | undefined
  updateCourse: (id: string, patch: Partial<Course>) => void
  removeCourse: (id: string) => void

  // Lectures
  addLecture: (lecture: Omit<Lecture, 'id' | 'studentId'>) => Lecture | undefined
  updateLecture: (id: string, patch: Partial<Lecture>) => void
  removeLecture: (id: string) => void

  // Tasks & assignments
  addTask: (
    task: Omit<Task, 'id' | 'studentId' | 'createdAt' | 'status'> & { status?: TaskStatus },
  ) => Task | undefined
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  // Exams
  addExam: (exam: Omit<Exam, 'id' | 'studentId' | 'createdAt'>) => Exam | undefined
  updateExam: (id: string, patch: Partial<Exam>) => void
  removeExam: (id: string) => void

  // Backup & reset
  /** Snapshot of every collection, for export. */
  exportData: () => StudyData
  /** Replace all study data with a restored backup. */
  replaceData: (data: StudyData) => void
  /** Delete every profile and all their data. */
  clearData: () => void
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      students: [],
      currentStudentId: null,
      courses: [],
      lectures: [],
      tasks: [],
      exams: [],

      // --- Profiles ------------------------------------------------------

      signUp: (name, email) => {
        const student: Student = {
          id: uid('student'),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          createdAt: Date.now(),
        }
        set((s) => ({ students: [...s.students, student], currentStudentId: student.id }))
        return student
      },

      signIn: (studentId) => set({ currentStudentId: studentId }),

      signOut: () => set({ currentStudentId: null }),

      removeStudent: (studentId) =>
        set((s) => ({
          students: s.students.filter((x) => x.id !== studentId),
          courses: s.courses.filter((x) => x.studentId !== studentId),
          lectures: s.lectures.filter((x) => x.studentId !== studentId),
          tasks: s.tasks.filter((x) => x.studentId !== studentId),
          exams: s.exams.filter((x) => x.studentId !== studentId),
          currentStudentId: s.currentStudentId === studentId ? null : s.currentStudentId,
        })),

      loadSampleProfile: () => {
        const data = sampleStudyData()
        set((s) => ({
          students: [...s.students, data.student],
          courses: [...s.courses, ...data.courses],
          lectures: [...s.lectures, ...data.lectures],
          tasks: [...s.tasks, ...data.tasks],
          exams: [...s.exams, ...data.exams],
          currentStudentId: data.student.id,
        }))
        return data.student
      },

      // --- Courses -------------------------------------------------------

      addCourse: (course) => {
        const studentId = get().currentStudentId
        if (!studentId) return undefined
        const record: Course = { ...course, id: uid('course'), studentId, createdAt: Date.now() }
        set((s) => ({ courses: [...s.courses, record] }))
        return record
      },

      updateCourse: (id, patch) =>
        set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      /** Deleting a course takes its schedule, exams and coursework with it. */
      removeCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          lectures: s.lectures.filter((l) => l.courseId !== id),
          exams: s.exams.filter((e) => e.courseId !== id),
          tasks: s.tasks.filter((t) => t.courseId !== id),
        })),

      // --- Lectures ------------------------------------------------------

      addLecture: (lecture) => {
        const studentId = get().currentStudentId
        if (!studentId) return undefined
        const record: Lecture = { ...lecture, id: uid('lecture'), studentId }
        set((s) => ({ lectures: [...s.lectures, record] }))
        return record
      },

      updateLecture: (id, patch) =>
        set((s) => ({ lectures: s.lectures.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      removeLecture: (id) => set((s) => ({ lectures: s.lectures.filter((l) => l.id !== id) })),

      // --- Tasks & assignments -------------------------------------------

      addTask: (task) => {
        const studentId = get().currentStudentId
        if (!studentId) return undefined
        const record: Task = {
          ...task,
          status: task.status ?? 'todo',
          id: uid('task'),
          studentId,
          createdAt: Date.now(),
        }
        set((s) => ({ tasks: [...s.tasks, record] }))
        return record
      },

      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            const done = t.status === 'done'
            return {
              ...t,
              status: done ? 'todo' : 'done',
              completedAt: done ? undefined : Date.now(),
            }
          }),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      // --- Exams ---------------------------------------------------------

      addExam: (exam) => {
        const studentId = get().currentStudentId
        if (!studentId) return undefined
        const record: Exam = { ...exam, id: uid('exam'), studentId, createdAt: Date.now() }
        set((s) => ({ exams: [...s.exams, record] }))
        return record
      },

      updateExam: (id, patch) =>
        set((s) => ({ exams: s.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      removeExam: (id) => set((s) => ({ exams: s.exams.filter((e) => e.id !== id) })),

      // --- Backup & reset ------------------------------------------------

      exportData: () => {
        const { students, courses, lectures, tasks, exams } = get()
        return { students, courses, lectures, tasks, exams }
      },

      replaceData: (data) =>
        set({
          students: data.students,
          courses: data.courses,
          lectures: data.lectures,
          tasks: data.tasks,
          exams: data.exams,
          // Sign in to the restored profile when there is exactly one, so a
          // restore lands on the dashboard rather than the profile picker.
          currentStudentId: data.students.length === 1 ? data.students[0].id : null,
        }),

      clearData: () =>
        set({
          students: [],
          courses: [],
          lectures: [],
          tasks: [],
          exams: [],
          currentStudentId: null,
        }),
    }),
    {
      name: 'mero-study',
      version: 1,
    },
  ),
)

/* ==========================================================================
   Selectors

   Each hook reads the raw (reference-stable) array from the store and narrows
   it in `useMemo`. Filtering inside the zustand selector itself would return a
   fresh array on every snapshot read, which React's `useSyncExternalStore`
   rejects as an uncached snapshot.
   ========================================================================== */

export function useCurrentStudent(): Student | undefined {
  const id = useStudyStore((s) => s.currentStudentId)
  const students = useStudyStore((s) => s.students)
  return useMemo(() => students.find((x) => x.id === id), [students, id])
}

export function useCourses(): Course[] {
  const id = useStudyStore((s) => s.currentStudentId)
  const courses = useStudyStore((s) => s.courses)
  return useMemo(
    () => courses.filter((c) => c.studentId === id).sort((a, b) => a.name.localeCompare(b.name)),
    [courses, id],
  )
}

export function useLectures(): Lecture[] {
  const id = useStudyStore((s) => s.currentStudentId)
  const lectures = useStudyStore((s) => s.lectures)
  return useMemo(() => lectures.filter((l) => l.studentId === id), [lectures, id])
}

export function useTasks(): Task[] {
  const id = useStudyStore((s) => s.currentStudentId)
  const tasks = useStudyStore((s) => s.tasks)
  return useMemo(() => tasks.filter((t) => t.studentId === id), [tasks, id])
}

export function useExams(): Exam[] {
  const id = useStudyStore((s) => s.currentStudentId)
  const exams = useStudyStore((s) => s.exams)
  return useMemo(() => exams.filter((e) => e.studentId === id), [exams, id])
}

/** Course lookup by id, for rendering course names/colours on other records. */
export function useCourseMap(): Map<string, Course> {
  const courses = useCourses()
  return useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
}
