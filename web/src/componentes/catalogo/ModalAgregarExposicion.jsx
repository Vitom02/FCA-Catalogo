import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  listarExposicionesCatalogosPorExposicion,
} from '../../apiConnect.jsx'
import { isSameExhibitionRow } from '../../datos/exhibitionsTable.js'
import { BusquedaSelectTipo } from '../comun/BusquedaSelectTipo.jsx'
import { clubesKennelsYClubes, esClubKennel } from '../../utilidades/mapClubesApi.js'

const EXPO_ID_TIPO_DEFAULT = 1

const FORM_SCOPE = '.expo-add-modal__form--compact'

function emptyForm() {
  return {
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    kennelId: '',
    modoCierre: /** @type {'auto' | 'manual'} */ ('auto'),
    /** 1 = manual, 2 = automática */
    tipoNumeracion: /** @type {1 | 2} */ (2),
  }
}

/**
 * @param {import('../../datos/exhibitionsTable.js').ExhibitionRow & Record<string, unknown>} row
 */
function rowToForm(row) {
  const idClub = /** @type {{ id_club?: number }} */ (row).id_club
  const kennelFromId =
    idClub != null && Number.isFinite(Number(idClub))
      ? String(idClub)
      : String(row.kennelId ?? '').trim()
  const modoCierre =
    /** @type {{ cerrado_manual?: boolean }} */ (row).cerrado_manual === true
      ? 'manual'
      : 'auto'

  const tn = /** @type {{ tipo_numeracion?: number }} */ (row).tipo_numeracion
  const tipoNumeracion = tn === 1 ? /** @type {1 | 2} */ (1) : /** @type {1 | 2} */ (2)

  return {
    nombre: String(row['Descripción'] ?? '').trim(),
    fechaInicio: String(row['Fecha inicio'] ?? '').trim(),
    fechaFin: String(row['Fecha fin'] ?? '').trim(),
    kennelId: kennelFromId,
    modoCierre,
    tipoNumeracion,
  }
}

/**
 * @param {typeof emptyForm()} form
 * @param {{ esEdicion?: boolean }} [opts]
 */
function buildApiBody(form, opts = {}) {
  const nombre = form.nombre.trim()
  const idClub = Number.parseInt(String(form.kennelId ?? '').trim(), 10)
  if (!Number.isFinite(idClub) || idClub < 1) {
    throw new Error('Elegí un club organizador válido de la lista.')
  }
  const parts = form.fechaInicio.split('-').map((x) => parseInt(x, 10))
  const y = parts[0]
  const m = parts[1]
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error('Fecha de inicio inválida.')
  }
  /** @type {Record<string, unknown>} */
  const body = {
    exposicion: nombre,
    desde: form.fechaInicio,
    hasta: form.fechaFin,
    id_club: idClub,
    id_tipo: EXPO_ID_TIPO_DEFAULT,
    ano: y,
    id_mes: m,
    tipo_numeracion: form.tipoNumeracion === 1 ? 1 : 2,
  }
  if (opts.esEdicion) {
    body.cerrado_manual = form.modoCierre === 'manual'
  }
  return body
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSubmit: (payload: {
 *     apiCreate: Record<string, unknown> | null,
 *     apiUpdate: Record<string, unknown> | null,
 *     idExposicion: number | null,
 *     clubesAdicionalesIds: number[],
 *   }) => Promise<void>,
 *   existingRows: import('../../datos/exhibitionsTable.js').ExhibitionRow[],
 *   initialRow?: import('../../datos/exhibitionsTable.js').ExhibitionRow | null,
 *   clubes?: { id_club: number, club: string }[],
 * }} props
 */
export function ModalAgregarExposicion({
  open,
  onClose,
  onSubmit,
  existingRows,
  initialRow = null,
  clubes = [],
}) {
  const titleId = useId()
  const [form, setForm] = useState(emptyForm)
  const [textoPrincipalKennel, setTextoPrincipalKennel] = useState('')
  const [textoPrincipalClub, setTextoPrincipalClub] = useState('')
  const [filasCoorganizador, setFilasCoorganizador] = useState(
    /** @type {{ rowId: number, id: string, textoKennel: string, textoClub: string }[]} */ ([]),
  )
  const coorgRowSeqRef = useRef(0)
  const [guardando, setGuardando] = useState(false)

  const { kennels, clubs } = useMemo(() => clubesKennelsYClubes(clubes), [clubes])

  const clubPrincipal = useMemo(() => {
    const id = form.kennelId
    if (!id) return null
    return kennels.find((c) => String(c.id_club) === String(id))
      ?? clubs.find((c) => String(c.id_club) === String(id))
      ?? null
  }, [form.kennelId, kennels, clubs])

  const principalEsKennel = clubPrincipal?.es_kennel === true

  const idExposicionEdicion =
    initialRow && /** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion != null
      ? Number(/** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion)
      : null

  useEffect(() => {
    if (!open) return
    if (!initialRow) {
      setForm(emptyForm())
      setTextoPrincipalKennel('')
      setTextoPrincipalClub('')
      setFilasCoorganizador([])
      coorgRowSeqRef.current = 0
      return
    }
    const sf = rowToForm(initialRow)
    setForm(sf)
    const kid = sf.kennelId
    const item =
      kid && clubes.length > 0
        ? clubes.find((c) => String(/** @type {{ id_club: number }} */ (c).id_club) === String(kid))
        : null
    const lab = item ? String(/** @type {{ club: string }} */ (item).club ?? '').trim() : ''
    if (item && esClubKennel(item)) {
      setTextoPrincipalKennel(lab)
      setTextoPrincipalClub('')
    } else {
      setTextoPrincipalKennel('')
      setTextoPrincipalClub(lab)
    }
    coorgRowSeqRef.current = 0
    const idExpo = /** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion
    if (idExpo != null && Number.isFinite(Number(idExpo))) {
      listarExposicionesCatalogosPorExposicion(Number(idExpo))
        .then((rows) => {
          const principalNum = kid ? Number(kid) : NaN
          const ids = Array.isArray(rows)
            ? rows
                .map((r) => Number(/** @type {{ id_club?: unknown }} */ (r).id_club))
                .filter((n) => Number.isFinite(n))
                .filter((n) => !Number.isFinite(principalNum) || n !== principalNum)
            : []
          const nuevasFilas = ids.map((id) => {
            coorgRowSeqRef.current += 1
            const item = clubes.find(
              (c) => Number(/** @type {{ id_club?: unknown }} */ (c).id_club) === id,
            )
            const nombre =
              item != null
                ? String(/** @type {{ club?: unknown }} */ (item).club ?? '').trim() || `#${id}`
                : `#${id}`
            const esK = item != null && esClubKennel(item)
            return {
              rowId: coorgRowSeqRef.current,
              id: String(id),
              textoKennel: esK ? nombre : '',
              textoClub: esK ? '' : nombre,
            }
          })
          setFilasCoorganizador(nuevasFilas)
        })
        .catch(() => setFilasCoorganizador([]))
    } else {
      setFilasCoorganizador([])
    }
  }, [open, initialRow, clubes])

  if (!open) return null

  const principalNum = form.kennelId ? Number(form.kennelId) : NaN

  function idsCoorganizadoresUsados(excluirRowId) {
    const seen = new Set()
    for (const f of filasCoorganizador) {
      if (excluirRowId != null && f.rowId === excluirRowId) continue
      const n = parseInt(String(f.id).trim(), 10)
      if (Number.isFinite(n)) seen.add(n)
    }
    return seen
  }

  function itemsKennelParaCoorg(rowId) {
    const usados = idsCoorganizadoresUsados(rowId)
    return kennels.filter((c) => {
      if (Number.isFinite(principalNum) && c.id_club === principalNum) return false
      if (usados.has(c.id_club)) return false
      return true
    })
  }

  function itemsClubParaCoorg(rowId) {
    const usados = idsCoorganizadoresUsados(rowId)
    return clubs.filter((c) => {
      if (Number.isFinite(principalNum) && c.id_club === principalNum) return false
      if (usados.has(c.id_club)) return false
      return true
    })
  }

  function filaCoorgEsKennel(fila) {
    const item = fila.id
      ? kennels.find((c) => String(c.id_club) === String(fila.id))
        ?? clubs.find((c) => String(c.id_club) === String(fila.id))
      : null
    if (item) return item.es_kennel === true
    return Boolean(fila.textoKennel.trim() && !fila.textoClub.trim())
  }

  function seleccionarPrincipalDesdeKennel(id, texto) {
    setForm((f) => ({ ...f, kennelId: id }))
    setTextoPrincipalKennel(texto)
    setTextoPrincipalClub('')
    const n = id ? Number(id) : NaN
    if (Number.isFinite(n)) {
      setFilasCoorganizador((prev) =>
        prev.map((r) =>
          r.id === String(n) ? { ...r, id: '', textoKennel: '', textoClub: '' } : r,
        ),
      )
    }
  }

  function seleccionarPrincipalDesdeClub(id, texto) {
    setForm((f) => ({ ...f, kennelId: id }))
    setTextoPrincipalClub(texto)
    setTextoPrincipalKennel('')
    const n = id ? Number(id) : NaN
    if (Number.isFinite(n)) {
      setFilasCoorganizador((prev) =>
        prev.map((r) =>
          r.id === String(n) ? { ...r, id: '', textoKennel: '', textoClub: '' } : r,
        ),
      )
    }
  }

  function seleccionarCoorgDesdeKennel(rowId, id, texto) {
    patchFilaCoorganizador(rowId, { id, textoKennel: texto, textoClub: '' })
  }

  function seleccionarCoorgDesdeClub(rowId, id, texto) {
    patchFilaCoorganizador(rowId, { id, textoKennel: '', textoClub: texto })
  }

  function agregarFilaCoorganizador() {
    coorgRowSeqRef.current += 1
    setFilasCoorganizador((prev) => [
      ...prev,
      { rowId: coorgRowSeqRef.current, id: '', textoKennel: '', textoClub: '' },
    ])
  }

  function quitarFilaCoorganizador(rowId) {
    setFilasCoorganizador((prev) => prev.filter((f) => f.rowId !== rowId))
  }

  function patchFilaCoorganizador(rowId, patch) {
    setFilasCoorganizador((prev) =>
      prev.map((f) => (f.rowId === rowId ? { ...f, ...patch } : f)),
    )
  }

  function idsCoorganizadoresDesdeFilas() {
    const seen = new Set()
    const out = []
    for (const f of filasCoorganizador) {
      const n = parseInt(String(f.id).trim(), 10)
      if (!Number.isFinite(n)) continue
      if (Number.isFinite(principalNum) && n === principalNum) continue
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
    }
    return out.sort((a, b) => a - b)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nombre = form.nombre.trim()
    const kennelOk = Number.parseInt(String(form.kennelId ?? '').trim(), 10)
    if (
      !nombre ||
      !form.fechaInicio ||
      !form.fechaFin ||
      !Number.isFinite(kennelOk) ||
      kennelOk < 1
    ) {
      window.alert('Completá nombre, fechas y club organizador (elegí de la lista).')
      return
    }
    if (form.fechaFin < form.fechaInicio) {
      window.alert('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }

    const dup = existingRows.some((r) => {
      if (initialRow) {
        if (isSameExhibitionRow(r, initialRow)) return false
        const ie = /** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion
        const rid = /** @type {{ id_exposicion?: number }} */ (r).id_exposicion
        if (
          ie != null &&
          rid != null &&
          Number.isFinite(Number(ie)) &&
          Number(ie) === Number(rid)
        ) {
          return false
        }
      }
      return (
        String(r.kennelId) === String(form.kennelId) &&
        r['Fecha inicio'] === form.fechaInicio &&
        String(r['Descripción'] ?? '').trim().toLowerCase() === nombre.toLowerCase()
      )
    })
    if (dup) {
      window.alert('Ya existe una exposición con el mismo club, nombre y fecha de inicio.')
      return
    }

    let apiBody
    try {
      apiBody = buildApiBody(form, { esEdicion: idExposicionEdicion != null })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Datos inválidos.')
      return
    }

    setGuardando(true)
    try {
      await onSubmit({
        apiCreate: idExposicionEdicion == null ? apiBody : null,
        apiUpdate: idExposicionEdicion != null ? apiBody : null,
        idExposicion: idExposicionEdicion,
        clubesAdicionalesIds: idsCoorganizadoresDesdeFilas(),
      })
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo guardar.'
      window.alert(msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="expo-add-modal__backdrop" role="presentation">
      <div
        className="expo-add-modal expo-add-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="expo-add-modal__head expo-add-modal__head--compact">
          <h2 id={titleId} className="expo-add-modal__title expo-add-modal__title--compact">
            {initialRow ? 'Editar' : 'Nueva'}{' '}
            {idExposicionEdicion != null ? (
              <span className="expo-add-modal__id-tag">#{idExposicionEdicion}</span>
            ) : null}
          </h2>
          <button
            type="button"
            className="expo-add-modal__close expo-add-modal__close--compact"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={guardando}
          >
            ×
          </button>
        </div>
        <form className="expo-add-modal__form expo-add-modal__form--compact" onSubmit={(e) => void handleSubmit(e)}>
          <label className="expo-add-modal__field expo-add-modal__field--compact">
            <span className="expo-add-modal__label">Nombre</span>
            <input
              className="expo-add-modal__input expo-add-modal__input--compact"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              autoComplete="off"
              required
              disabled={guardando}
            />
          </label>
          <div className="expo-add-modal__row2 expo-add-modal__row2--compact">
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Inicio</span>
              <input
                type="date"
                className="expo-add-modal__input expo-add-modal__input--compact"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fechaInicio: e.target.value }))
                }
                required
                disabled={guardando}
              />
            </label>
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Fin</span>
              <input
                type="date"
                className="expo-add-modal__input expo-add-modal__input--compact"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                required
                disabled={guardando}
              />
            </label>
          </div>

          <div className="expo-add-modal__field expo-add-modal__field--compact">
            <span className="expo-add-modal__label">Organizador</span>
            <div className="expo-add-modal__club-grid">
              <div className="expo-add-modal__organizador-split">
                <div className="expo-add-modal__club-split-item">
                  <span className="expo-add-modal__club-sublabel">Kennel</span>
                  <BusquedaSelectTipo
                    items={kennels}
                    getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                    getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                    valueId={principalEsKennel ? form.kennelId : ''}
                    inputText={textoPrincipalKennel}
                    onValueIdChange={(id) => {
                      if (!id) {
                        if (principalEsKennel) seleccionarPrincipalDesdeKennel('', '')
                        return
                      }
                      const item = kennels.find((c) => String(c.id_club) === String(id))
                      seleccionarPrincipalDesdeKennel(id, item ? item.club : '')
                    }}
                    onInputTextChange={setTextoPrincipalKennel}
                    ariaLabel="Kennel organizador"
                    placeholder="Buscar kennel…"
                    className="expo-add-modal__input expo-add-modal__input--compact"
                    scopeSelector={FORM_SCOPE}
                    disabled={guardando}
                  />
                </div>
                <div className="expo-add-modal__club-split-item">
                  <span className="expo-add-modal__club-sublabel">Club</span>
                  <BusquedaSelectTipo
                    items={clubs}
                    getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                    getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                    valueId={!principalEsKennel ? form.kennelId : ''}
                    inputText={textoPrincipalClub}
                    onValueIdChange={(id) => {
                      if (!id) {
                        if (!principalEsKennel && form.kennelId) {
                          seleccionarPrincipalDesdeClub('', '')
                        }
                        return
                      }
                      const item = clubs.find((c) => String(c.id_club) === String(id))
                      seleccionarPrincipalDesdeClub(id, item ? item.club : '')
                    }}
                    onInputTextChange={setTextoPrincipalClub}
                    ariaLabel="Club organizador"
                    placeholder="Buscar club…"
                    className="expo-add-modal__input expo-add-modal__input--compact"
                    scopeSelector={FORM_SCOPE}
                    disabled={guardando}
                  />
                </div>
              </div>
              {filasCoorganizador.map((fila) => {
                const coorgKennel = filaCoorgEsKennel(fila)
                return (
                  <div key={fila.rowId} className="expo-add-modal__club-grid-row">
                    <div className="expo-add-modal__organizador-split">
                      <div className="expo-add-modal__club-split-item">
                        <span className="expo-add-modal__club-sublabel">Kennel</span>
                        <BusquedaSelectTipo
                          items={itemsKennelParaCoorg(fila.rowId)}
                          getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                          getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                          valueId={coorgKennel ? fila.id : ''}
                          inputText={fila.textoKennel}
                          onValueIdChange={(id) => {
                            const item = kennels.find((c) => String(c.id_club) === String(id))
                            seleccionarCoorgDesdeKennel(
                              fila.rowId,
                              id,
                              item ? item.club : '',
                            )
                          }}
                          onInputTextChange={(text) =>
                            patchFilaCoorganizador(fila.rowId, { textoKennel: text })
                          }
                          ariaLabel="Co-organizador kennel"
                          placeholder="Kennel…"
                          className="expo-add-modal__input expo-add-modal__input--compact"
                          scopeSelector={FORM_SCOPE}
                          disabled={guardando || !form.kennelId}
                        />
                      </div>
                      <div className="expo-add-modal__club-split-item">
                        <span className="expo-add-modal__club-sublabel">Club</span>
                        <BusquedaSelectTipo
                          items={itemsClubParaCoorg(fila.rowId)}
                          getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                          getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                          valueId={!coorgKennel ? fila.id : ''}
                          inputText={fila.textoClub}
                          onValueIdChange={(id) => {
                            const item = clubs.find((c) => String(c.id_club) === String(id))
                            seleccionarCoorgDesdeClub(fila.rowId, id, item ? item.club : '')
                          }}
                          onInputTextChange={(text) =>
                            patchFilaCoorganizador(fila.rowId, { textoClub: text })
                          }
                          ariaLabel="Co-organizador club"
                          placeholder="Club…"
                          className="expo-add-modal__input expo-add-modal__input--compact"
                          scopeSelector={FORM_SCOPE}
                          disabled={guardando || !form.kennelId}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="expo-add-modal__btn-minus"
                      onClick={() => quitarFilaCoorganizador(fila.rowId)}
                      disabled={guardando}
                      aria-label="Quitar co-organizador"
                    >
                      −
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                className="expo-add-modal__btn-add-club-row"
                onClick={agregarFilaCoorganizador}
                disabled={guardando || !form.kennelId}
                aria-label="Agregar co-organizador"
              >
                + co-organizador
              </button>
            </div>
          </div>

          <label className="expo-add-modal__field expo-add-modal__field--compact">
            <span className="expo-add-modal__label">Numeración del catálogo</span>
            <select
              className="expo-add-modal__select expo-add-modal__input--compact"
              value={form.tipoNumeracion === 1 ? '1' : '2'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tipoNumeracion: e.target.value === '1' ? 1 : 2,
                }))
              }
              disabled={guardando}
            >
              <option value="1">Manual</option>
              <option value="2">Automática</option>
            </select>
          </label>

          {idExposicionEdicion != null ? (
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Inscripciones / estado</span>
              <select
                className="expo-add-modal__select expo-add-modal__input--compact"
                value={form.modoCierre}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    modoCierre:
                      e.target.value === 'manual' ? 'manual' : 'auto',
                  }))
                }
                disabled={guardando}
              >
                <option value="auto">Automático (reglas y fechas)</option>
                <option value="manual">
                  Cerrado manual (abre la siguiente del club si hay)
                </option>
              </select>
            </label>
          ) : null}

          <div className="expo-add-modal__actions expo-add-modal__actions--compact">
            <button
              type="button"
              className="session-home__btn session-home__btn--secondary"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="session-home__btn session-home__btn--primary"
              disabled={guardando}
              aria-busy={guardando}
            >
              {guardando ? '…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
