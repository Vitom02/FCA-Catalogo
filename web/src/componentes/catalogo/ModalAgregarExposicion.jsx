import { useEffect, useId, useState } from 'react'
import {
  NUMERO_EXTRA_MAX,
  NUMERO_EXTRA_MIN,
  getExhibitionRowKey,
} from '../../datos/exhibitionsTable.js'

function emptyForm() {
  return {
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    kennelId: '',
    numero: '',
    cantidad: '',
    numerosExtra: String(NUMERO_EXTRA_MIN),
    abierto: true,
  }
}

/**
 * @param {import('../../datos/exhibitionsTable.js').ExhibitionRow} row
 */
function rowToForm(row) {
  const raw = parseInt(String(row['Números extra'] ?? '').trim(), 10)
  const extra = Number.isNaN(raw)
    ? NUMERO_EXTRA_MIN
    : Math.min(NUMERO_EXTRA_MAX, Math.max(NUMERO_EXTRA_MIN, raw))
  const idClub = /** @type {{ id_club?: number }} */ (row).id_club
  const kennelFromId =
    idClub != null && Number.isFinite(Number(idClub))
      ? String(idClub)
      : String(row.kennelId ?? '').trim()
  return {
    nombre: String(row['Descripción'] ?? '').trim(),
    fechaInicio: String(row['Fecha inicio'] ?? '').trim(),
    fechaFin: String(row['Fecha fin'] ?? '').trim(),
    kennelId: kennelFromId,
    numero: String(row['Número'] ?? '').trim(),
    cantidad: String(row.Cantidad ?? '').trim(),
    numerosExtra: String(extra),
    abierto: String(row.Estado ?? '').trim() === 'Abierto',
  }
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSubmit: (row: import('../../datos/exhibitionsTable.js').ExhibitionRow) => void,
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
  const editingOriginalKey = initialRow ? getExhibitionRowKey(initialRow) : null

  useEffect(() => {
    if (!open) return
    setForm(initialRow ? rowToForm(initialRow) : emptyForm())
  }, [open, initialRow])

  if (!open) return null

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nombre = form.nombre.trim()
    const numero = form.numero.trim()
    const cantidad = form.cantidad.trim()
    if (
      !nombre ||
      !form.fechaInicio ||
      !form.fechaFin ||
      !form.kennelId ||
      !numero ||
      !cantidad
    ) {
      return
    }
    if (form.fechaFin < form.fechaInicio) {
      window.alert('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }
    let extra = parseInt(String(form.numerosExtra).trim(), 10)
    if (Number.isNaN(extra)) extra = NUMERO_EXTRA_MIN
    extra = Math.min(NUMERO_EXTRA_MAX, Math.max(NUMERO_EXTRA_MIN, extra))

    const row = {
      kennelId: form.kennelId,
      Descripción: nombre,
      'Número': numero,
      Cantidad: cantidad,
      'Fecha inicio': form.fechaInicio,
      'Fecha fin': form.fechaFin,
      'Números extra': String(extra),
      Estado: form.abierto ? 'Abierto' : 'Cerrado',
    }

    const key = getExhibitionRowKey(row)
    const duplicate = existingRows.some((r) => {
      const rk = getExhibitionRowKey(r)
      if (editingOriginalKey && rk === editingOriginalKey) return false
      return rk === key
    })
    if (duplicate) {
      window.alert(
        'Ya existe una exposición con el mismo club, número y fecha de inicio.',
      )
      return
    }

    onSubmit(row)
    onClose()
  }

  return (
    <div
      className="expo-add-modal__backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="expo-add-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="expo-add-modal__head">
          <h2 id={titleId} className="expo-add-modal__title">
            {initialRow ? 'Editar exposición' : 'Nueva exposición'}
          </h2>
          <button
            type="button"
            className="expo-add-modal__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="expo-add-modal__form" onSubmit={handleSubmit}>
          <label className="expo-add-modal__field">
            <span className="expo-add-modal__label">Nombre</span>
            <input
              className="expo-add-modal__input"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              autoComplete="off"
              required
            />
          </label>
          <div className="expo-add-modal__row2">
            <label className="expo-add-modal__field">
              <span className="expo-add-modal__label">Fecha inicio</span>
              <input
                type="date"
                className="expo-add-modal__input"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fechaInicio: e.target.value }))
                }
                required
              />
            </label>
            <label className="expo-add-modal__field">
              <span className="expo-add-modal__label">Fecha fin</span>
              <input
                type="date"
                className="expo-add-modal__input"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                required
              />
            </label>
          </div>
          <label className="expo-add-modal__field">
            <span className="expo-add-modal__label">Club</span>
            <select
              className="expo-add-modal__select"
              value={form.kennelId}
              onChange={(e) => setForm((f) => ({ ...f, kennelId: e.target.value }))}
              required
            >
              <option value="" disabled>
                Elegir club…
              </option>
              {clubes.map((c) => (
                <option key={c.id_club} value={String(c.id_club)}>
                  {c.club}
                </option>
              ))}
            </select>
          </label>
          <div className="expo-add-modal__row2">
            <label className="expo-add-modal__field">
              <span className="expo-add-modal__label">Número (identificador)</span>
              <input
                className="expo-add-modal__input"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                autoComplete="off"
                required
              />
            </label>
            <label className="expo-add-modal__field">
              <span className="expo-add-modal__label">Cantidad</span>
              <input
                className="expo-add-modal__input"
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                autoComplete="off"
                inputMode="numeric"
                required
              />
            </label>
          </div>
          <label className="expo-add-modal__field">
            <span className="expo-add-modal__label">Números extra</span>
            <input
              type="number"
              className="expo-add-modal__input"
              min={NUMERO_EXTRA_MIN}
              max={NUMERO_EXTRA_MAX}
              value={form.numerosExtra}
              onChange={(e) =>
                setForm((f) => ({ ...f, numerosExtra: e.target.value }))
              }
              required
            />
          </label>
          <label className="expo-add-modal__check">
            <input
              type="checkbox"
              checked={form.abierto}
              onChange={(e) =>
                setForm((f) => ({ ...f, abierto: e.target.checked }))
              }
            />
            <span>Abierto/Visible</span>
          </label>
          <div className="expo-add-modal__actions">
            <button
              type="button"
              className="session-home__btn session-home__btn--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="session-home__btn session-home__btn--primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
