import { Link } from 'react-router-dom'
import './PaginaAdminHub.css'

export function PaginaAdminHub() {
  return (
    <div className="session-home admin-hub">
      <h1 className="admin-hub__title">Panel de administración</h1>
      <p className="admin-hub__sub">Elegí a dónde ir</p>
      <div className="admin-hub__actions">
        <Link to="/usuarios" className="admin-hub__btn admin-hub__btn--primary">
          Ir a usuarios
        </Link>
        <Link to="/" className="admin-hub__btn">
          Ir a exposiciones
        </Link>
      </div>
    </div>
  )
}
