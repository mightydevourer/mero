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
import { useToast } from '../../lib/toast'
import { useI18n } from '../../i18n'
import { PlusIcon, TrashIcon } from '../Icons'
import { Field, Modal, SectionEmpty } from './ui'

/**
 * Sunday-first ordering over `Date.prototype.getDay()` values. Under RTL the
 * grid mirrors on its own, so Arabic reads الأحد → السبت right-to-left from
 * this same array.
 */
const WEEK_ORDER: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

function CourseForm({ course, onClose }: { course?: Course; onClose: () => void }) {
  const { t } = useI18n()
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
    if (!trimmed) return setError(t('courseForm.errName'))

    const payload = {
      name: trimmed,
      instructor: instructor.trim(),
      code: code.trim() || undefined,
      color,
    }
    if (course) {
      updateCourse(course.id, payload)
      showToast(t('courseForm.updated'))
    } else {
      addCourse(payload)
      showToast(t('courseForm.added'))
    }
    onClose()
  }

  return (
    <Modal
      title={t(course ? 'courseForm.editTitle' : 'courseForm.addTitle')}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <Field label={t('courseForm.name')}>
          <input
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={t('courseForm.namePlaceholder')}
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label={t('courseForm.instructor')}>
            <input
              className="input"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder={t('courseForm.instructorPlaceholder')}
            />
          </Field>
          <Field label={t('courseForm.code')} hint={t('courseForm.codeHint')}>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('courseForm.codePlaceholder')}
            />
          </Field>
        </div>
        <Field label={t('courseForm.color')}>
          <div className="color-picker">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={'color-swatch' + (color === c ? ' active' : '')}
                style={{ background: c }}
                aria-label={t('courseForm.colorAria', { color: c })}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(course ? 'form.save' : 'courses.add')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LectureForm({ lecture, onClose }: { lecture?: Lecture; onClose: () => void }) {
  const { t, fmt } = useI18n()
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
    if (!courseId) return setError(t('lectureForm.errCourse'))
    if (!startTime || !endTime) return setError(t('lectureForm.errTimes'))
    if (endTime <= startTime) return setError(t('lectureForm.errOrder'))

    const payload = { courseId, day, startTime, endTime, location: location.trim() || undefined }
    if (lecture) {
      updateLecture(lecture.id, payload)
      showToast(t('lectureForm.updated'))
    } else {
      addLecture(payload)
      showToast(t('lectureForm.added'))
    }
    onClose()
  }

  return (
    <Modal
      title={t(lecture ? 'lectureForm.editTitle' : 'lectureForm.addTitle')}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <Field label={t('lectureForm.course')}>
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
        <Field label={t('lectureForm.day')}>
          <select
            className="select"
            value={day}
            onChange={(e) => setDay(Number(e.target.value) as Weekday)}
          >
            {WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {fmt.weekday(d)}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label={t('lectureForm.starts')}>
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
          <Field label={t('lectureForm.ends')}>
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
        <Field label={t('lectureForm.room')} hint={t('form.optional')}>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('lectureForm.roomPlaceholder')}
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(lecture ? 'form.save' : 'schedule.add')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Courses() {
  const { t, tn, fmt } = useI18n()
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
    for (const task of tasks) {
      if (!task.courseId || task.status === 'done') continue
      const m = meta.get(task.courseId)
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
      ? t('courses.confirmCascade', {
          lectures: tn('count.lecture', meta?.lectures ?? 0),
          tasks: tn('count.openTask', meta?.open ?? 0),
          exams: tn('count.exam', meta?.exams ?? 0),
        })
      : ''
    if (!window.confirm(t('courses.confirmDelete', { name: course.name }) + warning)) return
    removeCourse(course.id)
    showToast(t('courseForm.deleted'))
  }

  return (
    <div className="study-page">
      <div className="page-head study-head">
        <div>
          <h1>{t('courses.title')}</h1>
          <p>{t('courses.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCourseForm({ open: true })}>
          <PlusIcon /> {t('courses.add')}
        </button>
      </div>

      {courses.length === 0 ? (
        <SectionEmpty title={t('courses.empty')}>{t('courses.emptyBody')}</SectionEmpty>
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
                    {tn('count.lecture', meta?.lectures ?? 0)} ·{' '}
                    {tn('count.openTask', meta?.open ?? 0)} ·{' '}
                    {tn('count.exam', meta?.exams ?? 0)}
                  </p>
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCourseForm({ open: true, course: c })}
                  >
                    {t('courses.edit')}
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={t('courses.deleteAria', { name: c.name })}
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
          <h2>{t('schedule.title')}</h2>
          <p>{t('schedule.subtitle')}</p>
        </div>
        <button
          className="btn"
          disabled={courses.length === 0}
          title={courses.length === 0 ? t('courses.addFirst') : undefined}
          onClick={() => setLectureForm({ open: true })}
        >
          <PlusIcon /> {t('schedule.add')}
        </button>
      </div>

      {lectures.length === 0 ? (
        <SectionEmpty title={t('schedule.empty')}>
          {courses.length === 0 ? t('schedule.emptyNoCourses') : t('schedule.emptyBody')}
        </SectionEmpty>
      ) : (
        <div className="week-grid">
          {WEEK_ORDER.map((day) => {
            const slots = week.get(day) ?? []
            return (
              <div className="week-col" key={day}>
                <div className="week-day">
                  <span className="week-day-short">{fmt.weekdayShort(day)}</span>
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
                        style={{ borderInlineStartColor: course?.color ?? 'var(--border)' }}
                      >
                        <button
                          className="slot-main"
                          onClick={() => setLectureForm({ open: true, lecture: l })}
                          title={t('schedule.editAria')}
                        >
                          <strong>{course?.code ?? course?.name ?? t('lectureForm.course')}</strong>
                          {/* <bdi> isolates each time so the pair keeps its
                              start–end order when the page is RTL. */}
                          <span className="slot-time">
                            <bdi>{fmt.time(l.startTime)}</bdi> – <bdi>{fmt.time(l.endTime)}</bdi>
                          </span>
                          {l.location && <span className="slot-room">{l.location}</span>}
                        </button>
                        <button
                          className="slot-remove"
                          aria-label={t('schedule.removeAria')}
                          onClick={() => {
                            removeLecture(l.id)
                            showToast(t('lectureForm.removed'))
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
