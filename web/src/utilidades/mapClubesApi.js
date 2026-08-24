/**
 * Clubes desde `GET /api/clubes` → etiquetas por `kennelId` (= String(id_club)).
 * @param {unknown} clubes
 * @returns {Record<string, string>}
 */
export function kennelLabelsFromClubes(clubes) {
  const out = {}
  if (!Array.isArray(clubes)) return out
  for (const c of clubes) {
    if (!c || typeof c !== 'object') continue
    const raw = /** @type {{ id_club?: unknown, club?: unknown }} */ (c)
    if (raw.id_club == null) continue
    const key = String(raw.id_club)
    const name = String(raw.club ?? '').trim()
    out[key] = name || key
  }
  return out
}

/** Kennels en `web.clubes`: `id_tipo = 1`. El resto son clubes. */
export const ID_TIPO_KENNEL = 1

/**
 * Tipo usado para filtrar kennels en el modal de exposición.
 * Por defecto {@link ID_TIPO_KENNEL}; override opcional con `VITE_ID_TIPO_KENNEL`.
 */
export function idTipoKennelClubes() {
  const raw = import.meta.env.VITE_ID_TIPO_KENNEL
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : ID_TIPO_KENNEL
}

/**
 * @param {{ id_tipo?: unknown }} c
 */
export function esClubKennel(c) {
  if (!c || typeof c !== 'object') return false
  return Number(c.id_tipo) === idTipoKennelClubes()
}

/**
 * Lista ordenada por nombre para selects.
 * @param {unknown} clubes
 * @returns {{ id_club: number, club: string, id_tipo?: number | null, es_club_fca?: boolean, es_kennel?: boolean }[]}
 */
export function clubesSortedByName(clubes) {
  if (!Array.isArray(clubes)) return []
  const tipoKennel = idTipoKennelClubes()
  return clubes
    .filter((c) => c && typeof c === 'object' && c.id_club != null)
    .map((c) => {
      const row = /** @type {{ id_club: unknown, club?: unknown, id_tipo?: unknown, es_club_fca?: unknown }} */ (c)
      const id = Number(row.id_club)
      const club = String(row.club ?? '').trim() || String(id)
      const idTipoRaw = Number(row.id_tipo)
      const id_tipo = Number.isFinite(idTipoRaw) ? idTipoRaw : null
      return {
        id_club: id,
        club,
        id_tipo,
        es_club_fca: Boolean(row.es_club_fca),
        es_kennel: id_tipo === tipoKennel,
      }
    })
    .filter((c) => Number.isFinite(c.id_club))
    .sort((a, b) => a.club.localeCompare(b.club, 'es'))
}

/**
 * Misma lista, partida en kennels (menos) y clubes para búsquedas separadas.
 * @param {unknown} clubes
 */
export function clubesKennelsYClubes(clubes) {
  const todos = clubesSortedByName(clubes)
  /** @type {typeof todos} */
  const kennels = []
  /** @type {typeof todos} */
  const clubs = []
  for (const c of todos) {
    if (c.es_kennel) kennels.push(c)
    else clubs.push(c)
  }
  return { kennels, clubs, todos }
}
