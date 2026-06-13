import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import Chrome from './components/Chrome'
import Toast from './components/Toast'
import Library from './components/library/Library'
import Vocabulary from './components/vocabulary/Vocabulary'
import Reader from './components/reader/Reader'

export default function App() {
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <>
      <Routes>
        <Route element={<Chrome />}>
          <Route path="/" element={<Library />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
        </Route>
        <Route path="/read/:bookId" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
