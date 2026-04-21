import { useEffect, useId, useRef, useState } from 'react'
import './Cabecera.css'

/**
 * @param {{ nombre?: string, apellido?: string, username?: string, usuario?: string }} session
 */
function userInitials(session) {
  const n = String(session.nombre ?? '').trim()
  const a = String(session.apellido ?? '').trim()
  if (n && a) {
    return (n.charAt(0) + a.charAt(0)).toUpperCase()
  }
  if (n) return n.slice(0, 2).toUpperCase()
  if (a) return a.slice(0, 2).toUpperCase()
  const u = String(session.username ?? session.usuario ?? '').trim()
  if (u.length >= 2) return u.slice(0, 2).toUpperCase()
  if (u) return u.charAt(0).toUpperCase()
  return '?'
}

/**
 * @param {{ nombre?: string, apellido?: string, username?: string, usuario?: string }} session
 */
function sessionTitle(session) {
  const n = String(session.nombre ?? '').trim()
  const a = String(session.apellido ?? '').trim()
  if (n || a) return [n, a].filter(Boolean).join(' ').trim()
  return String(session.username ?? session.usuario ?? '').trim() || 'Sesión'
}

export function Cabecera({ session, onLogout }) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleLogout() {
    setOpen(false)
    onLogout()
  }

  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <span className="app-header__title">FCA</span>
        </div>

        {session ? (
          <div className="app-header__session" ref={wrapRef}>
            <div className="app-header__menu">
              <button
                type="button"
                className="app-header__avatar-trigger"
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={menuId}
                title={sessionTitle(session)}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="app-header__avatar" aria-hidden="true">
                  {userInitials(session)}
                </span>
                <span className="app-header__avatar-chevron" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              {open ? (
                <div
                  id={menuId}
                  className="app-header__dropdown"
                  role="menu"
                  aria-label="Menú de cuenta"
                >
                  <button
                    type="button"
                    className="app-header__dropdown-item"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
