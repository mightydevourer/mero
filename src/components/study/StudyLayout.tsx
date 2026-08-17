import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCurrentStudent, useStudyStore } from '../../store/useStudyStore'
import { useI18n } from '../../i18n'
import SignIn from './SignIn'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  'study-tab' + (isActive ? ' active' : '')

export default function StudyLayout() {
  const { t } = useI18n()
  const student = useCurrentStudent()
  const signOut = useStudyStore((s) => s.signOut)
  const { pathname } = useLocation()

  /**
   * Backup/restore has to work with no profile selected: that is the state a
   * fresh device — or the browser you just cleared — starts in, and it is
   * exactly when someone needs to import their data back. So /study/data is
   * exempt from the profile gate and gets a reduced bar of its own.
   */
  const isDataRoute = pathname.startsWith('/study/data')

  if (!student) {
    if (!isDataRoute) return <SignIn />
    return (
      <div className="study">
        <div className="study-bar">
          <nav className="study-tabs">
            <NavLink to="/study" end className={tabClass}>
              {t('study.backToProfiles')}
            </NavLink>
            <NavLink to="/study/data" className={tabClass}>
              {t('tab.data')}
            </NavLink>
          </nav>
        </div>
        <Outlet />
      </div>
    )
  }

  return (
    <div className="study">
      <div className="study-bar">
        <nav className="study-tabs">
          <NavLink to="/study" end className={tabClass}>
            {t('tab.dashboard')}
          </NavLink>
          <NavLink to="/study/courses" className={tabClass}>
            {t('tab.courses')}
          </NavLink>
          <NavLink to="/study/tasks" className={tabClass}>
            {t('tab.tasks')}
          </NavLink>
          <NavLink to="/study/exams" className={tabClass}>
            {t('tab.exams')}
          </NavLink>
          <NavLink to="/study/data" className={tabClass}>
            {t('tab.data')}
          </NavLink>
        </nav>
        <div className="study-profile">
          <span className="profile-avatar" aria-hidden="true">
            {student.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="study-profile-name">{student.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            {t('study.switchProfile')}
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
