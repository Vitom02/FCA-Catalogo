import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  actualizarExposicion,
  crearExposicion,
  crearExposicionCatalogo,
  eliminarExposicion,
  eliminarExposicionCatalogo,
  listarCatalogosConteosPorExposicion,
  listarExposicionesCatalogosPorExposicion,
  listarExposicionesProximas,
} from '../../apiConnect.jsx'
import {
  EXHIBITION_NUMERIC_COLUMNS,
  EXHIBITION_TABLE_COLUMNS,
  esExposicionEstadoAbierto,
  filterExhibitionsByCatalogCriteria,
  filterExhibitionsByKennelId,
  filterExhibitionsByRole,
  getExhibitionRowKey,
  isExhibitionPast,
  isSameExhibitionRow,
} from '../../datos/exhibitionsTable.js'
import { ModalAgregarExposicion } from '../../componentes/catalogo/ModalAgregarExposicion.jsx'
import { formatExhibitionColumnValue } from '../../utilidades/dateDisplay.js'
import {
  clubesSortedByName,
  kennelLabelsFromClubes,
} from '../../utilidades/mapClubesApi.js'
import {
  mapConteosCantidadEnFilas,
  mapListaExposicionesApi,
} from '../../utilidades/mapExposicionesApi.js'
import './PaginaInicio.css'

/**
 * Alinea `exposiciones_catalogos` con la lista de ids enviada desde el modal.
 * @param {number} idExposicion
 * @param {number[]} idsNuevos
 */
async function sincronizarClubesExposicionCatalogo(idExposicion, idsNuevos) {
  const prev = await listarExposicionesCatalogosPorExposicion(idExposicion)
  const prevIds = Array.isArray(prev)
    ? prev
        .map((p) => Number(/** @type {{ id_club?: unknown }} */ (p).id_club))
        .filter((n) => Number.isFinite(n))
    : []
  const prevSet = new Set(prevIds)
  const nextSet = new Set(idsNuevos)
  for (const cid of idsNuevos) {
    if (!prevSet.has(cid)) {
      await crearExposicionCatalogo({ id_exposicion: idExposicion, id_club: cid })
    }
  }
  for (const pid of prevIds) {
    if (!nextSet.has(pid)) {
      await eliminarExposicionCatalogo(idExposicion, pid)
    }
  }
}

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

/** Año y mes calendario actuales (local), para filtros por defecto. */
function defaultAnoYMesEnCurso() {
  const d = new Date()
  return {
    ano: String(d.getFullYear()),
    mes: String(d.getMonth() + 1).padStart(2, '0'),
  }
}

const emptyFilters = () => ({
  numero: '',
  ...defaultAnoYMesEnCurso(),
  kennelId: '',
})

/** Clave interna para filas sin `club` en el JSON (null o vacío). */
const GROUP_CLUB_NULL = '__sin_club__'

/**
 * Superadmin: agrupa por nombre de club del API; sin club → un solo bloque al final.
 * @param {{ club?: string | null }} row
 * @returns {{ key: string, title: string }}
 */
function clubGrupoSortKeyYTitulo(row) {
  const c = row.club
  if (c == null || String(c).trim() === '') {
    return { key: GROUP_CLUB_NULL, title: 'Sin club' }
  }
  const title = String(c).trim()
  return { key: title, title }
}

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
 * @param {{
 *   session: { username: string, role: string, kennelId: string | null },
 *   exhibitionRows: import('../../datos/exhibitionsTable.js').ExhibitionRow[],
 *   setExhibitionRows: (next: unknown) => void,
 *   clubes?: unknown[],
 * }} props
 */
export function PaginaInicio({
  session,
  exhibitionRows,
  setExhibitionRows,
  clubes = [],
}) {
  const navigate = useNavigate()
  const kennelLabels = useMemo(
    () => kennelLabelsFromClubes(clubes),
    [clubes],
  )
  const clubesOrdenados = useMemo(
    () => clubesSortedByName(clubes),
    [clubes],
  )
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [modalExpoAbierto, setModalExpoAbierto] = useState(false)
  const [modalExpoEditRow, setModalExpoEditRow] = useState(null)
  /** @type {{ status: 'idle' | 'loading' | 'ok' | 'error', error: string | null }} */
  const [expoLoad, setExpoLoad] = useState({ status: 'idle', error: null })

  const cargarExposicionesProximas = useCallback(async () => {
    setExpoLoad((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const [data, conteos] = await Promise.all([
        listarExposicionesProximas(),
        listarCatalogosConteosPorExposicion().catch(() => []),
      ])
      const base = mapListaExposicionesApi(data)
      let merged = mapConteosCantidadEnFilas(base, conteos)
      if (session.role !== 'superadmin') {
        merged = merged.filter((r) => esExposicionEstadoAbierto(r))
      }
      setExhibitionRows(merged)
      setExpoLoad({ status: 'ok', error: null })
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'No se pudieron cargar las exposiciones.'
      setExpoLoad({ status: 'error', error: msg })
    }
  }, [setExhibitionRows, session.role])

  useEffect(() => {
    cargarExposicionesProximas()
  }, [cargarExposicionesProximas])

  const goToExposicion = useCallback(
    (row) => {
      navigate(`/exposicion/${encodeURIComponent(getExhibitionRowKey(row))}`)
    },
    [navigate],
  )

  const isSuperadmin = session.role === 'superadmin'

  const visibleExhibitionColumns = useMemo(() => {
    if (isSuperadmin) return EXHIBITION_TABLE_COLUMNS
    return EXHIBITION_TABLE_COLUMNS.filter((c) => c !== 'Estado')
  }, [isSuperadmin])

  const dataColumnCount = visibleExhibitionColumns.length
  /** Superadmin: columnas de datos + acciones (sin columna Kennel: va como fila agrupadora). */
  const tableColCount = isSuperadmin
    ? dataColumnCount + 1
    : dataColumnCount
  /** Fila de grupo por club (superadmin): club (5) + bloque Cant Inscriptos (3) = datos + acciones. */
  const clubGroupColSpanClub = 5
  const clubGroupColSpanInscriptos = 3

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

  const displayedRows = useMemo(() => {
    return filterExhibitionsByCatalogCriteria(rowsAfterKennel, {
      numero: applied.numero,
      ano: applied.ano,
      mes: applied.mes,
    })
  }, [rowsAfterKennel, applied.numero, applied.ano, applied.mes])

  const displayedRowsPorClub = useMemo(() => {
    if (!isSuperadmin) return null
    const map = new Map()
    for (const row of displayedRows) {
      const { key, title } = clubGrupoSortKeyYTitulo(row)
      if (!map.has(key)) {
        map.set(key, { title, rows: [] })
      }
      map.get(key).rows.push(row)
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === GROUP_CLUB_NULL) return 1
      if (b === GROUP_CLUB_NULL) return -1
      return String(a).localeCompare(String(b), 'es')
    })
    return keys.map((groupKey) => {
      const bucket = map.get(groupKey)
      return {
        groupKey,
        label: bucket.title,
        rows: bucket.rows,
      }
    })
  }, [isSuperadmin, displayedRows])

  function handleBuscar(e) {
    e.preventDefault()
    setApplied({ ...draft })
  }

  function handleActualizar() {
    void cargarExposicionesProximas()
    const cleared = emptyFilters()
    setDraft(cleared)
    setApplied(cleared)
  }

  const handleEdit = useCallback((row) => {
    setModalExpoEditRow({ ...row })
    setModalExpoAbierto(true)
  }, [])

  const handleDelete = useCallback(
    async (row) => {
      const ok = window.confirm(
        `¿Eliminar la exposición «${row['Descripción'] ?? '—'}» (${row['Número'] ?? '—'})?`,
      )
      if (!ok) return
      const idEx = /** @type {{ id_exposicion?: number }} */ (row).id_exposicion
      try {
        if (idEx != null && Number.isFinite(Number(idEx))) {
          await eliminarExposicion(Number(idEx))
          await cargarExposicionesProximas()
        } else {
          setExhibitionRows((prev) => prev.filter((r) => !isSameExhibitionRow(r, row)))
        }
      } catch (e) {
        window.alert(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo eliminar la exposición.',
        )
      }
    },
    [cargarExposicionesProximas, setExhibitionRows],
  )

  const handleAgregarExposicion = useCallback(() => {
    setModalExpoEditRow(null)
    setModalExpoAbierto(true)
  }, [])

  const cerrarModalExpo = useCallback(() => {
    setModalExpoAbierto(false)
    setModalExpoEditRow(null)
  }, [])

  const handleGuardarExposicion = useCallback(
    async (payload) => {
      const { apiCreate, apiUpdate, idExposicion, clubesAdicionalesIds } = payload
      try {
        if (idExposicion != null && apiUpdate) {
          await actualizarExposicion(idExposicion, apiUpdate)
          await sincronizarClubesExposicionCatalogo(idExposicion, clubesAdicionalesIds)
        } else if (apiCreate) {
          const created = await crearExposicion(apiCreate)
          const newId = Number(/** @type {{ id_exposicion?: unknown }} */ (created).id_exposicion)
          if (Number.isFinite(newId)) {
            await sincronizarClubesExposicionCatalogo(newId, clubesAdicionalesIds)
          }
        }
        await cargarExposicionesProximas()
      } catch (e) {
        throw e instanceof ApiError
          ? e
          : new Error(
              e instanceof Error ? e.message : 'No se pudo guardar la exposición.',
            )
      }
    },
    [cargarExposicionesProximas],
  )

  return (
    <div className="session-home">
      <div className="session-home__layout">
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
                <span className="session-home__field-label">Año</span>
                <input
                  type="text"
                  className="session-home__input"
                  value={draft.ano}
                  onChange={(e) => {
                    const ano = e.target.value
                    setDraft((d) => ({ ...d, ano }))
                    setApplied((a) => ({ ...a, ano }))
                  }}
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
                  onChange={(e) => {
                    const mes = e.target.value
                    setDraft((d) => ({ ...d, mes }))
                    setApplied((a) => ({ ...a, mes }))
                  }}
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
                  <span className="session-home__field-label">
                    Kennel o club
                  </span>
                  <select
                    className="session-home__select"
                    value={draft.kennelId}
                    onChange={(e) => {
                      const kennelId = e.target.value
                      setDraft((d) => ({ ...d, kennelId }))
                      setApplied((a) => ({ ...a, kennelId }))
                    }}
                  >
                    <option value="">Todas</option>
                    {kennelIdsInData.map((id) => (
                      <option key={id} value={id}>
                        {kennelLabels[id] ?? id}
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
                disabled={expoLoad.status === 'loading'}
                aria-busy={expoLoad.status === 'loading'}
              >
                {expoLoad.status === 'loading' ? 'Actualizando…' : 'Actualizar lista'}
              </button>
            </div>
          </form>
        </section>

        {isSuperadmin ? (
          <>
            <ModalAgregarExposicion
              open={modalExpoAbierto}
              onClose={cerrarModalExpo}
              onSubmit={handleGuardarExposicion}
              existingRows={exhibitionRows}
              initialRow={modalExpoEditRow}
              clubes={clubesOrdenados}
            />
            <div className="session-home__toolbar">
              <button
                type="button"
                className="session-home__btn session-home__btn--primary session-home__btn--add"
                onClick={handleAgregarExposicion}
              >
                Agregar
              </button>
            </div>
          </>
        ) : null}

        <section
          className="session-home__table-section"
          aria-labelledby="table-heading"
        >
          <h2 id="table-heading" className="session-home__table-title">
            Exposiciones
          </h2>
          <div className="session-home__table-wrap">
            <table className="session-home__table">
              <thead>
                <tr>
                  {visibleExhibitionColumns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={
                        EXHIBITION_NUMERIC_COLUMNS.has(col)
                          ? 'session-home__cell--numeric'
                          : undefined
                      }
                    >
                      {col}
                    </th>
                  ))}
                  {isSuperadmin ? (
                    <th scope="col" className="session-home__th-actions">
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {expoLoad.status === 'loading' && exhibitionRows.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={tableColCount}
                    >
                      Cargando exposiciones…
                    </td>
                  </tr>
                ) : expoLoad.status === 'error' && exhibitionRows.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={tableColCount}
                    >
                      {expoLoad.error ?? 'Error al cargar.'}
                    </td>
                  </tr>
                ) : rowsForRole.length === 0 ? (
                  <tr>
                    <td
                      className="session-home__empty"
                      colSpan={tableColCount}
                    >
                      {isSuperadmin
                        ? 'No hay exposiciones cargadas.'
                        : 'No hay exposiciones para tu kennel.'}
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
                ) : isSuperadmin && displayedRowsPorClub ? (
                  displayedRowsPorClub.map((grupo) => (
                    <Fragment key={grupo.groupKey}>
                      <tr className="session-home__club-group-row">
                        <th
                          className="session-home__club-group-heading"
                          colSpan={clubGroupColSpanClub}
                          scope="colgroup"
                        >
                          {grupo.label}
                        </th>
                        <td
                          className="session-home__club-group-stat"
                          colSpan={clubGroupColSpanInscriptos}
                        >
                          <span className="session-home__club-inscriptos">
                            <span className="session-home__club-inscriptos-label">
                              Cant Inscriptos:
                            </span>{' '}
                            <span className="session-home__club-inscriptos-value">
                              {grupo.rows.reduce((sum, row) => {
                                const n = Number(row.Cantidad)
                                return sum + (Number.isFinite(n) ? n : 0)
                              }, 0)}
                            </span>
                          </span>
                        </td>
                      </tr>
                      {grupo.rows.map((row, i) => (
                        <tr
                          key={`${row.kennelId}-${row['Número']}-${row['Fecha inicio']}-${i}`}
                          className="session-home__row--clickable"
                          tabIndex={0}
                          role="link"
                          aria-label={`Abrir exposición ${row['Número'] ?? ''} ${row['Descripción'] ?? ''}`}
                          onClick={() => goToExposicion(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              goToExposicion(row)
                            }
                          }}
                        >
                          {visibleExhibitionColumns.map((col) => (
                            <td
                              key={col}
                              className={
                                EXHIBITION_NUMERIC_COLUMNS.has(col)
                                  ? 'session-home__cell--numeric'
                                  : undefined
                              }
                            >
                              {formatExhibitionColumnValue(col, row[col])}
                            </td>
                          ))}
                          <td
                            className="session-home__td-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isExhibitionPast(row) ? (
                              <span className="session-home__actions-muted">—</span>
                            ) : (
                              <div className="session-home__actions">
                                <button
                                  type="button"
                                  className="session-home__action-btn session-home__action-btn--edit"
                                  aria-label="Editar exposición"
                                  title="Editar"
                                  onClick={() => handleEdit(row)}
                                >
                                  <IconPencil />
                                </button>
                                <button
                                  type="button"
                                  className="session-home__action-btn session-home__action-btn--delete"
                                  aria-label="Eliminar exposición"
                                  title="Eliminar"
                                  onClick={() => handleDelete(row)}
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  displayedRows.map((row, i) => (
                    <tr
                      key={`${row.kennelId}-${row['Número']}-${row['Fecha inicio']}-${i}`}
                      className="session-home__row--clickable"
                      tabIndex={0}
                      role="link"
                      aria-label={`Abrir exposición ${row['Número'] ?? ''} ${row['Descripción'] ?? ''}`}
                      onClick={() => goToExposicion(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          goToExposicion(row)
                        }
                      }}
                    >
                      {visibleExhibitionColumns.map((col) => (
                        <td
                          key={col}
                          className={
                            EXHIBITION_NUMERIC_COLUMNS.has(col)
                              ? 'session-home__cell--numeric'
                              : undefined
                          }
                        >
                          {formatExhibitionColumnValue(col, row[col])}
                        </td>
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
