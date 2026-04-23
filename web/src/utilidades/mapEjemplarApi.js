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
 * @param {{ ordinal?: number | string, categoria: string, username: string, id_categoria?: number | null }} ctx
 */
export function ejemplarBusquedaApiToEnrollment(row, ctx) {
  const reg = row.registro
  const sexo = normalizeSexoEjemplarApi(row.sexo)
  const ord =
    ctx.ordinal != null && ctx.ordinal !== ''
      ? String(ctx.ordinal)
      : ''
  const out = {
    'id ejemplar': String(row.id_ejemplar ?? ''),
    nombre:
      row.nombre_completo != null && String(row.nombre_completo).trim() !== ''
        ? String(row.nombre_completo)
        : '',
    sexo: sexo === '—' ? '' : sexo,
    federacion:
      row.codigo_pais != null && String(row.codigo_pais).trim() !== ''
        ? String(row.codigo_pais)
        : '',
    categoria: ctx.categoria,
    raza: row.raza != null && String(row.raza).trim() !== '' ? String(row.raza) : '',
    /** `c.numero` en API; sin asignar hasta definir correlativo. */
    numero: '',
    ordinal: ord,
    registro: reg != null && reg !== '' ? String(reg) : '',
    usuario: ctx.username,
  }
  if (ctx.id_categoria != null && Number.isFinite(Number(ctx.id_categoria))) {
    Object.assign(out, { id_categoria: Number(ctx.id_categoria) })
  }
  return out
}
