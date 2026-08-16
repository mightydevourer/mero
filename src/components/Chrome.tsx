import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useTasks } from '../store/useStudyStore'
import { isOverdue, todayISO } from '../lib/date'

const linkClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '')

export default function Chrome() {
  const vocabCount = useStore((s) => s.vocab.length)
  const tasks = useTasks()

  /** Work that needs attention today — due now or already late. */
  const dueCount = useMemo(() => {
    const today = todayISO()
    return tasks.filter(
      (t) => t.status !== 'done' && (t.deadline === today || isOverdue(t.deadline)),
    ).length
  }, [tasks])

  return (
    <>
      <header className="app-nav">
        <div className="nav-inner">
          <NavLink to="/" className="brand">
            <img src="/mero.svg" alt="" />
            Mero
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/" end className={linkClass}>
              Library
            </NavLink>
            <NavLink to="/vocabulary" className={linkClass}>
              Vocabulary
              {vocabCount > 0 && <span className="nav-count">{vocabCount}</span>}
            </NavLink>
            <NavLink to="/study" className={linkClass}>
              Study
              {dueCount > 0 && <span className="nav-count alert">{dueCount}</span>}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
