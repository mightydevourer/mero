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
import { byDate, daysUntil, isOverdue, todayISO } from '../../lib/date'
import { useI18n, type StringKey } from '../../i18n'
import { CourseChip, ProgressRing, SectionEmpty } from './ui'
import { TaskRow, compareTasks } from './Tasks'

/** How far ahead the dashboard looks for deadlines and exams. */
const HORIZON_DAYS = 14

const PRIORITY_DOT: Record<Priority, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
}

function greetingKey(): StringKey {
  const hour = new Date().getHours()
  if (hour < 12) return 'dash.morning'
  if (hour < 18) return 'dash.afternoon'
  return 'dash.evening'
}

export default function Dashboard() {
  const { t, tn, fmt } = useI18n()
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
    const done = tasks.filter((task) => task.status === 'done').length
    const open = total - done
    const overdue = tasks.filter((task) => task.status !== 'done' && isOverdue(task.deadline)).length
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
        .filter((task) => task.status !== 'done' && (task.deadline === today || !task.deadline))
        .sort(compareTasks),
    [tasks, today],
  )

  const upcomingAssignments = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (task.kind !== 'assignment' || task.status === 'done' || !task.deadline) return false
          const days = daysUntil(task.deadline)
          return days !== null && days >= 0 && days <= HORIZON_DAYS
        })
        .sort(compareTasks),
    [tasks],
  )

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'done' && isOverdue(task.deadline))
        .sort(compareTasks),
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
          {student
            ? t('dash.greeting', {
                greeting: t(greetingKey()),
                name: student.name.split(' ')[0],
              })
            : t(greetingKey())}
        </h1>
        <p>
          {t('dash.dateLine', { weekday: fmt.weekday(weekday), date: fmt.date(today) })}
        </p>
      </div>

      {isNewProfile ? (
        <SectionEmpty title={t('dash.emptyTitle')}>
          {t('dash.emptyBody')} <Link to="/study/courses">{t('dash.emptyLink')}</Link>
        </SectionEmpty>
      ) : (
        <>
          <div className="dash-summary">
            <div className="dash-progress">
              <ProgressRing percent={stats.percent} />
              <div>
                <strong>{t('dash.progress')}</strong>
                <p>{t('dash.tasksComplete', { done: stats.done, total: stats.total })}</p>
              </div>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <span className="stat-value">{fmt.number(stats.open)}</span>
                <span className="stat-label">{t('dash.statOpen')}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{fmt.number(todayTasks.length)}</span>
                <span className="stat-label">{t('dash.statToday')}</span>
              </div>
              <div className={'stat-tile' + (stats.overdue > 0 ? ' alert' : '')}>
                <span className="stat-value">{fmt.number(stats.overdue)}</span>
                <span className="stat-label">{t('dash.statOverdue')}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{fmt.number(upcomingExams.length)}</span>
                <span className="stat-label">{t('dash.statExams')}</span>
              </div>
            </div>
          </div>

          {overdueTasks.length > 0 && (
            <section className="dash-section">
              <div className="dash-head">
                <h2>{t('dash.overdue')}</h2>
                <Link to="/study/tasks">{t('dash.allTasks')}</Link>
              </div>
              <div className="deadline-list">
                {overdueTasks.map((task) => (
                  <Link to="/study/tasks" className="deadline-row overdue" key={task.id}>
                    <span className="deadline-dot">{PRIORITY_DOT[task.priority]}</span>
                    <span className="deadline-title">{task.title}</span>
                    <CourseChip
                      course={task.courseId ? courseMap.get(task.courseId) : undefined}
                    />
                    <span className="deadline-when">{fmt.due(task.deadline)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="dash-columns">
            <section className="dash-section">
              <div className="dash-head">
                <h2>{t('dash.todayTasks')}</h2>
                <Link to="/study/tasks">{t('dash.allTasks')}</Link>
              </div>
              {todayTasks.length === 0 ? (
                <SectionEmpty title={t('dash.todayTasksEmpty')}>
                  {t('dash.todayTasksEmptyBody')}
                </SectionEmpty>
              ) : (
                <div className="task-list">
                  {todayTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </section>

            <div className="dash-side">
              <section className="dash-section">
                <div className="dash-head">
                  <h2>{t('dash.todayClasses')}</h2>
                  <Link to="/study/courses">{t('dash.schedule')}</Link>
                </div>
                {todayClasses.length === 0 ? (
                  <SectionEmpty title={t('dash.todayClassesEmpty')} />
                ) : (
                  <div className="class-list">
                    {todayClasses.map((l) => {
                      const course = courseMap.get(l.courseId)
                      return (
                        <div
                          className="class-row"
                          key={l.id}
                          style={{ borderInlineStartColor: course?.color ?? 'var(--border)' }}
                        >
                          <span className="class-time">
                            <bdi>{fmt.time(l.startTime)}</bdi>
                          </span>
                          <span className="class-name">{course?.name ?? ''}</span>
                          {l.location && <span className="class-room">{l.location}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="dash-section">
                <div className="dash-head">
                  <h2>{t('dash.upcomingAssignments')}</h2>
                  <Link to="/study/tasks">{t('dash.all')}</Link>
                </div>
                {upcomingAssignments.length === 0 ? (
                  <SectionEmpty title={t('dash.upcomingAssignmentsEmpty')}>
                    {tn('dash.noAssignmentsHorizon', HORIZON_DAYS)}
                  </SectionEmpty>
                ) : (
                  <div className="deadline-list">
                    {upcomingAssignments.map((task) => (
                      <Link to="/study/tasks" className="deadline-row" key={task.id}>
                        <span className="deadline-dot">{PRIORITY_DOT[task.priority]}</span>
                        <span className="deadline-title">{task.title}</span>
                        <span className="deadline-when">{fmt.due(task.deadline)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="dash-section">
                <div className="dash-head">
                  <h2>{t('dash.upcomingExams')}</h2>
                  <Link to="/study/exams">{t('dash.all')}</Link>
                </div>
                {upcomingExams.length === 0 ? (
                  <SectionEmpty title={t('dash.upcomingExamsEmpty')} />
                ) : (
                  <div className="deadline-list">
                    {upcomingExams.slice(0, 4).map((e) => (
                      <Link to="/study/exams" className="deadline-row" key={e.id}>
                        <span className="deadline-dot">📝</span>
                        <span className="deadline-title">{e.title}</span>
                        <span className="deadline-when">{fmt.countdown(e.date)}</span>
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
