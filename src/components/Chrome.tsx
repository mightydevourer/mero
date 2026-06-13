import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'

const linkClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '')

export default function Chrome() {
  const vocabCount = useStore((s) => s.vocab.length)

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
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
