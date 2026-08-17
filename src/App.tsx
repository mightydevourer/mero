import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import { directionOf } from './i18n'
import Chrome from './components/Chrome'
import Toast from './components/Toast'
import Library from './components/library/Library'
import Vocabulary from './components/vocabulary/Vocabulary'
import Reader from './components/reader/Reader'
import StudyLayout from './components/study/StudyLayout'
import Dashboard from './components/study/Dashboard'
import Courses from './components/study/Courses'
import Tasks from './components/study/Tasks'
import Exams from './components/study/Exams'
import Data from './components/study/Data'

export default function App() {
  const theme = useStore((s) => s.settings.theme)
  const uiLanguage = useStore((s) => s.settings.uiLanguage)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Direction is set on <html> rather than a wrapper so that native pieces the
  // React tree does not own — scrollbars, date/time pickers, select popups and
  // window.confirm — are laid out in the right direction too.
  useEffect(() => {
    const root = document.documentElement
    root.lang = uiLanguage
    root.dir = directionOf(uiLanguage)
  }, [uiLanguage])

  return (
    <>
      <Routes>
        <Route element={<Chrome />}>
          <Route path="/" element={<Library />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/study" element={<StudyLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="exams" element={<Exams />} />
            <Route path="data" element={<Data />} />
          </Route>
        </Route>
        <Route path="/read/:bookId" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
