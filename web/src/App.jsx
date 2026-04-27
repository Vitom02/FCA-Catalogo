import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { listarClubes } from './apiConnect.jsx'
import { Cabecera } from './componentes/layout/Cabecera.jsx'
import { PaginaLogin } from './paginas/autenticacion/PaginaLogin.jsx'
import { PaginaAdminHub } from './paginas/admin/PaginaAdminHub.jsx'
import { PaginaUsuarios } from './paginas/admin/PaginaUsuarios.jsx'
import { PaginaInicio } from './paginas/catalogo/PaginaInicio.jsx'
import { PaginaExposicion } from './paginas/exposicion/PaginaExposicion.jsx'
import { clearSession, getSession } from './autenticacion/testAuth.js'

function AppShell() {
  const navigate = useNavigate()
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
    if (next.role === 'superadmin') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <Cabecera session={session} onLogout={handleLogout} />
      <main className="app-main" id="main-content">
        {session ? (
          <Routes>
            <Route
              path="/admin"
              element={
                session.role === 'superadmin' ? (
                  <PaginaAdminHub />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/usuarios"
              element={
                session.role === 'superadmin' ? (
                  <PaginaUsuarios session={session} clubes={clubes} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
