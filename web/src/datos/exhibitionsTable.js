/**
 * Columnas visibles (no incluye `kennelId`: es la perrera / organización).
 * `Número` = identificador en catálogo y claves de URL.
 * `Cantidad` = cupo/cantidad (visible sobre todo para usuario normal).
 * `Descripción` = nombre de la exposición.
 * `Números extra`: entero 1–10 (como string en filas).
 * `Estado`: solo Abierto o Cerrado.
 */

export const NUMERO_EXTRA_MIN = 1
export const NUMERO_EXTRA_MAX = 10

/** Valores permitidos para la columna Estado */
export const ESTADOS_EXPOSICION = ['Abierto', 'Cerrado']

export const EXHIBITION_TABLE_COLUMNS = [
  'Número',
  'Descripción',
  'Fecha inicio',
  'Fecha fin',
  'Cantidad',
  'Números extra',
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
    Cantidad: '120',
    'Números extra': '5',
    'Fecha inicio': '2026-05-01',
    'Fecha fin': '2026-05-03',
    'Estado': 'Abierto',
  },
  {
    kennelId: 'club-fca-norte',
    Descripción: 'Expo Primavera',
    'Número': '102',
    Cantidad: '200',
    'Números extra': '10',
    'Fecha inicio': '2026-06-10',
    'Fecha fin': '2026-06-12',
    'Estado': 'Cerrado',
  },
  {
    kennelId: 'club-fca-sur',
    Descripción: 'Expo Sur 2026',
    'Número': '201',
    Cantidad: '80',
    'Números extra': '1',
    'Fecha inicio': '2026-07-01',
    'Fecha fin': '2026-07-02',
    'Estado': 'Abierto',
  },
]

/** Nombre legible por id de kennel (perrera). */
/**
 * Misma regla que el listado: coincide por `kennelId` o por `id_club` (sesión con id numérico).
 * @param {{ role: string, kennelId: string | null }} session
 * @param {ExhibitionRow} row
 */
export function sessionMatchesExhibitionRow(session, row) {
  if (session.role === 'superadmin') return true
  if (!session.kennelId) return false
  if (row.kennelId === session.kennelId) return true
  const idClub = /** @type {{ id_club?: number }} */ (row).id_club
  if (idClub != null && String(idClub) === session.kennelId) return true
  return false
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
  return rows.filter((r) => sessionMatchesExhibitionRow(session, r))
}

/**
 * @param {ExhibitionRow[]} rows
 * @param {string} q
 * @returns {ExhibitionRow[]}
 */
export function filterExhibitionsBySearch(
  rows,
  q,
  { includeKennelLabel, kennelLabels = {} } = {},
) {
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
      const label = kennelLabels[row.kennelId] ?? row.kennelId ?? ''
      return String(label).toLowerCase().includes(s)
    }
    return false
  })
}

/**
 * La exposición intersecta el mes calendario (intervalo [Fecha inicio, Fecha fin] vs mes/año).
 * @param {ExhibitionRow} row
 * @param {string} ano ej. "2026"
 * @param {string} mes "1"–"12" o "01"–"12"
 */
export function exhibitionOverlapsMonth(row, ano, mes) {
  const y = String(ano ?? '').trim()
  const rawM = String(mes ?? '').trim()
  if (!y || !rawM) return false
  const m = rawM.length === 1 ? `0${rawM}` : rawM.padStart(2, '0')
  const yi = parseInt(y, 10)
  const mi = parseInt(m, 10)
  if (Number.isNaN(yi) || mi < 1 || mi > 12) return false

  const monthStart = new Date(yi, mi - 1, 1)
  const monthEnd = new Date(yi, mi, 0)

  function parseLocalDate(s) {
    const p = String(s ?? '').trim().split('-')
    if (p.length !== 3) return null
    const yy = parseInt(p[0], 10)
    const mm = parseInt(p[1], 10)
    const dd = parseInt(p[2], 10)
    if ([yy, mm, dd].some((n) => Number.isNaN(n))) return null
    return new Date(yy, mm - 1, dd)
  }

  const startE = parseLocalDate(row['Fecha inicio'])
  let endE = parseLocalDate(row['Fecha fin'])
  if (!startE) return false
  if (!endE) endE = startE
  return startE <= monthEnd && endE >= monthStart
}

/**
 * Año de `Fecha inicio` coincide con el año indicado (catálogo cuando solo hay año).
 * @param {ExhibitionRow} row
 * @param {string} ano
 */
export function exhibitionInCalendarYear(row, ano) {
  const y = String(ano ?? '').trim()
  if (!y) return false
  const fi = row['Fecha inicio'] || ''
  return fi.split('-')[0] === y
}

/**
 * Filtros del catálogo. Con año y mes juntos se usa solapamiento con el mes calendario.
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
  if (ano && mes) {
    r = r.filter((row) => exhibitionOverlapsMonth(row, ano, mes))
  } else {
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
 * Clave estable para enlazar exposición con anotaciones en memoria.
 * @param {ExhibitionRow} row
 */
export function getExhibitionRowKey(row) {
  return `${row.kennelId}|${row['Número']}|${row['Fecha inicio']}`
}

/**
 * `Fecha fin` estrictamente anterior al día de hoy (hora local).
 * @param {ExhibitionRow} row
 */
export function isExhibitionPast(row) {
  const fin = String(row['Fecha fin'] ?? '').trim()
  if (!fin) return false
  const parts = fin.split('-').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false
  const [y, m, d] = parts
  const endDay = new Date(y, m - 1, d)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return endDay < todayStart
}
