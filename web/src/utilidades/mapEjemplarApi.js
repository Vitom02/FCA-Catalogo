/**
 * @param {unknown} raw
 * @returns {'Macho' | 'Hembra' | string}
 */
export function normalizeSexoEjemplarApi(raw) {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'MACHO' || s === 'M') return 'Macho'
  if (s === 'HEMBRA' || s === 'H') return 'Hembra'
  if (!s) return '—'
  return String(raw ?? '—')
}

/**
 * Fila de `GET /api/ejemplares` → fila de inscripción en tabla de anotados.
 * @param {Record<string, unknown>} row
 * @param {{ ordinal: number, categoria: string, username: string, id_categoria?: number | null }} ctx
 */
export function ejemplarBusquedaApiToEnrollment(row, ctx) {
  const reg = row.registro
  const out = {
    'id ejemplar': String(row.id_ejemplar ?? ''),
    nombre: String(row.nombre_completo ?? '—'),
    sexo: normalizeSexoEjemplarApi(row.sexo),
    federacion: String(row.codigo_pais ?? '—'),
    categoria: ctx.categoria,
    raza: String(row.raza ?? '—'),
    ordinal: String(ctx.ordinal),
    registro: reg != null && reg !== '' ? String(reg) : '—',
    usuario: ctx.username,
  }
  if (ctx.id_categoria != null && Number.isFinite(Number(ctx.id_categoria))) {
    Object.assign(out, { id_categoria: Number(ctx.id_categoria) })
  }
  return out
}
