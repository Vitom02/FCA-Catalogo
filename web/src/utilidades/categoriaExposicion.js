import { normalizeSexoEjemplarApi } from './mapEjemplarApi.js'

/**
 * @param {unknown} sexoEjemplar
 * @returns {'M' | 'H' | null}
 */
export function codigoSexoEjemplarMh(sexoEjemplar) {
  const s = normalizeSexoEjemplarApi(sexoEjemplar)
  if (s === 'Macho') return 'M'
  if (s === 'Hembra') return 'H'
  return null
}

/**
 * @param {Record<string, unknown>} cat
 * @returns {'M' | 'H' | null}
 */
function codigoSexoCategoria(cat) {
  const raw = String(cat.sexo ?? '')
    .trim()
    .toUpperCase()
  if (raw === 'M' || raw === 'MACHO') return 'M'
  if (raw === 'H' || raw === 'HEMBRA') return 'H'
  return null
}

/** Texto que se guarda en la inscripción (columna `categoria`). */
export function etiquetaInscripcionCategoria(cat) {
  const c = cat.categoria
  if (c != null && String(c).trim() !== '') return String(c).trim()
  return ''
}

/**
 * @param {Record<string, unknown>} cat
 * @param {number | null} mesesEdad meses completos o null
 * @param {'M' | 'H' | null} codigoE
 */
export function categoriaEsElegible(cat, mesesEdad, codigoE) {
  const codigoC = codigoSexoCategoria(cat)
  if (codigoE == null || codigoC == null || codigoE !== codigoC) return false
  if (mesesEdad == null) return false
  const desde = Number(cat.desde)
  const hasta = Number(cat.hasta)
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return false
  return mesesEdad >= desde && mesesEdad <= hasta
}

/**
 * @param {Record<string, unknown>[]} categoriasApi filas de `/api/ejemplares/categorias`
 * @param {number | null} mesesEdad
 * @param {Record<string, unknown>} ejemplarRow
 * @returns {Record<string, unknown>[]}
 */
export function filtrarCategoriasElegibles(categoriasApi, mesesEdad, ejemplarRow) {
  const codigoE = codigoSexoEjemplarMh(ejemplarRow.sexo)
  return categoriasApi.filter((cat) =>
    categoriaEsElegible(
      /** @type {Record<string, unknown>} */ (cat),
      mesesEdad,
      codigoE,
    ),
  )
}
