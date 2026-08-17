import { useMemo, useState, type FormEvent } from 'react'
import { useCourseMap, useCourses, useStudyStore, useTasks } from '../../store/useStudyStore'
import type { Priority, Task, TaskKind } from '../../types'
import { isOverdue, isToday, todayISO } from '../../lib/date'
import { useToast } from '../../lib/toast'
import { useI18n, type StringKey } from '../../i18n'
import { CheckIcon, PlusIcon, TrashIcon } from '../Icons'
import { CourseChip, Field, Modal, PriorityBadge, ProgressBar, SectionEmpty } from './ui'

type KindFilter = 'all' | TaskKind
type StatusFilter = 'all' | 'open' | 'done'

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/**
 * Open work first, ordered by deadline (undated last); completed items sink to
 * the bottom. Same-day items break ties on priority.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'done' ? 1 : -1
  if (a.deadline !== b.deadline) {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline < b.deadline ? -1 : 1
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
}

function TaskForm({
  task,
  defaultKind,
  onClose,
}: {
  task?: Task
  defaultKind: TaskKind
  onClose: () => void
}) {
  const { t } = useI18n()
  const courses = useCourses()
  const addTask = useStudyStore((s) => s.addTask)
  const updateTask = useStudyStore((s) => s.updateTask)
  const showToast = useToast((s) => s.show)

  const [kind, setKind] = useState<TaskKind>(task?.kind ?? defaultKind)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [courseId, setCourseId] = useState(task?.courseId ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError(t('taskForm.errTitle'))

    const payload = {
      kind,
      title: trimmed,
      description: description.trim() || undefined,
      courseId: courseId || undefined,
      deadline: deadline || undefined,
      priority,
    }
    if (task) {
      updateTask(task.id, payload)
      showToast(t('taskForm.saved'))
    } else {
      addTask(payload)
      showToast(t(kind === 'assignment' ? 'taskForm.assignmentAdded' : 'taskForm.taskAdded'))
    }
    onClose()
  }

  const modalTitle = task
    ? t('taskForm.editTitle')
    : t(kind === 'assignment' ? 'taskForm.newAssignment' : 'taskForm.newTask')

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label={t('taskForm.type')}>
          <div className="segmented">
            <button
              type="button"
              className={'segment' + (kind === 'assignment' ? ' active' : '')}
              onClick={() => setKind('assignment')}
            >
              {t('taskForm.assignment')}
            </button>
            <button
              type="button"
              className={'segment' + (kind === 'task' ? ' active' : '')}
              onClick={() => setKind('task')}
            >
              {t('taskForm.task')}
            </button>
          </div>
        </Field>
        <Field label={t('taskForm.title')}>
          <input
            className="input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            placeholder={t(
              kind === 'assignment'
                ? 'taskForm.titleAssignmentPlaceholder'
                : 'taskForm.titleTaskPlaceholder',
            )}
            autoFocus
          />
        </Field>
        <Field label={t('taskForm.description')} hint={t('form.optional')}>
          <textarea
            className="input textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('taskForm.descriptionPlaceholder')}
          />
        </Field>
        <div className="form-row">
          <Field label={t('taskForm.course')}>
            <select
              className="select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">{t('taskForm.noCourse')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('taskForm.deadline')}
            hint={kind === 'task' ? t('form.optional') : undefined}
          >
            <input
              className="input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('taskForm.priority')}>
          <div className="segmented">
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={'segment' + (priority === p ? ` active priority-${p}` : '')}
                onClick={() => setPriority(p)}
              >
                {t(`priority.${p}` as StringKey)}
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(task ? 'form.save' : 'form.addGeneric')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** One row in the task list. Reused by the dashboard. */
export function TaskRow({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
  const { t, fmt } = useI18n()
  const courseMap = useCourseMap()
  const toggleTask = useStudyStore((s) => s.toggleTask)
  const removeTask = useStudyStore((s) => s.removeTask)
  const showToast = useToast((s) => s.show)

  const done = task.status === 'done'
  const overdue = !done && isOverdue(task.deadline)
  const due = !done && isToday(task.deadline)

  return (
    <div className={'task-row' + (done ? ' done' : '') + (overdue ? ' overdue' : '')}>
      <button
        className={'task-check' + (done ? ' checked' : '')}
        onClick={() => toggleTask(task.id)}
        aria-pressed={done}
        aria-label={t(done ? 'tasks.markNotDone' : 'tasks.markDone', { title: task.title })}
      >
        {done && <CheckIcon width={14} height={14} />}
      </button>

      <div className="task-main">
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          {task.kind === 'assignment' && <span className="tag">{t('taskForm.assignment')}</span>}
        </div>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="task-meta">
          <CourseChip course={task.courseId ? courseMap.get(task.courseId) : undefined} />
          {task.deadline && (
            <span className={'task-due' + (overdue ? ' overdue' : due ? ' today' : '')}>
              <bdi>{fmt.dateLong(task.deadline)}</bdi> · {fmt.due(task.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="task-side">
        <PriorityBadge priority={task.priority} />
        {onEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>
            {t('tasks.edit')}
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={t('tasks.deleteAria', { title: task.title })}
          onClick={() => {
            removeTask(task.id)
            showToast(t('tasks.deleted'))
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { t, fmt } = useI18n()
  const tasks = useTasks()
  const courses = useCourses()
  const [form, setForm] = useState<{ open: boolean; task?: Task; kind: TaskKind }>({
    open: false,
    kind: 'assignment',
  })
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [courseFilter, setCourseFilter] = useState('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks
      .filter((task) => {
        if (kindFilter !== 'all' && task.kind !== kindFilter) return false
        if (statusFilter === 'open' && task.status === 'done') return false
        if (statusFilter === 'done' && task.status !== 'done') return false
        if (courseFilter && task.courseId !== courseFilter) return false
        if (q && !`${task.title} ${task.description ?? ''}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort(compareTasks)
  }, [tasks, kindFilter, statusFilter, courseFilter, query])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'done').length
    const overdue = tasks.filter((task) => task.status !== 'done' && isOverdue(task.deadline)).length
    const today = tasks.filter((task) => task.status !== 'done' && task.deadline === todayISO()).length
    return { total, done, overdue, today, percent: total ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  const kindFilters: [KindFilter, StringKey][] = [
    ['all', 'tasks.filterAll'],
    ['assignment', 'tasks.filterAssignments'],
    ['task', 'tasks.filterTasks'],
  ]
  const statusFilters: [StatusFilter, StringKey][] = [
    ['open', 'tasks.filterOpen'],
    ['done', 'tasks.filterDone'],
    ['all', 'tasks.filterEverything'],
  ]

  return (
    <div className="study-page">
      <div className="page-head study-head">
        <div>
          <h1>{t('tasks.title')}</h1>
          <p>
            {stats.total === 0
              ? t('tasks.subtitle')
              : t('tasks.summary', {
                  done: stats.done,
                  total: stats.total,
                  today: stats.today,
                  overdue: stats.overdue,
                })}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setForm({ open: true, kind: 'assignment' })}
        >
          <PlusIcon /> {t('tasks.add')}
        </button>
      </div>

      {stats.total > 0 && (
        <div className="progress-inline">
          <ProgressBar percent={stats.percent} />
          <span>{fmt.percent(stats.percent)}</span>
        </div>
      )}

      <div className="study-toolbar">
        <input
          className="input search"
          placeholder={t('tasks.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-group">
          {kindFilters.map(([key, label]) => (
            <button
              key={key}
              className={'chip' + (kindFilter === key ? ' active' : '')}
              onClick={() => setKindFilter(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {statusFilters.map(([key, label]) => (
            <button
              key={key}
              className={'chip' + (statusFilter === key ? ' active' : '')}
              onClick={() => setStatusFilter(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {courses.length > 0 && (
          <select
            className="select course-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label={t('tasks.allCourses')}
          >
            <option value="">{t('tasks.allCourses')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <SectionEmpty title={t(tasks.length === 0 ? 'tasks.empty' : 'tasks.noMatch')}>
          {t(tasks.length === 0 ? 'tasks.emptyBody' : 'tasks.noMatchBody')}
        </SectionEmpty>
      ) : (
        <div className="task-list">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={(next) => setForm({ open: true, task: next, kind: next.kind })}
            />
          ))}
        </div>
      )}

      {form.open && (
        <TaskForm
          task={form.task}
          defaultKind={form.kind}
          onClose={() => setForm({ open: false, kind: 'assignment' })}
        />
      )}
    </div>
  )
}
