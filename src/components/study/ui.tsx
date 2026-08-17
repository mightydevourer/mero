import { useEffect, type ReactNode } from 'react'
import type { Course, Priority } from '../../types'
import { useI18n } from '../../i18n'
import { CloseIcon } from '../Icons'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n()
  return <span className={`badge badge-${priority}`}>{t(`priority.${priority}`)}</span>
}

/** Course name prefixed with its tint; falls back to a neutral 'General' chip. */
export function CourseChip({ course }: { course?: Course }) {
  const { t } = useI18n()
  if (!course) return <span className="course-chip course-chip-none">{t('course.none')}</span>
  return (
    <span className="course-chip">
      <span className="course-dot" style={{ background: course.color }} />
      {course.code ?? course.name}
    </span>
  )
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** Circular completion meter used on the dashboard. */
export function ProgressRing({ percent, size = 116 }: { percent: number; size?: number }) {
  const { fmt } = useI18n()
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)
  const label = fmt.percent(percent)
  return (
    <svg
      width={size}
      height={size}
      className="progress-ring"
      role="img"
      aria-label={label}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="progress-ring-text"
      >
        {label}
      </text>
    </svg>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function SectionEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

/** Modal dialog for the add/edit forms. Closes on Escape or overlay click. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('form.close')}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
