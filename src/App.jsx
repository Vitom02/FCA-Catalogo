import { useState } from 'react'
import { AppHeader } from './components/AppHeader.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { SessionHome } from './pages/SessionHome.jsx'
import { clearSession, getSession } from './auth/testAuth.js'

function App() {
  const [session, setSession] = useState(() => getSession())

  function handleLoggedIn(next) {
    setSession(next)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  return (
    <div className="app-shell">
      <AppHeader session={session} onLogout={handleLogout} />
      <main className="app-main" id="main-content">
        {session ? (
          <SessionHome session={session} />
        ) : (
          <LoginPage onLoggedIn={handleLoggedIn} />
        )}
      </main>
    </div>
  )
}

export default App
