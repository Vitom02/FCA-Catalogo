import { useCallback, useMemo, useState } from 'react'
import {
  EXHIBITION_TABLE_COLUMNS,
  EXHIBITION_TABLE_ROWS,
  KENNEL_LABELS,
  filterExhibitionsByCatalogCriteria,
  filterExhibitionsByKennelId,
  filterExhibitionsByRole,
  getExhibitionRowKey,
  isSameExhibitionRow,
} from '../data/exhibitionsTable.js'
import { ExhibitionEnrollmentModal } from '../components/ExhibitionEnrollmentModal.jsx'
import './SessionHome.css'

const MONTH_OPTIONS = [
  { value: '', label: 'Mes' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const emptyFilters = () => ({
  numero: '',
  descripcion: '',
  ano: '',
  mes: '',
  kennelId: '',
})

function IconPencil() {
  return (
    <svg
      className="session-home__action-icon"
      width="18"
      height="18"
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
      className="session-home__action-icon"
      width="18"
      height="18"
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
 * @param {{ session: { username: string, role: string, kennelId: string | null } }} props
 */
export function SessionHome({ session }) {
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [exhibitionRows, setExhibitionRows] = useState(() =>
    EXHIBITION_TABLE_ROWS.map((r) => ({ ...r })),
  )
  const [modalExhibition, setModalExhibition] = useState(null)
  const [enrollmentsByExhibition, setEnrollmentsByExhibition] = useState({})

  const isSuperadmin = session.role === 'superadmin'
  const tableColCount =
    EXHIBITION_TABLE_COLUMNS.length + (isSuperadmin ? 2 : 0)

  const kennelIdsInData = useMemo(() => {
    const ids = new Set(exhibitionRows.map((r) => r.kennelId))
    return [...ids].sort()
  }, [exhibitionRows])

  const rowsForRole = useMemo(
    () => filterExhibitionsByRole(exhibitionRows, session),
    [exhibitionRows, session],
  )

  const rowsAfterKennel = useMemo(() => {
    if (session.role !== 'superadmin') return rowsForRole
    return filterExhibitionsByKennelId(rowsForRole, applied.kennelId)
  }, [session.role, rowsForRole, applied.kennelId])

  const displayedRows = useMemo(
    () =>
      filterExhibitionsByCatalogCriteria(rowsAfterKennel, {
        numero: applied.numero,
        descripcion: applied.descripcion,
        ano: applied.ano,
        mes: applied.mes,
      }),
    [rowsAfterKennel, applied],
  )

  function handleBuscar(e) {
    e.preventDefault()
    setApplied({ ...draft })
  }

  function handleActualizar() {
    setExhibitionRows(EXHIBITION_TABLE_ROWS.map((r) => ({ ...r })))
    const cleared = emptyFilters()
    setDraft(cleared)
    setApplied(cleared)
  }

  const handleEdit = useCallback((row) => {
    window.alert(
      `Editar exhibición: ${row['Descripción'] ?? ''} (${row['Número'] ?? ''})`,
    )
  }, [])

  const handleDelete = useCallback((row) => {
    const ok = window.confirm(
      `¿Eliminar la exhibición «${row['Descripción'] ?? '—'}» (${row['Número'] ?? '—'})?`,
    )
    if (!ok) return
    setExhibitionRows((prev) => prev.filter((r) => !isSameExhibitionRow(r, row)))
  }, [])

  return (
    <div className="session-home">
      <div className="session-home__layout">
        <h1 className="session-home__page-title">Catálogos</h1>

        <section className="session-home__filters" aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="session-home__filters-title">
            Filtros
          </h2>
          <form className="session-home__filters-form" onSubmit={handleBuscar}>
            <div className="session-home__filters-grid">
              <label className="session-home__field">
                <span className="session-home__field-label">Número</span>
                <input
                  type="text"
                  className="session-home__input"
                  value={draft.numero}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, numero: e.target.value }))
                  }
                  placeholder="Ej. 101"
                  autoComplete="off"
                  inputMode="numeric"
                />
              </label>
              <label className="session-home__field">
                <span className="session-home__field-label">Descripción</span>
                <input
                  type="text"
                  className="session-home__input"
                  value={draft.descripcion}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, descripcion: e.target.value }))
                  }
                  placeholder="Nombre de la exhibición"
                  autoComplete="off"
                />
              </label>
              <label className="session-home__field">
                <span className="session-home__field-label">Año</span>
                <input
                  type="text"
                  className="session-home__input"
                  value={draft.ano}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, ano: e.target.value }))
                  }
                  placeholder="Ej. 2026"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={4}
                />
              </label>
              <label className="session-home__field">
                <span className="session-home__field-label">Mes</span>
                <select
                  className="session-home__select"
                  value={draft.mes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, mes: e.target.value }))
                  }
                >
                  {MONTH_OPTIONS.map((opt) => (
                    <option
                      key={opt.value === '' ? 'mes-any' : opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {isSuperadmin ? (
                <label className="session-home__field">
                  <span className="session-home__field-label">Kennel</span>
                  <select
                    className="session-home__select"
                    value={draft.kennelId}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, kennelId: e.target.value }))
                    }
                  >
                    <option value="">Todas las perreras</option>
                    {kennelIdsInData.map((id) => (
                      <option key={id} value={id}>
                        {KENNEL_LABELS[id] ?? id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="session-home__filters-actions">
              <button type="submit" className="session-home__btn session-home__btn--primary">
                Buscar
              </button>
              <button
                type="button"
                className="session-home__btn session-home__btn--secondary"
                onClick={handleActualizar}
              >
                Actualizar tabla
              </button>
            </div>
          </form>
        </section>

        <section
          className="session-home__table-section"
          aria-labelledby="table-heading"
        >
          <h2 id="table-heading" className="session-home__table-title">
            Exhibiciones
          </h2>
          <div className="session-home__table-wrap">
            <table className="session-home__table">
              <thead>
                <tr>
                  {EXHIBITION_TABLE_COLUMNS.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                  {isSuperadmin ? (
                    <>
                      <th scope="col">Kennel</th>
                      <th scope="col" className="session-home__th-actions">
                        Acciones
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rowsForRole.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={tableColCount}
                    >
                      {isSuperadmin
                        ? 'No hay exhibiciones cargadas.'
                        : 'No hay exhibiciones para tu kennel.'}
                    </td>
                  </tr>
                ) : displayedRows.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={tableColCount}
                    >
                      Ningún resultado con estos filtros.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, i) => (
                    <tr key={`${row.kennelId}-${row['Número']}-${row['Fecha inicio']}-${i}`}>
                      {EXHIBITION_TABLE_COLUMNS.map((col) =>
                        col === 'Número' || col === 'Descripción' ? (
                          <td key={col}>
                            <button
                              type="button"
                              className="session-home__cell-link"
                              onClick={() => setModalExhibition(row)}
                            >
                              {row[col] ?? '—'}
                            </button>
                          </td>
                        ) : (
                          <td key={col}>{row[col] ?? '—'}</td>
                        ),
                      )}
                      {isSuperadmin ? (
                        <>
                          <td className="session-home__td-kennel">
                            {KENNEL_LABELS[row.kennelId] ?? row.kennelId ?? '—'}
                          </td>
                          <td className="session-home__td-actions">
                            <div className="session-home__actions">
                              <button
                                type="button"
                                className="session-home__action-btn session-home__action-btn--edit"
                                aria-label="Editar exhibición"
                                title="Editar"
                                onClick={() => handleEdit(row)}
                              >
                                <IconPencil />
                              </button>
                              <button
                                type="button"
                                className="session-home__action-btn session-home__action-btn--delete"
                                aria-label="Eliminar exhibición"
                                title="Eliminar"
                                onClick={() => handleDelete(row)}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalExhibition ? (
        <ExhibitionEnrollmentModal
          exhibition={modalExhibition}
          session={session}
          enrollments={
            enrollmentsByExhibition[getExhibitionRowKey(modalExhibition)] ?? []
          }
          onClose={() => setModalExhibition(null)}
          onAddEnrollment={(entry) => {
            const key = getExhibitionRowKey(modalExhibition)
            setEnrollmentsByExhibition((prev) => ({
              ...prev,
              [key]: [...(prev[key] ?? []), entry],
            }))
          }}
        />
      ) : null}
    </div>
  )
}
