import { useState } from 'react'
import { authenticate, saveSession } from '../auth/testAuth.js'
import './LoginPage.css'

export function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const session = authenticate(username, password)
    if (!session) {
      setError('Usuario o contraseña incorrectos.')
      return
    }
    saveSession(session)
    onLoggedIn(session)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__heading">Iniciar sesión</h1>
        <p className="login-card__lead">
          Accedé para gestionar exhibiciones y el catálogo de ejemplares.
        </p>
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
            placeholder="usuario"
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
            placeholder="••••••••"
          />
          <button type="submit" className="login-form__submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
