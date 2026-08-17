import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Vite's `base` and the router's `basename` have to agree, or a build deployed
// into a subdirectory (example.com/mero/) loads its assets but resolves every
// route against the domain root. BASE_URL carries a trailing slash, which
// react-router does not want.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
