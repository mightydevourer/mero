import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStudyStore } from '../../store/useStudyStore'
import { useToast } from '../../lib/toast'
import { useI18n, type StringKey } from '../../i18n'
import { Field } from './ui'
import { TrashIcon } from '../Icons'

export default function SignIn() {
  const { t } = useI18n()
  const students = useStudyStore((s) => s.students)
  const signUp = useStudyStore((s) => s.signUp)
  const signIn = useStudyStore((s) => s.signIn)
  const removeStudent = useStudyStore((s) => s.removeStudent)
  const loadSampleProfile = useStudyStore((s) => s.loadSampleProfile)
  const showToast = useToast((s) => s.show)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // A key rather than a resolved string, so a validation message already on
  // screen re-renders in the new language when the switcher is used.
  const [error, setError] = useState<StringKey | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) return setError('signin.errName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return setError('signin.errEmail')
    }
    if (students.some((s) => s.email === trimmedEmail)) {
      return setError('signin.errDuplicate')
    }

    const student = signUp(trimmedName, trimmedEmail)
    showToast(t('signin.welcome', { name: student.name.split(' ')[0] }))
  }

  return (
    <div className="signin">
      <div className="signin-intro">
        <h1>{t('signin.title')}</h1>
        <p>{t('signin.intro')}</p>
      </div>

      <div className="signin-grid">
        <form className="signin-card" onSubmit={submit}>
          <h2>{t('signin.create')}</h2>
          <Field label={t('signin.name')}>
            <input
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder={t('signin.namePlaceholder')}
              autoComplete="name"
            />
          </Field>
          <Field label={t('signin.email')}>
            <input
              className="input"
              type="email"
              // Addresses stay LTR so the domain does not visually reorder
              // inside an Arabic (RTL) form.
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder={t('signin.emailPlaceholder')}
              autoComplete="email"
            />
          </Field>
          {error && <p className="form-error">{t(error)}</p>}
          <button className="btn btn-primary" type="submit">
            {t('signin.submit')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const student = loadSampleProfile()
              showToast(t('signin.sampleLoaded', { name: student.name }))
            }}
          >
            {t('signin.sample')}
          </button>
          {/* The way back in on a new device, or after clearing this one. */}
          <Link to="/study/data" className="signin-restore">
            {t('signin.restoreLink')}
          </Link>
        </form>

        <div className="signin-card">
          {students.length > 0 ? (
            <>
              <h2>{t('signin.continueAs')}</h2>
              <ul className="profile-list">
                {students.map((s) => (
                  <li key={s.id}>
                    <button className="profile-row" onClick={() => signIn(s.id)}>
                      <span className="profile-avatar" aria-hidden="true">
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="profile-id">
                        <strong>{s.name}</strong>
                        <span dir="ltr">{s.email}</span>
                      </span>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={t('signin.deleteProfile', { name: s.name })}
                      onClick={() => {
                        removeStudent(s.id)
                        showToast(t('signin.profileDeleted'))
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2>{t('signin.noProfiles')}</h2>
              <p className="muted-copy">{t('signin.noProfilesBody')}</p>
            </>
          )}

          <div className="notice">
            <strong>{t('signin.noticeTitle')}</strong>
            <p>{t('signin.noticeBody')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
