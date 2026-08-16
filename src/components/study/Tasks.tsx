import { useMemo, useState, type FormEvent } from 'react'
import { useCourseMap, useCourses, useStudyStore, useTasks } from '../../store/useStudyStore'
import type { Priority, Task, TaskKind } from '../../types'
import { dueLabel, formatDateLong, isOverdue, isToday, todayISO } from '../../lib/date'
import { useToast } from '../../lib/toast'
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
    if (!trimmed) return setError('Give it a title.')

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
      showToast('Saved')
    } else {
      addTask(payload)
      showToast(kind === 'assignment' ? 'Assignment added' : 'Task added')
    }
    onClose()
  }

  return (
    <Modal title={task ? 'Edit' : kind === 'assignment' ? 'New assignment' : 'New task'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Type">
          <div className="segmented">
            <button
              type="button"
              className={'segment' + (kind === 'assignment' ? ' active' : '')}
              onClick={() => setKind('assignment')}
            >
              Assignment
            </button>
            <button
              type="button"
              className={'segment' + (kind === 'task' ? ' active' : '')}
              onClick={() => setKind('task')}
            >
              Study task
            </button>
          </div>
        </Field>
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            placeholder={kind === 'assignment' ? 'PHP Project' : 'Review PDO prepared statements'}
            autoFocus
          />
        </Field>
        <Field label="Description" hint="Optional.">
          <textarea
            className="input textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What exactly needs doing?"
          />
        </Field>
        <div className="form-row">
          <Field label="Course">
            <select
              className="select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">No course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline" hint={kind === 'task' ? 'Optional.' : undefined}>
            <input
              className="input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Priority">
          <div className="segmented">
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={'segment' + (priority === p ? ` active priority-${p}` : '')}
                onClick={() => setPriority(p)}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {task ? 'Save changes' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** One row in the task list. Reused by the dashboard. */
export function TaskRow({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
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
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      >
        {done && <CheckIcon width={14} height={14} />}
      </button>

      <div className="task-main">
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          {task.kind === 'assignment' && <span className="tag">Assignment</span>}
        </div>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="task-meta">
          <CourseChip course={task.courseId ? courseMap.get(task.courseId) : undefined} />
          {task.deadline && (
            <span className={'task-due' + (overdue ? ' overdue' : due ? ' today' : '')}>
              {formatDateLong(task.deadline)} · {dueLabel(task.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="task-side">
        <PriorityBadge priority={task.priority} />
        {onEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>
            Edit
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={`Delete ${task.title}`}
          onClick={() => {
            removeTask(task.id)
            showToast('Deleted')
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
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
      .filter((t) => {
        if (kindFilter !== 'all' && t.kind !== kindFilter) return false
        if (statusFilter === 'open' && t.status === 'done') return false
        if (statusFilter === 'done' && t.status !== 'done') return false
        if (courseFilter && t.courseId !== courseFilter) return false
        if (q && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort(compareTasks)
  }, [tasks, kindFilter, statusFilter, courseFilter, query])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const overdue = tasks.filter((t) => t.status !== 'done' && isOverdue(t.deadline)).length
    const today = tasks.filter((t) => t.status !== 'done' && t.deadline === todayISO()).length
    return { total, done, overdue, today, percent: total ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  return (
    <div className="study-page">
      <div className="page-head study-head">
        <div>
          <h1>Tasks &amp; assignments</h1>
          <p>
            {stats.total === 0
              ? 'Coursework with deadlines, and the day-to-day study you plan around it.'
              : `${stats.done} of ${stats.total} complete · ${stats.today} due today · ${stats.overdue} overdue`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setForm({ open: true, kind: 'assignment' })}
        >
          <PlusIcon /> Add
        </button>
      </div>

      {stats.total > 0 && (
        <div className="progress-inline">
          <ProgressBar percent={stats.percent} />
          <span>{stats.percent}%</span>
        </div>
      )}

      <div className="study-toolbar">
        <input
          className="input search"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-group">
          {(
            [
              ['all', 'All'],
              ['assignment', 'Assignments'],
              ['task', 'Study tasks'],
            ] as [KindFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={'chip' + (kindFilter === key ? ' active' : '')}
              onClick={() => setKindFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {(
            [
              ['open', 'Open'],
              ['done', 'Completed'],
              ['all', 'Everything'],
            ] as [StatusFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={'chip' + (statusFilter === key ? ' active' : '')}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {courses.length > 0 && (
          <select
            className="select course-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <SectionEmpty title={tasks.length === 0 ? 'Nothing here yet' : 'Nothing matches'}>
          {tasks.length === 0
            ? 'Add an assignment with a deadline, or a study task for today.'
            : 'Try a different filter or clear the search.'}
        </SectionEmpty>
      ) : (
        <div className="task-list">
          {filtered.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onEdit={(task) => setForm({ open: true, task, kind: task.kind })}
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
