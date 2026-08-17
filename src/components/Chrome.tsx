import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useTasks } from '../store/useStudyStore'
import { isOverdue, todayISO } from '../lib/date'
import { LANGUAGES, useI18n } from '../i18n'
import type { UiLanguage } from '../types'

const linkClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '')

function LanguageSwitcher() {
  const { t, lang } = useI18n()
  const updateSettings = useStore((s) => s.updateSettings)

  return (
    <div className="lang-switch" role="group" aria-label={t('nav.language')}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          className={'lang-option' + (lang === code ? ' active' : '')}
          aria-pressed={lang === code}
          lang={code}
          onClick={() => updateSettings({ uiLanguage: code as UiLanguage })}
        >
          {t(code === 'ar' ? 'lang.ar' : 'lang.en')}
        </button>
      ))}
    </div>
  )
}

export default function Chrome() {
  const { t, fmt } = useI18n()
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
            {/* Built from BASE_URL rather than a literal '/mero.svg': Vite
                rewrites paths in index.html but not string literals in
                components, so a subdirectory build would 404 on the logo. */}
            <img src={`${import.meta.env.BASE_URL}mero.svg`} alt="" />
            Mero
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/" end className={linkClass}>
              {t('nav.library')}
            </NavLink>
            <NavLink to="/vocabulary" className={linkClass}>
              {t('nav.vocabulary')}
              {vocabCount > 0 && <span className="nav-count">{fmt.number(vocabCount)}</span>}
            </NavLink>
            <NavLink to="/study" className={linkClass}>
              {t('nav.study')}
              {dueCount > 0 && <span className="nav-count alert">{fmt.number(dueCount)}</span>}
            </NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
