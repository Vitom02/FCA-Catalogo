import { etiquetaInscripcionCategoria } from './categoriaExposicion.js'
import { normalizeSexoEjemplarApi } from './mapEjemplarApi.js'

/**
 * Siguiente `numero` de catálogo para la exposición (ordinal en pantalla).
 * Usa el máximo `ordinal` ya cargado + 1; si no hay filas, 1.
 * @param {Record<string, unknown>[]} enrollments
 */
export function siguienteNumeroCatalogoExposicion(enrollments) {
  let max = 0
  for (const e of enrollments) {
    const o = Number(e.ordinal)
    if (Number.isFinite(o) && o > max) max = o
  }
  return max + 1
}

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
 * Fila de `GET /api/catalogos/exposicion/:id/detalle` → fila de tabla de anotados.
 * @param {Record<string, unknown>} row
 * @param {number} index
 */
export function mapCatalogoDetalleToEnrollment(row, index) {
  const num = row.numero
  const ord =
    num != null && num !== '' && Number.isFinite(Number(num))
      ? String(num)
      : String(index + 1)
  return {
    id_catalogo: row.id_catalogo,
    id_categoria: row.id_categoria,
    'id ejemplar': String(row.id_ejemplar ?? ''),
    nombre: String(row.nombre_completo ?? '—'),
    sexo: normalizeSexoEjemplarApi(row.sexo),
    federacion: String(row.codigo_pais ?? '—'),
    categoria: String(row.categoria_etiqueta ?? '—'),
    raza: String(row.raza ?? '—'),
    ordinal: ord,
    registro:
      row.registro != null && row.registro !== ''
        ? String(row.registro)
        : '—',
    usuario: String(row.usuario_login ?? '—'),
  }
}
