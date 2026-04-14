import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

const DATE_COLS = new Set(['Fecha inicio', 'Fecha fin'])

/**
 * Fecha corta para tablas (DD/MM/YYYY).
 * @param {unknown} value ISO YYYY-MM-DD u otro string parseable
 */
export function formatTableDate(value) {
  const s = String(value ?? '').trim()
  if (!s) return '—'
  const d = dayjs(s)
  if (!d.isValid()) return s
  return d.format('DD/MM/YYYY')
}

/**
 * Texto de rango para cabecera de exposición.
 * @param {unknown} inicio
 * @param {unknown} fin
 */
export function formatExhibitionDateRange(inicio, fin) {
  const di = dayjs(String(inicio ?? '').trim())
  const df = dayjs(String(fin ?? '').trim())
  const a = di.isValid() ? di.format('DD/MM/YYYY') : null
  const b = df.isValid() ? df.format('DD/MM/YYYY') : null
  if (!a && !b) return ''
  if (a && b && a === b) return a
  if (a && b) return `${a} – ${b}`
  if (a) return `Desde ${a}`
  if (b) return `Hasta ${b}`
  return ''
}

/**
 * Valor mostrado en celdas del catálogo de exposiciones.
 * @param {string} col
 * @param {unknown} value
 */
export function formatExhibitionColumnValue(col, value) {
  if (DATE_COLS.has(col)) return formatTableDate(value)
  return value ?? '—'
}
