import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { listarClubes } from './apiConnect.jsx'
import { Cabecera } from './componentes/layout/Cabecera.jsx'
import { PaginaLogin } from './paginas/autenticacion/PaginaLogin.jsx'
import { PaginaInicio } from './paginas/catalogo/PaginaInicio.jsx'
import { PaginaExposicion } from './paginas/exposicion/PaginaExposicion.jsx'
import { clearSession, getSession } from './autenticacion/testAuth.js'

function App() {
  const [session, setSession] = useState(() => getSession())
  const [exhibitionRows, setExhibitionRows] = useState(() => [])
  const [enrollmentsByExhibition, setEnrollmentsByExhibition] = useState({})
  const [clubes, setClubes] = useState(() => [])

  useEffect(() => {
    let cancelled = false
    listarClubes()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setClubes(data)
      })
      .catch(() => {
        if (!cancelled) setClubes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleLoggedIn(next) {
    setSession(next)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Cabecera session={session} onLogout={handleLogout} />
        <main className="app-main" id="main-content">
          {session ? (
            <Routes>
              <Route
                path="/"
                element={
                  <PaginaInicio
                    session={session}
                    exhibitionRows={exhibitionRows}
                    setExhibitionRows={setExhibitionRows}
                    clubes={clubes}
                  />
                }
              />
              <Route
                path="/exposicion/:expoKey"
                element={
                  <PaginaExposicion
                    session={session}
                    exhibitionRows={exhibitionRows}
                    enrollmentsByExhibition={enrollmentsByExhibition}
                    setEnrollmentsByExhibition={setEnrollmentsByExhibition}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <PaginaLogin onLoggedIn={handleLoggedIn} />
          )}
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
