import { useMemo, useState, type FormEvent } from 'react'
import {
  useCourses,
  useExams,
  useLectures,
  useStudyStore,
  useTasks,
} from '../../store/useStudyStore'
import type { Course, Lecture, Weekday } from '../../types'
import { COURSE_COLORS, nextCourseColor } from '../../lib/courseColors'
import { WEEKDAYS, WEEKDAYS_SHORT, formatTime } from '../../lib/date'
import { pluralize } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { PlusIcon, TrashIcon } from '../Icons'
import { Field, Modal, SectionEmpty } from './ui'

/** Sunday-first ordering over `Date.prototype.getDay()` values. */
const WEEK_ORDER: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

function CourseForm({ course, onClose }: { course?: Course; onClose: () => void }) {
  const courses = useCourses()
  const addCourse = useStudyStore((s) => s.addCourse)
  const updateCourse = useStudyStore((s) => s.updateCourse)
  const showToast = useToast((s) => s.show)

  const [name, setName] = useState(course?.name ?? '')
  const [instructor, setInstructor] = useState(course?.instructor ?? '')
  const [code, setCode] = useState(course?.code ?? '')
  const [color, setColor] = useState(
    course?.color ?? nextCourseColor(courses.map((c) => c.color)),
  )
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('A course needs a name.')

    const payload = {
      name: trimmed,
      instructor: instructor.trim(),
      code: code.trim() || undefined,
      color,
    }
    if (course) {
      updateCourse(course.id, payload)
      showToast('Course updated')
    } else {
      addCourse(payload)
      showToast('Course added')
    }
    onClose()
  }

  return (
    <Modal title={course ? 'Edit course' : 'Add course'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Course name">
          <input
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="Web Programming"
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label="Instructor">
            <input
              className="input"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Dr. Amara Osei"
            />
          </Field>
          <Field label="Course code" hint="Optional — shown on compact cards.">
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS-204"
            />
          </Field>
        </div>
        <Field label="Colour">
          <div className="color-picker">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={'color-swatch' + (color === c ? ' active' : '')}
                style={{ background: c }}
                aria-label={`Use colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {course ? 'Save changes' : 'Add course'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LectureForm({ lecture, onClose }: { lecture?: Lecture; onClose: () => void }) {
  const courses = useCourses()
  const addLecture = useStudyStore((s) => s.addLecture)
  const updateLecture = useStudyStore((s) => s.updateLecture)
  const showToast = useToast((s) => s.show)

  const [courseId, setCourseId] = useState(lecture?.courseId ?? courses[0]?.id ?? '')
  const [day, setDay] = useState<Weekday>(lecture?.day ?? 1)
  const [startTime, setStartTime] = useState(lecture?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(lecture?.endTime ?? '10:30')
  const [location, setLocation] = useState(lecture?.location ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!courseId) return setError('Pick a course for this lecture.')
    if (!startTime || !endTime) return setError('Set a start and end time.')
    if (endTime <= startTime) return setError('The end time must come after the start time.')

    const payload = { courseId, day, startTime, endTime, location: location.trim() || undefined }
    if (lecture) {
      updateLecture(lecture.id, payload)
      showToast('Lecture updated')
    } else {
      addLecture(payload)
      showToast('Lecture added')
    }
    onClose()
  }

  return (
    <Modal title={lecture ? 'Edit lecture' : 'Add lecture'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Course">
          <select
            className="select"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value)
              setError(null)
            }}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <select
            className="select"
            value={day}
            onChange={(e) => setDay(Number(e.target.value) as Weekday)}
          >
            {WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {WEEKDAYS[d]}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Starts">
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                setError(null)
              }}
            />
          </Field>
          <Field label="Ends">
            <input
              className="input"
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                setError(null)
              }}
            />
          </Field>
        </div>
        <Field label="Room" hint="Optional.">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Hall B2"
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {lecture ? 'Save changes' : 'Add lecture'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Courses() {
  const courses = useCourses()
  const lectures = useLectures()
  const tasks = useTasks()
  const exams = useExams()
  const removeCourse = useStudyStore((s) => s.removeCourse)
  const removeLecture = useStudyStore((s) => s.removeLecture)
  const showToast = useToast((s) => s.show)

  const [courseForm, setCourseForm] = useState<{ open: boolean; course?: Course }>({ open: false })
  const [lectureForm, setLectureForm] = useState<{ open: boolean; lecture?: Lecture }>({
    open: false,
  })

  /** Lectures bucketed by weekday and sorted by start time. */
  const week = useMemo(() => {
    const map = new Map<Weekday, Lecture[]>()
    for (const day of WEEK_ORDER) map.set(day, [])
    for (const l of lectures) map.get(l.day)?.push(l)
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [lectures])

  const courseMeta = useMemo(() => {
    const meta = new Map<string, { open: number; exams: number; lectures: number }>()
    for (const c of courses) meta.set(c.id, { open: 0, exams: 0, lectures: 0 })
    for (const t of tasks) {
      if (!t.courseId || t.status === 'done') continue
      const m = meta.get(t.courseId)
      if (m) m.open++
    }
    for (const e of exams) {
      const m = meta.get(e.courseId)
      if (m) m.exams++
    }
    for (const l of lectures) {
      const m = meta.get(l.courseId)
      if (m) m.lectures++
    }
    return meta
  }, [courses, tasks, exams, lectures])

  const confirmRemoveCourse = (course: Course) => {
    const meta = courseMeta.get(course.id)
    const attached = (meta?.open ?? 0) + (meta?.exams ?? 0) + (meta?.lectures ?? 0)
    const warning = attached
      ? `\n\nIts ${pluralize(meta?.lectures ?? 0, 'lecture')}, ${pluralize(
          meta?.open ?? 0,
          'open task',
        )} and ${pluralize(meta?.exams ?? 0, 'exam')} will be deleted too.`
      : ''
    if (!window.confirm(`Delete “${course.name}”?${warning}`)) return
    removeCourse(course.id)
    showToast('Course deleted')
  }

  return (
    <div className="study-page">
      <div className="page-head study-head">
        <div>
          <h1>Courses</h1>
          <p>The subjects you are enrolled in, and when they meet each week.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCourseForm({ open: true })}>
          <PlusIcon /> Add course
        </button>
      </div>

      {courses.length === 0 ? (
        <SectionEmpty title="No courses yet">
          Add your first course — assignments, exams and lectures all hang off it.
        </SectionEmpty>
      ) : (
        <div className="course-grid">
          {courses.map((c) => {
            const meta = courseMeta.get(c.id)
            return (
              <div className="course-card" key={c.id}>
                <span className="course-stripe" style={{ background: c.color }} />
                <div className="course-body">
                  <div className="course-title-row">
                    <h3>{c.name}</h3>
                    {c.code && <span className="tag">{c.code}</span>}
                  </div>
                  {c.instructor && <p className="course-instructor">{c.instructor}</p>}
                  <p className="course-stats">
                    {pluralize(meta?.lectures ?? 0, 'lecture')} ·{' '}
                    {pluralize(meta?.open ?? 0, 'open task')} ·{' '}
                    {pluralize(meta?.exams ?? 0, 'exam')}
                  </p>
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCourseForm({ open: true, course: c })}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => confirmRemoveCourse(c)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="page-head study-head schedule-head">
        <div>
          <h2>Weekly schedule</h2>
          <p>Your recurring lecture slots.</p>
        </div>
        <button
          className="btn"
          disabled={courses.length === 0}
          title={courses.length === 0 ? 'Add a course first' : undefined}
          onClick={() => setLectureForm({ open: true })}
        >
          <PlusIcon /> Add lecture
        </button>
      </div>

      {lectures.length === 0 ? (
        <SectionEmpty title="Nothing scheduled">
          {courses.length === 0
            ? 'Add a course first, then give it lecture times.'
            : 'Add the days and times your lectures run.'}
        </SectionEmpty>
      ) : (
        <div className="week-grid">
          {WEEK_ORDER.map((day) => {
            const slots = week.get(day) ?? []
            return (
              <div className="week-col" key={day}>
                <div className="week-day">
                  <span className="week-day-short">{WEEKDAYS_SHORT[day]}</span>
                </div>
                {slots.length === 0 ? (
                  <p className="week-free">—</p>
                ) : (
                  slots.map((l) => {
                    const course = courses.find((c) => c.id === l.courseId)
                    return (
                      <div
                        className="slot"
                        key={l.id}
                        style={{ borderLeftColor: course?.color ?? 'var(--border)' }}
                      >
                        <button
                          className="slot-main"
                          onClick={() => setLectureForm({ open: true, lecture: l })}
                          title="Edit this lecture"
                        >
                          <strong>{course?.code ?? course?.name ?? 'Course'}</strong>
                          <span>
                            {formatTime(l.startTime)} – {formatTime(l.endTime)}
                          </span>
                          {l.location && <span className="slot-room">{l.location}</span>}
                        </button>
                        <button
                          className="slot-remove"
                          aria-label="Remove lecture"
                          onClick={() => {
                            removeLecture(l.id)
                            showToast('Lecture removed')
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      )}

      {courseForm.open && (
        <CourseForm course={courseForm.course} onClose={() => setCourseForm({ open: false })} />
      )}
      {lectureForm.open && (
        <LectureForm
          lecture={lectureForm.lecture}
          onClose={() => setLectureForm({ open: false })}
        />
      )}
    </div>
  )
}
