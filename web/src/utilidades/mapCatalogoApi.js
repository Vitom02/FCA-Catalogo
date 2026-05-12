import { etiquetaInscripcionCategoria } from './categoriaExposicion.js'
import { normalizeSexoEjemplarApi } from './mapEjemplarApi.js'

/**
 * @param {Record<string, unknown>[]} categoriasApi
 * @param {string} etiqueta
 * @returns {number | null}
 */
export function idCategoriaFromEtiqueta(categoriasApi, etiqueta) {
  const t = String(etiqueta).trim()
  if (!t) return null
  for (const cat of categoriasApi) {
    if (etiquetaInscripcionCategoria(cat) === t) {
      const id = Number(/** @type {{ id_categoria?: unknown }} */ (cat).id_categoria)
      if (Number.isFinite(id)) return id
    }
  }
  return null
}

/**
 * Orden ascendente por n.º de catálogo (`numero`); filas sin número al final; desempate `id_catalogo`.
 * @param {Record<string, unknown>[]} rows
 * @returns {Record<string, unknown>[]}
 */
export function sortCatalogoDetallePorNumeroCatalogo(rows) {
  const arr = Array.isArray(rows) ? rows : []
  return [...arr].sort((a, b) => {
    const na = Number(a.numero)
    const nb = Number(b.numero)
    const fa = Number.isFinite(na) && na >= 1 ? Math.trunc(na) : null
    const fb = Number.isFinite(nb) && nb >= 1 ? Math.trunc(nb) : null
    if (fa == null && fb == null) {
      return (Number(a.id_catalogo) || 0) - (Number(b.id_catalogo) || 0)
    }
    if (fa == null) return 1
    if (fb == null) return -1
    if (fa !== fb) return fa - fb
    return (Number(a.id_catalogo) || 0) - (Number(b.id_catalogo) || 0)
  })
}

/**
 * Fila de `GET /api/catalogos/exposicion/:id/detalle` → fila de tabla de anotados.
 * @param {Record<string, unknown>} row
 */
export function mapCatalogoDetalleToEnrollment(row) {
  const num = row.numero
  const ord =
    num != null && num !== '' && Number.isFinite(Number(num))
      ? String(num)
      : ''
  const sexo = normalizeSexoEjemplarApi(row.sexo)
  return {
    id_catalogo: row.id_catalogo,
    id_categoria: row.id_categoria,
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
    categoria:
      row.categoria_etiqueta != null && String(row.categoria_etiqueta).trim() !== ''
        ? String(row.categoria_etiqueta)
        : '',
    raza:
      row.raza != null && String(row.raza).trim() !== '' ? String(row.raza) : '',
    grupo:
      row.grupo_etiqueta != null && String(row.grupo_etiqueta).trim() !== ''
        ? String(row.grupo_etiqueta)
        : '',
    /** Copia de `c.numero` (API) para alinear con claves y fallback en tablas. */
    numero: row.numero,
    ordinal: ord,
    registro:
      row.registro != null && row.registro !== ''
        ? String(row.registro)
        : '',
    usuario:
      row.usuario_login != null && String(row.usuario_login).trim() !== ''
        ? String(row.usuario_login)
        : '',
  }
}
