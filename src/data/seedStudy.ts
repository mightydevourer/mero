import type { Course, Exam, Lecture, Student, Task } from '../types'
import { toISODate } from '../lib/date'
import { uid } from '../lib/id'
import { COURSE_COLORS } from '../lib/courseColors'

/** ISO date `offset` days from today, so the sample always looks current. */
function inDays(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return toISODate(date)
}

export interface SampleStudyData {
  student: Student
  courses: Course[]
  lectures: Lecture[]
  tasks: Task[]
  exams: Exam[]
}

/**
 * A populated demo semester. Everything is dated relative to the current day,
 * so the dashboard shows live countdowns whenever the sample is loaded.
 */
export function sampleStudyData(): SampleStudyData {
  const now = Date.now()
  const student: Student = {
    id: uid('student'),
    name: 'Sample Student',
    email: 'sample@university.edu',
    createdAt: now,
  }
  const sid = student.id

  const course = (name: string, instructor: string, code: string, i: number): Course => ({
    id: uid('course'),
    studentId: sid,
    name,
    instructor,
    code,
    color: COURSE_COLORS[i % COURSE_COLORS.length],
    createdAt: now,
  })

  const web = course('Web Programming', 'Dr. Amara Osei', 'CS-204', 0)
  const db = course('Database Systems', 'Prof. Lena Fischer', 'CS-210', 1)
  const discrete = course('Discrete Mathematics', 'Dr. Hugo Marín', 'MA-118', 2)
  const writing = course('Technical Writing', 'Ms. Priya Raman', 'EN-102', 3)
  const courses = [web, db, discrete, writing]

  const lecture = (
    c: Course,
    day: Lecture['day'],
    startTime: string,
    endTime: string,
    location: string,
  ): Lecture => ({
    id: uid('lecture'),
    studentId: sid,
    courseId: c.id,
    day,
    startTime,
    endTime,
    location,
  })

  const lectures: Lecture[] = [
    lecture(web, 1, '09:00', '10:30', 'Hall B2'),
    lecture(web, 3, '09:00', '10:30', 'Lab 4'),
    lecture(db, 1, '13:00', '14:30', 'Hall A1'),
    lecture(db, 4, '11:00', '12:30', 'Lab 2'),
    lecture(discrete, 2, '10:00', '11:30', 'Hall C3'),
    lecture(discrete, 4, '15:00', '16:30', 'Hall C3'),
    lecture(writing, 5, '14:00', '15:30', 'Room 210'),
  ]

  const task = (
    c: Course | undefined,
    kind: Task['kind'],
    title: string,
    priority: Task['priority'],
    deadline: string | undefined,
    description?: string,
    status: Task['status'] = 'todo',
  ): Task => ({
    id: uid('task'),
    studentId: sid,
    courseId: c?.id,
    kind,
    title,
    description,
    deadline,
    priority,
    status,
    createdAt: now,
    completedAt: status === 'done' ? now : undefined,
  })

  const tasks: Task[] = [
    task(
      web,
      'assignment',
      'PHP Project',
      'high',
      inDays(5),
      'Build the server-side layer: sessions, CRUD endpoints, and prepared statements for every query.',
    ),
    task(
      db,
      'assignment',
      'Normalisation worksheet',
      'medium',
      inDays(2),
      'Take the sample schema through 1NF, 2NF and 3NF, showing the functional dependencies at each step.',
    ),
    task(discrete, 'assignment', 'Problem set 6 — graph theory', 'high', inDays(1)),
    task(
      writing,
      'assignment',
      'Draft of the technical report',
      'low',
      inDays(12),
      'Twelve pages, IEEE citation style.',
    ),
    task(web, 'assignment', 'CSS layout exercise', 'medium', inDays(-3), undefined, 'done'),

    task(web, 'task', 'Review PDO prepared statements', 'high', inDays(0)),
    task(discrete, 'task', 'Re-work last week’s proof exercises', 'medium', inDays(0)),
    task(undefined, 'task', 'Plan the week’s study blocks', 'low', inDays(0), undefined, 'done'),
    task(db, 'task', 'Read chapter 7 — indexing', 'medium', inDays(3)),
    task(db, 'task', 'Summarise the JOIN lecture notes', 'low', undefined, undefined, 'done'),
    task(writing, 'task', 'Collect sources for the report', 'low', inDays(6)),
  ]

  const exam = (
    c: Course,
    title: string,
    date: string,
    time: string,
    location: string,
  ): Exam => ({
    id: uid('exam'),
    studentId: sid,
    courseId: c.id,
    title,
    date,
    time,
    location,
    createdAt: now,
  })

  const exams: Exam[] = [
    exam(discrete, 'Midterm — Discrete Mathematics', inDays(8), '09:00', 'Exam Hall 1'),
    exam(db, 'Database Systems midterm', inDays(15), '13:30', 'Hall A1'),
    exam(web, 'Web Programming practical', inDays(24), '10:00', 'Lab 4'),
  ]

  return { student, courses, lectures, tasks, exams }
}
