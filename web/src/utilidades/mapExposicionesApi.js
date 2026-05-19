/** @param {unknown} v */
function normalizeClubFromApi(v) {
  if (v == null) return null
  const t = String(v).trim()
  return t === '' ? null : t
}

/**
 * Convierte una fila de `GET /api/exposiciones/*` al formato de fila del catálogo.
 * @param {Record<string, unknown>} api
 * @returns {import('../datos/exhibitionsTable.js').ExhibitionRow & { id_exposicion?: number, id_club?: number | null, club?: string | null }}
 */
export function mapExposicionApiToRow(api) {
  const desde =
    typeof api.desde === 'string'
      ? api.desde.slice(0, 10)
      : String(api.desde ?? '').slice(0, 10)
  const hasta =
    typeof api.hasta === 'string'
      ? api.hasta.slice(0, 10)
      : String(api.hasta ?? '').slice(0, 10)
  const idClub = api.id_club != null ? Number(api.id_club) : null
  const idExpo = api.id_exposicion != null ? Number(api.id_exposicion) : null

  const idEstadoRaw = api.id_estado != null ? Number(api.id_estado) : null
  const idEstado =
    idEstadoRaw != null && Number.isFinite(idEstadoRaw)
      ? Math.trunc(idEstadoRaw)
      : 1
  const estadoExpo = String(api.estado_exposicion ?? '').trim()

  const cerradoManualRaw = api.cerrado_manual
  const cerradoManual =
    cerradoManualRaw === true ||
    cerradoManualRaw === 1 ||
    cerradoManualRaw === '1'

  const tnRaw = api.tipo_numeracion
  const tipoNumeracionNum =
    tnRaw != null && tnRaw !== '' && Number.isFinite(Number(tnRaw))
      ? Math.trunc(Number(tnRaw))
      : 2
  const tipo_numeracion = tipoNumeracionNum === 1 ? 1 : 2

  const kennelFromClub =
    idClub != null && !Number.isNaN(idClub) ? String(idClub) : ''

  const cupoRaw = api.cantidad
  const cupoLimite =
    cupoRaw != null && cupoRaw !== '' && Number.isFinite(Number(cupoRaw))
      ? Number(cupoRaw)
      : null
  const er = api.numeros_extra_razas
  const ec = api.numeros_extra_cachorros
  const extraRazas =
    er != null && er !== '' && Number.isFinite(Number(er)) ? Number(er) : null
  const extraCachorros =
    ec != null && ec !== '' && Number.isFinite(Number(ec)) ? Number(ec) : null

  return {
    id_exposicion: idExpo ?? undefined,
    id_club: idClub,
    id_estado: idEstado,
    club: normalizeClubFromApi(api.club),
    kennelId: kennelFromClub,
    'Número': idExpo != null && !Number.isNaN(idExpo) ? String(idExpo) : '',
    Descripción: String(api.exposicion ?? ''),
    'Fecha inicio': desde,
    'Fecha fin': hasta,
    Cantidad: '—',
    /** Se rellena con `mapConteosCantidadEnFilas`: cantidad de ejemplares NE en catálogo. */
    'Números extra': '0',
    Estado: estadoExpo || 'Abierto',
    cupo_limite: cupoLimite,
    numeros_extra_razas: extraRazas,
    numeros_extra_cachorros: extraCachorros,
    cerrado_manual: cerradoManual,
    tipo_numeracion,
  }
}

/**
 * @param {unknown} data
 * @returns {import('../datos/exhibitionsTable.js').ExhibitionRow[]}
 */
export function mapListaExposicionesApi(data) {
  if (!Array.isArray(data)) return []
  return data.map((item) =>
    mapExposicionApiToRow(item && typeof item === 'object' ? item : {}),
  )
}

/**
 * Asigna `Cantidad` = total de inscriptos y `Números extra` = inscriptos con `numeros_extra` (NE).
 * @param {import('../datos/exhibitionsTable.js').ExhibitionRow[]} rows
 * @param {unknown} conteosData respuesta de `GET /api/catalogos/conteos`
 */
export function mapConteosCantidadEnFilas(rows, conteosData) {
  /** @type {Record<number, { total: number, ne: number }>} */
  const map = {}
  const arr = Array.isArray(conteosData) ? conteosData : []
  for (const c of arr) {
    if (!c || typeof c !== 'object') continue
    const raw = /** @type {{ id_exposicion?: unknown, total?: unknown, total_numeros_extra?: unknown }} */ (
      c
    )
    const id = Number(raw.id_exposicion)
    const t = Number(raw.total)
    const ne = Number(raw.total_numeros_extra)
    if (Number.isFinite(id)) {
      map[id] = {
        total: Number.isFinite(t) ? t : 0,
        ne: Number.isFinite(ne) ? ne : 0,
      }
    }
  }
  return rows.map((row) => {
    const id = row.id_exposicion
    const agg = id != null ? map[id] : undefined
    const n = agg != null ? agg.total : 0
    const nExtra = agg != null ? agg.ne : 0
    return { ...row, Cantidad: String(n), 'Números extra': String(nExtra) }
  })
}
