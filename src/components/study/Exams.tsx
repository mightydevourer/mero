import { useMemo, useState, type FormEvent } from 'react'
import { useCourseMap, useCourses, useExams, useStudyStore } from '../../store/useStudyStore'
import type { Exam } from '../../types'
import { byDate, daysUntil, todayISO } from '../../lib/date'
import { useToast } from '../../lib/toast'
import { useI18n } from '../../i18n'
import { PlusIcon, TrashIcon } from '../Icons'
import { CourseChip, Field, Modal, SectionEmpty } from './ui'

function ExamForm({ exam, onClose }: { exam?: Exam; onClose: () => void }) {
  const { t } = useI18n()
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
    if (!courseId) return setError(t('examForm.errCourse'))
    if (!date) return setError(t('examForm.errDate'))

    const course = courses.find((c) => c.id === courseId)
    const payload = {
      courseId,
      // Fall back to the course name so the list never shows an untitled row.
      title:
        title.trim() ||
        t('exams.defaultTitle', { course: course?.name ?? t('examForm.course') }),
      date,
      time: time || undefined,
      location: location.trim() || undefined,
    }
    if (exam) {
      updateExam(exam.id, payload)
      showToast(t('examForm.updated'))
    } else {
      addExam(payload)
      showToast(t('examForm.added'))
    }
    onClose()
  }

  return (
    <Modal title={t(exam ? 'examForm.editTitle' : 'examForm.addTitle')} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label={t('examForm.course')}>
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
        <Field label={t('examForm.title')} hint={t('examForm.titleHint')}>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('examForm.titlePlaceholder')}
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label={t('examForm.date')}>
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
          <Field label={t('examForm.time')} hint={t('form.optional')}>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('examForm.room')} hint={t('form.optional')}>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('examForm.roomPlaceholder')}
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(exam ? 'form.save' : 'exams.add')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** One exam card. Reused by the dashboard. */
export function ExamCard({ exam, onEdit }: { exam: Exam; onEdit?: (exam: Exam) => void }) {
  const { t, fmt } = useI18n()
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
          {past
            ? t('exams.done')
            : days === 0
              ? t('date.today')
              : t('exams.countdownShort', { n: days ?? 0 })}
        </span>
      </div>
      <div className="exam-body">
        <h3>{exam.title}</h3>
        <div className="exam-meta">
          <CourseChip course={courseMap.get(exam.courseId)} />
          <bdi>{fmt.dateLong(exam.date)}</bdi>
          {exam.time && <bdi>· {fmt.time(exam.time)}</bdi>}
          {exam.location && <bdi>· {exam.location}</bdi>}
        </div>
        {!past && <p className="exam-due">{fmt.countdown(exam.date)}</p>}
      </div>
      <div className="exam-actions">
        {onEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(exam)}>
            {t('tasks.edit')}
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={t('exams.deleteAria', { title: exam.title })}
          onClick={() => {
            removeExam(exam.id)
            showToast(t('examForm.deleted'))
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function Exams() {
  const { t, tn } = useI18n()
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
          <h1>{t('exams.title')}</h1>
          <p>
            {upcoming.length === 0
              ? t('exams.subtitleEmpty')
              : tn('exams.ahead', upcoming.length)}
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={courses.length === 0}
          title={courses.length === 0 ? t('courses.addFirst') : undefined}
          onClick={() => setForm({ open: true })}
        >
          <PlusIcon /> {t('exams.add')}
        </button>
      </div>

      {exams.length === 0 ? (
        <SectionEmpty title={t('exams.empty')}>
          {courses.length === 0 ? t('exams.emptyNoCourses') : t('exams.emptyBody')}
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
              <h2 className="subhead">{t('exams.past')}</h2>
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
