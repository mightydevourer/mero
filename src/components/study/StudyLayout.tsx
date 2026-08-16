import { NavLink, Outlet } from 'react-router-dom'
import { useCurrentStudent, useStudyStore } from '../../store/useStudyStore'
import SignIn from './SignIn'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  'study-tab' + (isActive ? ' active' : '')

export default function StudyLayout() {
  const student = useCurrentStudent()
  const signOut = useStudyStore((s) => s.signOut)

  // No profile chosen yet — the whole section is replaced by the picker.
  if (!student) return <SignIn />

  return (
    <div className="study">
      <div className="study-bar">
        <nav className="study-tabs">
          <NavLink to="/study" end className={tabClass}>
            Dashboard
          </NavLink>
          <NavLink to="/study/courses" className={tabClass}>
            Courses
          </NavLink>
          <NavLink to="/study/tasks" className={tabClass}>
            Tasks
          </NavLink>
          <NavLink to="/study/exams" className={tabClass}>
            Exams
          </NavLink>
        </nav>
        <div className="study-profile">
          <span className="profile-avatar" aria-hidden="true">
            {student.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="study-profile-name">{student.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            Switch
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
