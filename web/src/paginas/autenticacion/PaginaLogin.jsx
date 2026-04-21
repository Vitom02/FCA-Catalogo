import { useState } from 'react'
import { ApiError } from '../../apiConnect.jsx'
import { authenticate, saveSession } from '../../autenticacion/testAuth.js'
import './PaginaLogin.css'

export function PaginaLogin({ onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await authenticate(username, password)
      if (!session) {
        setError('Usuario o contraseña incorrectos.')
        return
      }
      saveSession(session)
      onLoggedIn(session)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo conectar con el servidor.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__heading">Iniciar sesión</h1>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <p className="login-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="login-form__label" htmlFor="login-username">
            Usuario
          </label>
          <input
            id="login-username"
            className="login-form__input"
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ingrese tu usuario"
          />
          <label className="login-form__label" htmlFor="login-password">
            Contraseña
          </label>
          <input
            id="login-password"
            className="login-form__input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese tu contraseña"
          />
          <button
            type="submit"
            className="login-form__submit"
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
