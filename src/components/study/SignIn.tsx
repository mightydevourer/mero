import { useState, type FormEvent } from 'react'
import { useStudyStore } from '../../store/useStudyStore'
import { useToast } from '../../lib/toast'
import { Field } from './ui'
import { TrashIcon } from '../Icons'

export default function SignIn() {
  const students = useStudyStore((s) => s.students)
  const signUp = useStudyStore((s) => s.signUp)
  const signIn = useStudyStore((s) => s.signIn)
  const removeStudent = useStudyStore((s) => s.removeStudent)
  const loadSampleProfile = useStudyStore((s) => s.loadSampleProfile)
  const showToast = useToast((s) => s.show)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) return setError('Enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return setError('Enter a valid email address.')
    }
    if (students.some((s) => s.email === trimmedEmail)) {
      return setError('A profile with that email already exists on this device.')
    }

    const student = signUp(trimmedName, trimmedEmail)
    showToast(`Welcome, ${student.name.split(' ')[0]}`)
  }

  return (
    <div className="signin">
      <div className="signin-intro">
        <h1>Study Organizer</h1>
        <p>
          Keep your courses, timetable, assignments, exams and daily study tasks in one place —
          alongside the texts you read in Mero.
        </p>
      </div>

      <div className="signin-grid">
        <form className="signin-card" onSubmit={submit}>
          <h2>Create your profile</h2>
          <Field label="Full name">
            <input
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="Alex Moreau"
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="alex@university.edu"
              autoComplete="email"
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit">
            Create profile
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const student = loadSampleProfile()
              showToast(`Loaded ${student.name}'s semester`)
            }}
          >
            Explore with sample data
          </button>
        </form>

        <div className="signin-card">
          {students.length > 0 ? (
            <>
              <h2>Continue as</h2>
              <ul className="profile-list">
                {students.map((s) => (
                  <li key={s.id}>
                    <button className="profile-row" onClick={() => signIn(s.id)}>
                      <span className="profile-avatar" aria-hidden="true">
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="profile-id">
                        <strong>{s.name}</strong>
                        <span>{s.email}</span>
                      </span>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Delete ${s.name}'s profile`}
                      onClick={() => {
                        removeStudent(s.id)
                        showToast('Profile deleted')
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
              <h2>No profiles yet</h2>
              <p className="muted-copy">
                Create one to start adding courses, or load the sample semester to see every
                feature with realistic data.
              </p>
            </>
          )}

          <div className="notice">
            <strong>Stored on this device only</strong>
            <p>
              Mero runs entirely in your browser, so a profile separates your data locally rather
              than signing you in to a server — no password is asked for, and none is stored.
              Shared or public computers will keep whatever you enter here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
