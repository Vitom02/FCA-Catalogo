/**
 * Pool de ejemplares para búsqueda y anotación a exhibiciones (demo sin API).
 */

/**
 * @typedef {{
 *   idEjemplar: string,
 *   nombre: string,
 *   federacion: string,
 *   categoria: string,
 *   raza: string,
 * }} SpecimenInPool
 */

/** @type {SpecimenInPool[]} */
export const EJEMPLAR_POOL = [
  {
    idEjemplar: 'E-1001',
    nombre: 'Bruno',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Labrador',
  },
  {
    idEjemplar: 'E-1002',
    nombre: 'Luna',
    federacion: 'FCA',
    categoria: 'Joven',
    raza: 'Golden Retriever',
  },
  {
    idEjemplar: 'E-1003',
    nombre: 'Rocky',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Pastor Alemán',
  },
  {
    idEjemplar: 'E-2001',
    nombre: 'Maya',
    federacion: 'CAC',
    categoria: 'Adulto',
    raza: 'Caniche',
  },
  {
    idEjemplar: 'E-2002',
    nombre: 'Thor',
    federacion: 'CAC',
    categoria: 'Cachorro',
    raza: 'Bulldog Francés',
  },
  {
    idEjemplar: 'E-3001',
    nombre: 'Nina',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Beagle',
  },
  {
    idEjemplar: 'E-3002',
    nombre: 'Simba',
    federacion: 'FCA',
    categoria: 'Veterano',
    raza: 'Boxer',
  },
  {
    idEjemplar: 'E-4001',
    nombre: 'Coco',
    federacion: 'Internacional',
    categoria: 'Adulto',
    raza: 'Border Collie',
  },
]

/**
 * @param {SpecimenInPool[]} pool
 * @param {{ federacion?: string, raza?: string, nombre?: string }} q
 */
export function filterSpecimenPool(pool, q) {
  const fed = (q.federacion ?? '').trim().toLowerCase()
  const raz = (q.raza ?? '').trim().toLowerCase()
  const nom = (q.nombre ?? '').trim().toLowerCase()
  if (!fed && !raz && !nom) return [...pool]
  return pool.filter((p) => {
    if (fed && !p.federacion.toLowerCase().includes(fed)) return false
    if (raz && !p.raza.toLowerCase().includes(raz)) return false
    if (nom && !p.nombre.toLowerCase().includes(nom)) return false
    return true
  })
}

/** Columnas de la tabla de anotados (mismo estilo visual que la tabla principal). */
export const ENROLLMENT_TABLE_COLUMNS = [
  'id ejemplar',
  'nombre',
  'federacion',
  'categoria',
  'raza',
  'ordinal',
  'registro',
  'usuario',
]
