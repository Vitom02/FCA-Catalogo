import dayjs from 'dayjs'

/**
 * Meses completos desde la fecha de nacimiento hasta la fecha de referencia
 * (p. ej. inicio de la exposición). Las fracciones de mes no cuentan: un mes y medio → 1 mes.
 *
 * @param {unknown} fechaNacimiento ISO YYYY-MM-DD u otro string parseable por dayjs
 * @param {unknown} fechaReferencia típicamente `ExhibitionRow['Fecha inicio']`
 * @returns {number | null} meses ≥ 0, o null si faltan datos o la referencia es anterior al nacimiento
 */
export function mesesCompletosHastaReferencia(fechaNacimiento, fechaReferencia) {
  const n = dayjs(String(fechaNacimiento ?? '').trim())
  const r = dayjs(String(fechaReferencia ?? '').trim())
  if (!n.isValid() || !r.isValid()) return null
  if (r.isBefore(n, 'day')) return null
  let months = (r.year() - n.year()) * 12 + (r.month() - n.month())
  if (r.date() < n.date()) months -= 1
  return Math.max(0, months)
}
