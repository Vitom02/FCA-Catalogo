import { useId, useMemo, useState } from 'react'
import {
  EJEMPLAR_POOL,
  ENROLLMENT_TABLE_COLUMNS,
  filterSpecimenPool,
} from '../../datos/specimens.js'
import { formatExhibitionDateRange } from '../../utilidades/dateDisplay.js'
import './vistaAnotacionExposicion.css'

const COLUMN_LABELS = {
  'id ejemplar': 'ID ejemplar',
  nombre: 'Nombre',
  federacion: 'Cod. federación',
  categoria: 'Categoría',
  grupo: 'Grupo',
  raza: 'Cod. raza',
  ordinal: 'Ordinal',
  registro: 'Registro',
  usuario: 'Usuario',
}

const READONLY_COLS = new Set([
  'id ejemplar',
  'grupo',
  'ordinal',
  'registro',
  'usuario',
])

function IconPencil() {
  return (
    <svg
      className="enrollment-modal__action-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.768z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg
      className="enrollment-modal__action-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * @param {{
 *   exhibition: import('../../datos/exhibitionsTable.js').ExhibitionRow,
 *   session: { username: string, role: string, kennelId: string | null },
 *   enrollments: Record<string, string>[],
 *   onBack: () => void,
 *   onAddEnrollment: (entry: Record<string, string>) => void,
 *   onUpdateEnrollment: (index: number, entry: Record<string, string>) => void,
 *   onRemoveEnrollment: (index: number) => void,
 * }} props
 */
export function VistaAnotacionExposicion({
  exhibition,
  session,
  enrollments,
  onBack,
  onAddEnrollment,
  onUpdateEnrollment,
  onRemoveEnrollment,
}) {
  const titleId = useId()
  const [codigoFed, setCodigoFed] = useState('')
  const [codigoRaza, setCodigoRaza] = useState('')
  const [nombre, setNombre] = useState('')
  const [grupo, setGrupo] = useState('')
  const [searchDraft, setSearchDraft] = useState({
    codigoFederacion: '',
    codigoRaza: '',
    nombre: '',
    grupo: null,
  })
  const [haAgregadoBusqueda, setHaAgregadoBusqueda] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  const searchResults = useMemo(
    () => filterSpecimenPool(EJEMPLAR_POOL, searchDraft),
    [searchDraft],
  )

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((e) => e['id ejemplar'])),
    [enrollments],
  )

  function handleAgregar(e) {
    e.preventDefault()
    const nombreTrim = nombre.trim()
    const grupoParsed = parseInt(String(grupo).trim(), 10)
    if (!nombreTrim || Number.isNaN(grupoParsed)) return
    setNombre(nombreTrim)
    setGrupo(String(grupoParsed))
    setHaAgregadoBusqueda(true)
    setSearchDraft({
      codigoFederacion: codigoFed,
      codigoRaza: codigoRaza,
      nombre: nombreTrim,
      grupo: grupoParsed,
    })
  }

  const fechaRango = formatExhibitionDateRange(
    exhibition['Fecha inicio'],
    exhibition['Fecha fin'],
  )

  function handleAnotar(spec) {
    if (enrolledIds.has(spec.idEjemplar)) return
    const nextOrdinal = enrollments.length + 1
    const y = new Date().getFullYear()
    const registro = `REG-${y}-${String(nextOrdinal).padStart(4, '0')}`
    onAddEnrollment({
      'id ejemplar': spec.idEjemplar,
      nombre: spec.nombre,
      federacion: spec.codigoFederacion,
      categoria: spec.categoria,
      grupo: String(spec.grupo),
      raza: spec.codigoRaza,
      ordinal: String(nextOrdinal),
      registro,
      usuario: session.username,
    })
  }

  function handleIniciarEdicion(i) {
    setEditingIndex(i)
    setEditDraft({ ...enrollments[i] })
  }

  function handleGuardarEdicion() {
    if (editingIndex == null || !editDraft) return
    onUpdateEnrollment(editingIndex, editDraft)
    setEditingIndex(null)
    setEditDraft(null)
  }

  function handleCancelarEdicion() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  function handleEliminar(i) {
    const ok = window.confirm('¿Quitar este ejemplar de la anotación?')
    if (!ok) return
    onRemoveEnrollment(i)
    setEditingIndex(null)
    setEditDraft(null)
  }

  const colCount = ENROLLMENT_TABLE_COLUMNS.length + 1

  return (
    <div className="anotacion-page" role="region" aria-labelledby={titleId}>
      <header className="enrollment-modal__header">
        <div>
          <h2 id={titleId} className="enrollment-modal__title">
            Anotación en exposición
          </h2>
          <p className="enrollment-modal__subtitle">
            N.º {exhibition['Número'] ?? '—'} · {exhibition['Descripción'] ?? '—'}
          </p>
          {fechaRango ? (
            <p className="enrollment-modal__subtitle-dates">{fechaRango}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="enrollment-modal__close"
          aria-label="Volver al listado"
          onClick={onBack}
        >
          ×
        </button>
      </header>

      <section className="enrollment-modal__section">
        <h3 className="enrollment-modal__section-title">Agregar ejemplar</h3>
        <form className="enrollment-modal__filters" onSubmit={handleAgregar}>
          <div className="enrollment-modal__filters-grid">
            <label className="enrollment-modal__field">
              <span className="enrollment-modal__field-label">Código de federación</span>
              <input
                className="enrollment-modal__input"
                value={codigoFed}
                onChange={(e) => setCodigoFed(e.target.value)}
                placeholder="Ej. FCA"
                autoComplete="off"
              />
            </label>
            <label className="enrollment-modal__field">
              <span className="enrollment-modal__field-label">Grupo</span>
              <input
                type="number"
                className="enrollment-modal__input"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                inputMode="numeric"
                step={1}
                autoComplete="off"
                required
              />
            </label>
            <label className="enrollment-modal__field">
              <span className="enrollment-modal__field-label">Código de raza</span>
              <input
                className="enrollment-modal__input"
                value={codigoRaza}
                onChange={(e) => setCodigoRaza(e.target.value)}
                placeholder="Ej. LAB"
                autoComplete="off"
              />
            </label>
            <label className="enrollment-modal__field">
              <span className="enrollment-modal__field-label">Nombre</span>
              <input
                className="enrollment-modal__input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                required
              />
            </label>
          </div>
          <div className="enrollment-modal__filters-actions">
            <button type="submit" className="enrollment-modal__btn enrollment-modal__btn--primary">
              Agregar
            </button>
          </div>
        </form>

        <div className="enrollment-modal__results">
          {!haAgregadoBusqueda ? (
            <p className="enrollment-modal__hint">
              Ingresá código de federación, grupo (entero), código de raza y/o nombre y pulsá Agregar
              para listar ejemplares coincidentes.
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
                      <strong>{s.idEjemplar}</strong> · {s.nombre} · grupo {s.grupo} · cod. fed.{' '}
                      <strong>{s.codigoFederacion}</strong> · cod. raza <strong>{s.codigoRaza}</strong> ·{' '}
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
                    {COLUMN_LABELS[col] ?? col}
                  </th>
                ))}
                <th scope="col" className="enrollment-modal__th-actions">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr>
                  <td
                    className="session-home__empty"
                    colSpan={colCount}
                  >
                    Todavía no hay ejemplares anotados en esta exposición.
                  </td>
                </tr>
              ) : (
                enrollments.map((row, i) => {
                  const editando = editingIndex === i && editDraft != null
                  const fuente = editando ? editDraft : row
                  return (
                    <tr key={`${row['id ejemplar']}-${i}`}>
                      {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                        <td key={col}>
                          {editando ? (
                            READONLY_COLS.has(col) ? (
                              <span className="enrollment-modal__cell-readonly">
                                {fuente[col] ?? '—'}
                              </span>
                            ) : (
                              <input
                                className="enrollment-modal__input enrollment-modal__input--inline"
                                value={fuente[col] ?? ''}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, [col]: e.target.value } : d,
                                  )
                                }
                                aria-label={COLUMN_LABELS[col] ?? col}
                              />
                            )
                          ) : (
                            row[col] ?? '—'
                          )}
                        </td>
                      ))}
                      <td className="enrollment-modal__td-actions">
                        {editando ? (
                          <div className="enrollment-modal__row-actions">
                            <button
                              type="button"
                              className="enrollment-modal__btn enrollment-modal__btn--primary enrollment-modal__btn--compact"
                              onClick={handleGuardarEdicion}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="enrollment-modal__btn enrollment-modal__btn--secondary enrollment-modal__btn--compact"
                              onClick={handleCancelarEdicion}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="enrollment-modal__row-actions">
                            <button
                              type="button"
                              className="enrollment-modal__icon-btn enrollment-modal__icon-btn--edit"
                              title="Editar"
                              aria-label="Editar fila"
                              onClick={() => handleIniciarEdicion(i)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              type="button"
                              className="enrollment-modal__icon-btn enrollment-modal__icon-btn--delete"
                              title="Eliminar"
                              aria-label="Eliminar de la anotación"
                              onClick={() => handleEliminar(i)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
