import { useMemo, useState, type FormEvent } from 'react'
import { useCourseMap, useCourses, useExams, useStudyStore } from '../../store/useStudyStore'
import type { Exam } from '../../types'
import {
  byDate,
  countdownLabel,
  daysUntil,
  formatDateLong,
  formatTime,
  todayISO,
} from '../../lib/date'
import { pluralize } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { PlusIcon, TrashIcon } from '../Icons'
import { CourseChip, Field, Modal, SectionEmpty } from './ui'

function ExamForm({ exam, onClose }: { exam?: Exam; onClose: () => void }) {
  const courses = useCourses()
  const addExam = useStudyStore((s) => s.addExam)
  const updateExam = useStudyStore((s) => s.updateExam)
  const showToast = useToast((s) => s.show)

  const [courseId, setCourseId] = useState(exam?.courseId ?? courses[0]?.id ?? '')
  const [title, setTitle] = useState(exam?.title ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [time, setTime] = useState(exam?.time ?? '')
  const [location, setLocation] = useState(exam?.location ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!courseId) return setError('Pick the course this exam belongs to.')
    if (!date) return setError('Set the exam date.')

    const course = courses.find((c) => c.id === courseId)
    const payload = {
      courseId,
      // Fall back to the course name so the list never shows an untitled row.
      title: title.trim() || `${course?.name ?? 'Course'} exam`,
      date,
      time: time || undefined,
      location: location.trim() || undefined,
    }
    if (exam) {
      updateExam(exam.id, payload)
      showToast('Exam updated')
    } else {
      addExam(payload)
      showToast('Exam added')
    }
    onClose()
  }

  return (
    <Modal title={exam ? 'Edit exam' : 'Add exam'} onClose={onClose}>
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
        <Field label="Title" hint="Optional — defaults to the course name.">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Midterm"
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setError(null)
              }}
            />
          </Field>
          <Field label="Time" hint="Optional.">
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Room" hint="Optional.">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Exam Hall 1"
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {exam ? 'Save changes' : 'Add exam'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** One exam card. Reused by the dashboard. */
export function ExamCard({ exam, onEdit }: { exam: Exam; onEdit?: (exam: Exam) => void }) {
  const courseMap = useCourseMap()
  const removeExam = useStudyStore((s) => s.removeExam)
  const showToast = useToast((s) => s.show)

  const days = daysUntil(exam.date)
  const past = days !== null && days < 0
  const imminent = days !== null && days >= 0 && days <= 7

  return (
    <div className={'exam-card' + (past ? ' past' : '') + (imminent ? ' imminent' : '')}>
      <div className="exam-date">
        <span className="exam-countdown">
          {past ? 'Done' : days === 0 ? 'Today' : `${days}d`}
        </span>
      </div>
      <div className="exam-body">
        <h3>{exam.title}</h3>
        <div className="exam-meta">
          <CourseChip course={courseMap.get(exam.courseId)} />
          <span>{formatDateLong(exam.date)}</span>
          {exam.time && <span>· {formatTime(exam.time)}</span>}
          {exam.location && <span>· {exam.location}</span>}
        </div>
        {!past && <p className="exam-due">{countdownLabel(exam.date)}</p>}
      </div>
      <div className="exam-actions">
        {onEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(exam)}>
            Edit
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={`Delete ${exam.title}`}
          onClick={() => {
            removeExam(exam.id)
            showToast('Exam deleted')
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function Exams() {
  const exams = useExams()
  const courses = useCourses()
  const [form, setForm] = useState<{ open: boolean; exam?: Exam }>({ open: false })

  const { upcoming, past } = useMemo(() => {
    const today = todayISO()
    const sorted = [...exams].sort(byDate((e) => e.date))
    return {
      upcoming: sorted.filter((e) => e.date >= today),
      // Most recent first, so the last exam sat is at the top.
      past: sorted.filter((e) => e.date < today).reverse(),
    }
  }, [exams])

  const edit = (exam: Exam) => setForm({ open: true, exam })

  return (
    <div className="study-page">
      <div className="page-head study-head">
        <div>
          <h1>Exams</h1>
          <p>
            {upcoming.length === 0
              ? 'Record exam dates so the dashboard can count down to them.'
              : `${pluralize(upcoming.length, 'exam')} ahead.`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={courses.length === 0}
          title={courses.length === 0 ? 'Add a course first' : undefined}
          onClick={() => setForm({ open: true })}
        >
          <PlusIcon /> Add exam
        </button>
      </div>

      {exams.length === 0 ? (
        <SectionEmpty title="No exams recorded">
          {courses.length === 0
            ? 'Add a course first — every exam belongs to one.'
            : 'Add an exam date and it will appear on your dashboard.'}
        </SectionEmpty>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="exam-list">
              {upcoming.map((e) => (
                <ExamCard key={e.id} exam={e} onEdit={edit} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h2 className="subhead">Past</h2>
              <div className="exam-list">
                {past.map((e) => (
                  <ExamCard key={e.id} exam={e} onEdit={edit} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {form.open && <ExamForm exam={form.exam} onClose={() => setForm({ open: false })} />}
    </div>
  )
}
