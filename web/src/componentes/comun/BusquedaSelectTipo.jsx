import { useId } from 'react'

export function normalizarBusqueda(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getLabel
 * @param {string} queryRaw
 * @returns {T | null}
 */
export function matchUnicoEtiqueta(items, getLabel, queryRaw) {
  const q = normalizarBusqueda(queryRaw)
  if (!q) return null
  const cand = items.filter((it) => normalizarBusqueda(getLabel(it)).includes(q))
  return cand.length === 1 ? cand[0] : null
}

/**
 * @param {Element} current
 * @param {string} scopeSelector
 */
function focusSiguienteEnAlcance(current, scopeSelector) {
  const scope = current.closest(scopeSelector)
  if (!scope || !(current instanceof HTMLElement)) return
  const focusables = Array.from(
    scope.querySelectorAll(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    ),
  ).filter((el) => el instanceof HTMLElement)
  const i = focusables.indexOf(current)
  if (i === -1) return
  for (let j = i + 1; j < focusables.length; j++) {
    focusables[j].focus()
    return
  }
}

/**
 * Texto + datalist; Tab completa con la primera opción cuyo texto incluye lo escrito
 * (si hay una sola coincidencia, es esa; si hay varias, la primera de la lista).
 * @param {{
 *   items: unknown[],
 *   getId: (item: unknown) => string | number,
 *   getLabel: (item: unknown) => string,
 *   valueId: string,
 *   inputText: string,
 *   onValueIdChange: (id: string) => void,
 *   onInputTextChange: (text: string) => void,
 *   ariaLabel: string,
 *   placeholder?: string,
 *   className?: string,
 *   scopeSelector?: string,
 *   disabled?: boolean,
 * }} props
 */
export function BusquedaSelectTipo({
  items,
  getId,
  getLabel,
  valueId,
  inputText,
  onValueIdChange,
  onInputTextChange,
  ariaLabel,
  placeholder = 'Escribí; Tab usa la primera coincidencia de la lista',
  className = '',
  scopeSelector,
  disabled = false,
}) {
  const listId = useId()
  return (
    <>
      <input
        type="text"
        className={className}
        value={inputText}
        onChange={(e) => {
          const v = e.target.value
          onInputTextChange(v)
          const exact = items.find((it) => getLabel(it) === v)
          if (exact) {
            onValueIdChange(String(getId(exact)))
            return
          }
          const curId = valueId
          if (!curId) {
            onValueIdChange('')
            return
          }
          const cur = items.find((it) => String(getId(it)) === String(curId))
          if (!cur || getLabel(cur) !== v) onValueIdChange('')
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key !== 'Tab' || e.shiftKey) return
          const t = String(inputText ?? '').trim()
          const exact = t !== '' ? items.find((it) => getLabel(it) === t) : null
          const q = normalizarBusqueda(inputText)
          let pick = exact
          if (!pick && q) {
            const cand = items.filter((it) =>
              normalizarBusqueda(getLabel(it)).includes(q),
            )
            pick = cand.length > 0 ? cand[0] : null
          }
          if (!pick) return
          e.preventDefault()
          onValueIdChange(String(getId(pick)))
          onInputTextChange(getLabel(pick))
          if (scopeSelector && e.currentTarget instanceof HTMLElement) {
            const el = e.currentTarget
            requestAnimationFrame(() => focusSiguienteEnAlcance(el, scopeSelector))
          }
        }}
        list={listId}
        autoComplete="off"
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {items.map((it) => (
          <option key={String(getId(it))} value={getLabel(it)} />
        ))}
      </datalist>
    </>
  )
}
