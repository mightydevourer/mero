import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useCourseMap,
  useCourses,
  useCurrentStudent,
  useExams,
  useLectures,
  useTasks,
} from '../../store/useStudyStore'
import type { Priority, Weekday } from '../../types'
import {
  WEEKDAYS,
  byDate,
  countdownLabel,
  daysUntil,
  dueLabel,
  formatDate,
  formatTime,
  isOverdue,
  todayISO,
} from '../../lib/date'
import { CourseChip, ProgressRing, SectionEmpty } from './ui'
import { TaskRow, compareTasks } from './Tasks'

/** How far ahead the dashboard looks for deadlines and exams. */
const HORIZON_DAYS = 14

const PRIORITY_DOT: Record<Priority, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const student = useCurrentStudent()
  const tasks = useTasks()
  const exams = useExams()
  const lectures = useLectures()
  const courses = useCourses()
  const courseMap = useCourseMap()

  const today = todayISO()
  const weekday = new Date().getDay() as Weekday

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const open = total - done
    const overdue = tasks.filter((t) => t.status !== 'done' && isOverdue(t.deadline)).length
    return {
      total,
      done,
      open,
      overdue,
      percent: total ? Math.round((done / total) * 100) : 0,
    }
  }, [tasks])

  /** Anything open and dated today, plus undated study tasks to pick up. */
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && (t.deadline === today || !t.deadline))
        .sort(compareTasks),
    [tasks, today],
  )

  const upcomingAssignments = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (t.kind !== 'assignment' || t.status === 'done' || !t.deadline) return false
          const days = daysUntil(t.deadline)
          return days !== null && days >= 0 && days <= HORIZON_DAYS
        })
        .sort(compareTasks),
    [tasks],
  )

  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && isOverdue(t.deadline)).sort(compareTasks),
    [tasks],
  )

  const upcomingExams = useMemo(
    () => [...exams].filter((e) => e.date >= today).sort(byDate((e) => e.date)),
    [exams, today],
  )

  const todayClasses = useMemo(
    () =>
      lectures
        .filter((l) => l.day === weekday)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [lectures, weekday],
  )

  const isNewProfile = courses.length === 0 && tasks.length === 0 && exams.length === 0

  return (
    <div className="study-page">
      <div className="page-head">
        <h1>
          {greeting()}
          {student ? `, ${student.name.split(' ')[0]}` : ''}
        </h1>
        <p>
          {WEEKDAYS[weekday]}, {formatDate(today)}
        </p>
      </div>

      {isNewProfile ? (
        <SectionEmpty title="Your semester is empty">
          Start by <Link to="/study/courses">adding a course</Link> — assignments, exams and
          lectures all attach to one.
        </SectionEmpty>
      ) : (
        <>
          <div className="dash-summary">
            <div className="dash-progress">
              <ProgressRing percent={stats.percent} />
              <div>
                <strong>Progress</strong>
                <p>
                  {stats.done} of {stats.total} tasks complete
                </p>
              </div>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <span className="stat-value">{stats.open}</span>
                <span className="stat-label">Open</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{todayTasks.length}</span>
                <span className="stat-label">For today</span>
              </div>
              <div className={'stat-tile' + (stats.overdue > 0 ? ' alert' : '')}>
                <span className="stat-value">{stats.overdue}</span>
                <span className="stat-label">Overdue</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{upcomingExams.length}</span>
                <span className="stat-label">Exams ahead</span>
              </div>
            </div>
          </div>

          {overdueTasks.length > 0 && (
            <section className="dash-section">
              <div className="dash-head">
                <h2>Overdue</h2>
                <Link to="/study/tasks">All tasks →</Link>
              </div>
              <div className="deadline-list">
                {overdueTasks.map((t) => (
                  <Link to="/study/tasks" className="deadline-row overdue" key={t.id}>
                    <span className="deadline-dot">{PRIORITY_DOT[t.priority]}</span>
                    <span className="deadline-title">{t.title}</span>
                    <CourseChip course={t.courseId ? courseMap.get(t.courseId) : undefined} />
                    <span className="deadline-when">{dueLabel(t.deadline)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="dash-columns">
            <section className="dash-section">
              <div className="dash-head">
                <h2>Today’s tasks</h2>
                <Link to="/study/tasks">All tasks →</Link>
              </div>
              {todayTasks.length === 0 ? (
                <SectionEmpty title="Nothing left for today">
                  Everything dated today is done.
                </SectionEmpty>
              ) : (
                <div className="task-list">
                  {todayTasks.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              )}
            </section>

            <div className="dash-side">
              <section className="dash-section">
                <div className="dash-head">
                  <h2>Today’s classes</h2>
                  <Link to="/study/courses">Schedule →</Link>
                </div>
                {todayClasses.length === 0 ? (
                  <SectionEmpty title="No lectures today" />
                ) : (
                  <div className="class-list">
                    {todayClasses.map((l) => {
                      const course = courseMap.get(l.courseId)
                      return (
                        <div
                          className="class-row"
                          key={l.id}
                          style={{ borderLeftColor: course?.color ?? 'var(--border)' }}
                        >
                          <span className="class-time">{formatTime(l.startTime)}</span>
                          <span className="class-name">{course?.name ?? 'Course'}</span>
                          {l.location && <span className="class-room">{l.location}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="dash-section">
                <div className="dash-head">
                  <h2>Upcoming assignments</h2>
                  <Link to="/study/tasks">All →</Link>
                </div>
                {upcomingAssignments.length === 0 ? (
                  <SectionEmpty title="Nothing due soon">
                    No assignments in the next {HORIZON_DAYS} days.
                  </SectionEmpty>
                ) : (
                  <div className="deadline-list">
                    {upcomingAssignments.map((t) => (
                      <Link to="/study/tasks" className="deadline-row" key={t.id}>
                        <span className="deadline-dot">{PRIORITY_DOT[t.priority]}</span>
                        <span className="deadline-title">{t.title}</span>
                        <span className="deadline-when">{dueLabel(t.deadline)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="dash-section">
                <div className="dash-head">
                  <h2>Upcoming exams</h2>
                  <Link to="/study/exams">All →</Link>
                </div>
                {upcomingExams.length === 0 ? (
                  <SectionEmpty title="No exams scheduled" />
                ) : (
                  <div className="deadline-list">
                    {upcomingExams.slice(0, 4).map((e) => (
                      <Link to="/study/exams" className="deadline-row" key={e.id}>
                        <span className="deadline-dot">📝</span>
                        <span className="deadline-title">{e.title}</span>
                        <span className="deadline-when">{countdownLabel(e.date)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
