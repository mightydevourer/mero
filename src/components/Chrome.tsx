import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { LANGUAGES, useI18n } from '../i18n'
import type { ThemeName, UiLanguage } from '../types'

const THEMES: ThemeName[] = ['light', 'sepia', 'dark']

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

/**
 * The reader's settings panel used to be the only way to change theme. It went
 * with the reading pages, so the control lives up here now — otherwise the
 * three themes the stylesheet already supports would be unreachable.
 */
function ThemeSwitcher() {
  const { t } = useI18n()
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)

  return (
    <div className="lang-switch" role="group" aria-label={t('nav.theme')}>
      {THEMES.map((name) => (
        <button
          key={name}
          type="button"
          className={'lang-option' + (theme === name ? ' active' : '')}
          aria-pressed={theme === name}
          onClick={() => updateSettings({ theme: name })}
        >
          {t(`theme.${name}`)}
        </button>
      ))}
    </div>
  )
}

export default function Chrome() {
  return (
    <>
      <header className="app-nav">
        <div className="nav-inner">
          <NavLink to="/study" className="brand">
            <img src={`${import.meta.env.BASE_URL}mero.svg`} alt="" />
            Mero
          </NavLink>
          {/* The study tabs live in StudyLayout; the bar carries preferences. */}
          <div className="nav-prefs">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
