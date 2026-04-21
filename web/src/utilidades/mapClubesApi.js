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

/**
 * Lista ordenada por nombre para selects.
 * @param {unknown} clubes
 * @returns {{ id_club: number, club: string }[]}
 */
export function clubesSortedByName(clubes) {
  if (!Array.isArray(clubes)) return []
  return clubes
    .filter((c) => c && typeof c === 'object' && c.id_club != null)
    .map((c) => {
      const row = /** @type {{ id_club: unknown, club?: unknown }} */ (c)
      const id = Number(row.id_club)
      const club = String(row.club ?? '').trim() || String(id)
      return { id_club: id, club }
    })
    .filter((c) => Number.isFinite(c.id_club))
    .sort((a, b) => a.club.localeCompare(b.club, 'es'))
}
