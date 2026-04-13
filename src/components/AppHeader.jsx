import './AppHeader.css'

function userInitial(username) {
  const u = username.trim()
  if (!u) return '?'
  return u.charAt(0).toUpperCase()
}

function roleLabel(role) {
  if (role === 'superadmin') return 'Superadmin'
  return 'Usuario'
}

export function AppHeader({ session, onLogout }) {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <span className="app-header__title">FCA</span>
        </div>

        {session ? (
          <div className="app-header__session">
            <div className="app-header__user-block">
              <span className="app-header__username">{session.username}</span>
              <span className="app-header__role">{roleLabel(session.role)}</span>
            </div>
            <button
              type="button"
              className="app-header__logout"
              onClick={onLogout}
            >
              Salir
            </button>
            <span
              className="app-header__avatar"
              title={`Sesión: ${session.username}`}
              aria-hidden="true"
            >
              {userInitial(session.username)}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
