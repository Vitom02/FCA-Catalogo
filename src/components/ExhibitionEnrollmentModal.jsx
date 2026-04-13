import { useEffect, useId, useMemo, useState } from 'react'
import {
  EJEMPLAR_POOL,
  ENROLLMENT_TABLE_COLUMNS,
  filterSpecimenPool,
} from '../data/specimens.js'
import './ExhibitionEnrollmentModal.css'

/**
 * @param {{
 *   exhibition: import('../data/exhibitionsTable.js').ExhibitionRow,
 *   session: { username: string, role: string, kennelId: string | null },
 *   enrollments: Record<string, string>[],
 *   onClose: () => void,
 *   onAddEnrollment: (entry: Record<string, string>) => void,
 * }} props
 */
export function ExhibitionEnrollmentModal({
  exhibition,
  session,
  enrollments,
  onClose,
  onAddEnrollment,
}) {
  const titleId = useId()
  const [fed, setFed] = useState('')
  const [raza, setRaza] = useState('')
  const [nombre, setNombre] = useState('')
  const [searchDraft, setSearchDraft] = useState({
    federacion: '',
    raza: '',
    nombre: '',
  })
  const [hasSearched, setHasSearched] = useState(false)

  const searchResults = useMemo(
    () => filterSpecimenPool(EJEMPLAR_POOL, searchDraft),
    [searchDraft],
  )

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((e) => e['id ejemplar'])),
    [enrollments],
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function handleBuscarEjemplares(e) {
    e.preventDefault()
    setHasSearched(true)
    setSearchDraft({
      federacion: fed,
      raza,
      nombre,
    })
  }

  function handleAnotar(spec) {
    if (enrolledIds.has(spec.idEjemplar)) return
    const nextOrdinal = enrollments.length + 1
    const y = new Date().getFullYear()
    const registro = `REG-${y}-${String(nextOrdinal).padStart(4, '0')}`
    onAddEnrollment({
      'id ejemplar': spec.idEjemplar,
      nombre: spec.nombre,
      federacion: spec.federacion,
      categoria: spec.categoria,
      raza: spec.raza,
      ordinal: String(nextOrdinal),
      registro,
      usuario: session.username,
    })
  }

  return (
    <div
      className="enrollment-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="enrollment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="enrollment-modal__header">
          <div>
            <h2 id={titleId} className="enrollment-modal__title">
              Anotación en exhibición
            </h2>
            <p className="enrollment-modal__subtitle">
              N.º {exhibition['Número'] ?? '—'} · {exhibition['Descripción'] ?? '—'}
            </p>
          </div>
          <button
            type="button"
            className="enrollment-modal__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <section className="enrollment-modal__section">
          <h3 className="enrollment-modal__section-title">Buscar ejemplar</h3>
          <form className="enrollment-modal__filters" onSubmit={handleBuscarEjemplares}>
            <div className="enrollment-modal__filters-grid">
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Federación</span>
                <input
                  className="enrollment-modal__input"
                  value={fed}
                  onChange={(e) => setFed(e.target.value)}
                  placeholder="Ej. FCA"
                  autoComplete="off"
                />
              </label>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Raza</span>
                <input
                  className="enrollment-modal__input"
                  value={raza}
                  onChange={(e) => setRaza(e.target.value)}
                  placeholder="Ej. Labrador"
                  autoComplete="off"
                />
              </label>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Nombre</span>
                <input
                  className="enrollment-modal__input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del ejemplar"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="enrollment-modal__filters-actions">
              <button type="submit" className="enrollment-modal__btn enrollment-modal__btn--primary">
                Buscar
              </button>
            </div>
          </form>

          <div className="enrollment-modal__results">
            {!hasSearched ? (
              <p className="enrollment-modal__hint">
                Completá federación, raza y/o nombre (opcional) y pulsá Buscar.
              </p>
            ) : searchResults.length === 0 ? (
              <p className="enrollment-modal__hint">No hay ejemplares con esos criterios.</p>
            ) : (
              <ul className="enrollment-modal__result-list">
                {searchResults.map((s) => {
                  const ya = enrolledIds.has(s.idEjemplar)
                  return (
                    <li key={s.idEjemplar} className="enrollment-modal__result-row">
                      <span className="enrollment-modal__result-meta">
                        <strong>{s.idEjemplar}</strong> · {s.nombre} · {s.federacion} · {s.raza} ·{' '}
                        {s.categoria}
                      </span>
                      <button
                        type="button"
                        className="enrollment-modal__btn enrollment-modal__btn--secondary"
                        disabled={ya}
                        onClick={() => handleAnotar(s)}
                      >
                        {ya ? 'Ya anotado' : 'Anotar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="enrollment-modal__section enrollment-modal__section--table">
          <h3 className="enrollment-modal__section-title">Ejemplares anotados</h3>
          <div className="enrollment-modal__table-wrap">
            <table className="session-home__table enrollment-modal__table">
              <thead>
                <tr>
                  {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={ENROLLMENT_TABLE_COLUMNS.length}
                    >
                      Todavía no hay ejemplares anotados en esta exhibición.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((row, i) => (
                    <tr key={`${row['id ejemplar']}-${i}`}>
                      {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                        <td key={col}>{row[col] ?? '—'}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
