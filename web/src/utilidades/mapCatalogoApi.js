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
 * Texto para columna «N.º catálogo» en grilla / export (NE = posteriores al cierre).
 * @param {Record<string, unknown>} row enrollment (`mapCatalogoDetalleToEnrollment` o compatible)
 */
export function etiquetaNumeroCatalogoGrilla(row) {
  const ne = Number(row.numeros_extra)
  if (Number.isFinite(ne) && ne >= 1) return `NE ${Math.trunc(ne)}`
  const num = row.numero
  if (num != null && num !== '' && Number.isFinite(Number(num))) {
    return String(Math.trunc(Number(num)))
  }
  return ''
}

/**
 * Orden para grilla/PDF servidor: oficial con `numero` primero (asc), luego NE por `numeros_extra`, luego el resto.
 * @param {Record<string, unknown>[]} rows
 * @returns {Record<string, unknown>[]}
 */
export function sortCatalogoDetallePorNumeroCatalogo(rows) {
  const arr = Array.isArray(rows) ? rows : []
  return [...arr].sort((a, b) => {
    /** @returns {{ t: number, v: number, idc: number }} */
    function key(r) {
      const ne = Number(r.numeros_extra)
      if (Number.isFinite(ne) && ne >= 1) {
        return { t: 1, v: Math.trunc(ne), idc: Number(r.id_catalogo) || 0 }
      }
      const n = Number(r.numero)
      if (Number.isFinite(n) && n >= 1) {
        return { t: 0, v: Math.trunc(n), idc: Number(r.id_catalogo) || 0 }
      }
      return { t: 2, v: Number(r.id_catalogo) || 0, idc: Number(r.id_catalogo) || 0 }
    }
    const ka = key(a)
    const kb = key(b)
    if (ka.t !== kb.t) return ka.t - kb.t
    if (ka.v !== kb.v) return ka.v - kb.v
    return ka.idc - kb.idc
  })
}

/**
 * Fila de `GET /api/catalogos/exposicion/:id/detalle` → fila de tabla de anotados.
 * @param {Record<string, unknown>} row
 */
export function mapCatalogoDetalleToEnrollment(row) {
  const num = row.numero
  const ne = Number(row.numeros_extra)
  const esNe = Number.isFinite(ne) && ne >= 1
  let ord =
    esNe ? `NE ${Math.trunc(ne)}` :
    num != null && num !== '' && Number.isFinite(Number(num)) ? String(num) :
    ''
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
    /** Copia de `c.numero` (API): null en filas NE. */
    numero: row.numero,
    /** Secuencia por exposición para inscriptos después del cierre. */
    numeros_extra: esNe ? Math.trunc(ne) : null,
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
