import * as XLSX from 'xlsx'
import { formatExhibitionDateRange, formatTableDate } from './dateDisplay.js'

/** Celdas de inscripción: mismo criterio que en la vista (sin guiones largos). */
function textoCeldaInscripcion(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'bigint') return String(v)
  const s = String(v).trim()
  if (s === '' || s === '—') return ''
  return s
}

/**
 * Nombre de archivo seguro.
 * @param {string} base
 */
function safeFileName(base) {
  const s = String(base ?? '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return s.slice(0, 100) || 'exposicion'
}

/**
 * Genera y descarga un .xlsx con encabezado de exposición y la tabla de inscriptos
 * (mismas columnas que en pantalla, sin "Acciones").
 *
 * @param {{
 *   exhibition: import('../datos/exhibitionsTable.js').ExhibitionRow,
 *   enrollments: Record<string, string>[],
 *   columns: string[],
 *   columnLabels: Record<string, string>,
 * }} p
 */
export function downloadCatalogoExposicionExcel({ exhibition, enrollments, columns, columnLabels }) {
  const desc = String(exhibition['Descripción'] ?? '').trim() || 'Exposición'
  const nro = String(exhibition['Número'] ?? '').trim()
  const inicio = exhibition['Fecha inicio']
  const fin = exhibition['Fecha fin']
  const rango = formatExhibitionDateRange(inicio, fin)

  /** @type {(string | number)[][]} */
  const aoa = []

  aoa.push(['Exposición', desc])
  aoa.push(['N.º', nro])
  if (rango) {
    aoa.push(['Fechas', rango])
  }
  const tIni = formatTableDate(inicio)
  const tFin = formatTableDate(fin)
  aoa.push(['Fecha inicio', tIni === '—' ? '' : tIni])
  aoa.push(['Fecha fin', tFin === '—' ? '' : tFin])
  aoa.push(['Cupo', textoCeldaInscripcion(exhibition['Cantidad'])])
  aoa.push(['N.ºs extra', textoCeldaInscripcion(exhibition['Números extra'])])
  aoa.push(['Estado', textoCeldaInscripcion(exhibition['Estado'])])

  aoa.push([])

  const head = columns.map((col) => columnLabels[col] ?? col)
  aoa.push(head)
  for (const row of enrollments) {
    aoa.push(columns.map((col) => textoCeldaInscripcion(row[col])))
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const nCol = head.length
  const widths = head.map((h, i) => {
    const colKey = columns[i] ?? ''
    const maxData =
      enrollments.length > 0
        ? Math.max(
            ...enrollments.map((r) => String(textoCeldaInscripcion(r[colKey])).length),
          )
        : 0
    const wch = Math.min(48, Math.max(10, String(h).length, maxData))
    return { wch }
  })
  if (nCol) {
    sheet['!cols'] = widths
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Catálogo')
  const fileBase = nro ? `Catalogo_Exposicion_${nro}_${desc}` : `Catalogo_Exposicion_${desc}`
  const fname = `${safeFileName(fileBase)}.xlsx`
  XLSX.writeFile(wb, fname)
}
