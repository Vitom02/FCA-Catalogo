import { useEffect, useId, useRef, useState } from 'react'
import {
  ApiError,
  listarExposicionesCatalogosPorExposicion,
} from '../../apiConnect.jsx'
import { isSameExhibitionRow } from '../../datos/exhibitionsTable.js'
import { BusquedaSelectTipo } from '../comun/BusquedaSelectTipo.jsx'

const EXPO_ID_TIPO_DEFAULT = 1

const FORM_SCOPE = '.expo-add-modal__form--compact'

function emptyForm() {
  return {
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    kennelId: '',
    cantidad: '',
    extraRazas: '',
    extraCachorros: '',
    abierto: true,
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
  const cupo = /** @type {{ cupo_limite?: number | null }} */ (row).cupo_limite
  const er = /** @type {{ numeros_extra_razas?: number | null }} */ (row).numeros_extra_razas
  const ec = /** @type {{ numeros_extra_cachorros?: number | null }} */ (row).numeros_extra_cachorros
  return {
    nombre: String(row['Descripción'] ?? '').trim(),
    fechaInicio: String(row['Fecha inicio'] ?? '').trim(),
    fechaFin: String(row['Fecha fin'] ?? '').trim(),
    kennelId: kennelFromId,
    cantidad:
      cupo != null && Number.isFinite(Number(cupo)) ? String(cupo) : '',
    extraRazas: er != null && Number.isFinite(Number(er)) ? String(er) : '',
    extraCachorros: ec != null && Number.isFinite(Number(ec)) ? String(ec) : '',
    abierto: String(row.Estado ?? '').trim() === 'Abierto',
  }
}

function toOptIntStr(s) {
  const t = String(s ?? '').trim()
  if (t === '') return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {typeof emptyForm()} form
 */
function buildApiBody(form) {
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
  return {
    exposicion: nombre,
    desde: form.fechaInicio,
    hasta: form.fechaFin,
    id_club: idClub,
    id_tipo: EXPO_ID_TIPO_DEFAULT,
    ano: y,
    id_mes: m,
    cantidad: toOptIntStr(form.cantidad),
    numeros_extra_razas: toOptIntStr(form.extraRazas),
    numeros_extra_cachorros: toOptIntStr(form.extraCachorros),
  }
}

function parseNumInput(v) {
  const t = String(v ?? '').trim()
  if (t === '') return ''
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? String(Math.max(0, n)) : ''
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
  const [textoClubPrincipal, setTextoClubPrincipal] = useState('')
  const [filasCoorganizador, setFilasCoorganizador] = useState(
    /** @type {{ rowId: number, id: string, inputText: string }[]} */ ([]),
  )
  const coorgRowSeqRef = useRef(0)
  const [guardando, setGuardando] = useState(false)

  const idExposicionEdicion =
    initialRow && /** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion != null
      ? Number(/** @type {{ id_exposicion?: number }} */ (initialRow).id_exposicion)
      : null

  useEffect(() => {
    if (!open) return
    if (!initialRow) {
      setForm(emptyForm())
      setTextoClubPrincipal('')
      setFilasCoorganizador([])
      coorgRowSeqRef.current = 0
      return
    }
    const sf = rowToForm(initialRow)
    setForm(sf)
    const kid = sf.kennelId
    const lab =
      kid && clubes.length > 0
        ? clubes.find((c) => String(c.id_club) === String(kid))?.club ?? ''
        : ''
    setTextoClubPrincipal(lab)
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
            return {
              rowId: coorgRowSeqRef.current,
              id: String(id),
              inputText:
                clubes.find((c) => c.id_club === id)?.club ?? `#${id}`,
            }
          })
          setFilasCoorganizador(nuevasFilas)
        })
        .catch(() => setFilasCoorganizador([]))
    } else {
      setFilasCoorganizador([])
    }
  }, [open, initialRow])

  if (!open) return null

  const principalNum = form.kennelId ? Number(form.kennelId) : NaN

  function clubesItemsParaCoorg(rowId) {
    return clubes.filter((c) => {
      if (Number.isFinite(principalNum) && c.id_club === principalNum) return false
      for (const f of filasCoorganizador) {
        if (f.rowId === rowId) continue
        if (f.id && Number(f.id) === c.id_club) return false
      }
      return true
    })
  }

  function agregarFilaCoorganizador() {
    coorgRowSeqRef.current += 1
    setFilasCoorganizador((prev) => [
      ...prev,
      { rowId: coorgRowSeqRef.current, id: '', inputText: '' },
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
      kennelOk < 1 ||
      !String(form.cantidad).trim()
    ) {
      window.alert('Completá nombre, fechas, club organizador (elegí de la lista) y cantidad.')
      return
    }
    if (form.fechaFin < form.fechaInicio) {
      window.alert('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }
    const cantidadN = parseInt(String(form.cantidad).trim(), 10)
    if (!Number.isFinite(cantidadN) || cantidadN < 0) {
      window.alert('La cantidad debe ser un número ≥ 0.')
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
      apiBody = buildApiBody(form)
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
            <span className="expo-add-modal__label">Clubes</span>
            <div className="expo-add-modal__club-grid">
              <div className="expo-add-modal__club-grid-row expo-add-modal__club-grid-row--principal">
                <BusquedaSelectTipo
                  items={clubes}
                  getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                  getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                  valueId={form.kennelId}
                  inputText={textoClubPrincipal}
                  onValueIdChange={(id) => {
                    setForm((f) => ({ ...f, kennelId: id }))
                    const n = id ? Number(id) : NaN
                    if (Number.isFinite(n)) {
                      setFilasCoorganizador((prev) =>
                        prev.map((r) =>
                          r.id === String(n) ? { ...r, id: '', inputText: '' } : r,
                        ),
                      )
                    }
                  }}
                  onInputTextChange={setTextoClubPrincipal}
                  ariaLabel="Club organizador"
                  placeholder="Club organizador…"
                  className="expo-add-modal__input expo-add-modal__input--compact"
                  scopeSelector={FORM_SCOPE}
                  disabled={guardando}
                />
                <span className="expo-add-modal__club-grid-spacer" aria-hidden />
              </div>
              {filasCoorganizador.map((fila) => (
                <div key={fila.rowId} className="expo-add-modal__club-grid-row">
                  <BusquedaSelectTipo
                    items={clubesItemsParaCoorg(fila.rowId)}
                    getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
                    getLabel={(c) => /** @type {{ club: string }} */ (c).club}
                    valueId={fila.id}
                    inputText={fila.inputText}
                    onValueIdChange={(id) => patchFilaCoorganizador(fila.rowId, { id })}
                    onInputTextChange={(text) =>
                      patchFilaCoorganizador(fila.rowId, { inputText: text })
                    }
                    ariaLabel="Co-organizador"
                    placeholder="Co-organizador…"
                    className="expo-add-modal__input expo-add-modal__input--compact"
                    scopeSelector={FORM_SCOPE}
                    disabled={guardando || !form.kennelId}
                  />
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
              ))}
              <button
                type="button"
                className="expo-add-modal__btn-add-club-row"
                onClick={agregarFilaCoorganizador}
                disabled={guardando || !form.kennelId}
                aria-label="Agregar co-organizador"
              >
                + club
              </button>
            </div>
          </div>

          <div className="expo-add-modal__row3">
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Cantidad</span>
              <input
                type="number"
                min={0}
                step={1}
                className="expo-add-modal__input expo-add-modal__input--compact expo-add-modal__input--num"
                value={form.cantidad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cantidad: parseNumInput(e.target.value) }))
                }
                autoComplete="off"
                required
                disabled={guardando}
              />
            </label>
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Extra razas</span>
              <input
                type="number"
                min={0}
                step={1}
                className="expo-add-modal__input expo-add-modal__input--compact expo-add-modal__input--num"
                value={form.extraRazas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, extraRazas: parseNumInput(e.target.value) }))
                }
                autoComplete="off"
                disabled={guardando}
              />
            </label>
            <label className="expo-add-modal__field expo-add-modal__field--compact">
              <span className="expo-add-modal__label">Extra cach.</span>
              <input
                type="number"
                min={0}
                step={1}
                className="expo-add-modal__input expo-add-modal__input--compact expo-add-modal__input--num"
                value={form.extraCachorros}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    extraCachorros: parseNumInput(e.target.value),
                  }))
                }
                autoComplete="off"
                disabled={guardando}
              />
            </label>
          </div>

          <label className="expo-add-modal__check expo-add-modal__check--compact">
            <input
              type="checkbox"
              checked={form.abierto}
              onChange={(e) =>
                setForm((f) => ({ ...f, abierto: e.target.checked }))
              }
              disabled={guardando}
            />
            <span>Abierto</span>
          </label>

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
