/**
 * Columnas visibles (no incluye `kennelId`: es la perrera / organización).
 * `Descripción` = nombre de la exhibición.
 * `Número extra`: entero 1–10 (como string en filas).
 * `Estado`: solo Abierto o Cerrado.
 */

export const NUMERO_EXTRA_MIN = 1
export const NUMERO_EXTRA_MAX = 10

/** Valores permitidos para la columna Estado */
export const ESTADOS_EXHIBICION = ['Abierto', 'Cerrado']

export const EXHIBITION_TABLE_COLUMNS = [
  'Número',
  'Descripción',
  'Fecha inicio',
  'Fecha fin',
  'Número extra',
  'Estado',
]

/**
 * @typedef {string} KennelId
 */

/**
 * @typedef {Record<string, string> & { kennelId: KennelId }} ExhibitionRow
 */

/** @type {ExhibitionRow[]} */
export const EXHIBITION_TABLE_ROWS = [
  {
    kennelId: 'club-fca-norte',
    Descripción: 'Expo Regional Invierno',
    'Número': '101',
    'Número extra': '5',
    'Fecha inicio': '2026-05-01',
    'Fecha fin': '2026-05-03',
    'Estado': 'Abierto',
  },
  {
    kennelId: 'club-fca-norte',
    Descripción: 'Expo Primavera',
    'Número': '102',
    'Número extra': '10',
    'Fecha inicio': '2026-06-10',
    'Fecha fin': '2026-06-12',
    'Estado': 'Cerrado',
  },
  {
    kennelId: 'club-fca-sur',
    Descripción: 'Expo Sur 2026',
    'Número': '201',
    'Número extra': '1',
    'Fecha inicio': '2026-07-01',
    'Fecha fin': '2026-07-02',
    'Estado': 'Abierto',
  },
]

/** Nombre legible por id de kennel (perrera). */
export const KENNEL_LABELS = {
  'club-fca-norte': 'FCA Norte',
  'club-fca-sur': 'FCA Sur',
}

/**
 * Usuario normal: solo filas de su kennel. Superadmin: todas.
 * @param {ExhibitionRow[]} rows
 * @param {{ role: string, kennelId: string | null }} session
 * @returns {ExhibitionRow[]}
 */
export function filterExhibitionsByRole(rows, session) {
  if (session.role === 'superadmin') return rows
  if (!session.kennelId) return []
  return rows.filter((r) => r.kennelId === session.kennelId)
}

/**
 * @param {ExhibitionRow[]} rows
 * @param {string} q
 * @returns {ExhibitionRow[]}
 */
export function filterExhibitionsBySearch(rows, q, { includeKennelLabel } = {}) {
  const s = q.trim().toLowerCase()
  if (!s) return rows
  return rows.filter((row) => {
    const inColumns = EXHIBITION_TABLE_COLUMNS.some((col) =>
      String(row[col] ?? '')
        .toLowerCase()
        .includes(s),
    )
    if (inColumns) return true
    if (includeKennelLabel) {
      const label = KENNEL_LABELS[row.kennelId] ?? row.kennelId ?? ''
      return String(label).toLowerCase().includes(s)
    }
    return false
  })
}

/**
 * Filtros del catálogo (fecha según columna Fecha inicio).
 * @param {ExhibitionRow[]} rows
 * @param {{ numero?: string, descripcion?: string, ano?: string, mes?: string }} f
 * @returns {ExhibitionRow[]}
 */
export function filterExhibitionsByCatalogCriteria(rows, f) {
  let r = rows
  const num = (f.numero ?? '').trim()
  const descripcion = (f.descripcion ?? '').trim().toLowerCase()
  const ano = (f.ano ?? '').trim()
  const mes = (f.mes ?? '').trim()

  if (num) {
    r = r.filter((row) =>
      String(row['Número'] ?? '')
        .toLowerCase()
        .includes(num.toLowerCase()),
    )
  }
  if (descripcion) {
    r = r.filter((row) =>
      String(row['Descripción'] ?? '')
        .toLowerCase()
        .includes(descripcion),
    )
  }
  if (ano) {
    r = r.filter((row) => {
      const fi = row['Fecha inicio'] || ''
      const y = fi.split('-')[0]
      return y === ano
    })
  }
  if (mes) {
    const m = mes.length === 1 ? `0${mes}` : mes.padStart(2, '0')
    r = r.filter((row) => {
      const fi = row['Fecha inicio'] || ''
      const parts = fi.split('-')
      return parts[1] === m
    })
  }
  return r
}

/**
 * @param {ExhibitionRow[]} rows
 * @param {string} kennelId vacío = todos
 * @returns {ExhibitionRow[]}
 */
export function filterExhibitionsByKennelId(rows, kennelId) {
  if (!kennelId) return rows
  return rows.filter((r) => r.kennelId === kennelId)
}

/**
 * Misma fila (para borrar sin id único).
 * @param {ExhibitionRow} a
 * @param {ExhibitionRow} b
 */
export function isSameExhibitionRow(a, b) {
  return (
    a.kennelId === b.kennelId &&
    a['Número'] === b['Número'] &&
    a['Fecha inicio'] === b['Fecha inicio']
  )
}

/**
 * Clave estable para enlazar exhibición con anotaciones en memoria.
 * @param {ExhibitionRow} row
 */
export function getExhibitionRowKey(row) {
  return `${row.kennelId}|${row['Número']}|${row['Fecha inicio']}`
}
