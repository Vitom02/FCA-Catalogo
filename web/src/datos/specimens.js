/**
 * Pool de ejemplares para búsqueda y anotación a exposiciones (demo sin API).
 * La búsqueda filtra por código de federación, código de raza, nombre y grupo (entero).
 */

/**
 * @typedef {{
 *   idEjemplar: string,
 *   nombre: string,
 *   codigoFederacion: string,
 *   codigoRaza: string,
 *   federacion: string,
 *   categoria: string,
 *   raza: string,
 *   grupo: number,
 * }} SpecimenInPool
 */

/** @type {SpecimenInPool[]} */
export const EJEMPLAR_POOL = [
  {
    idEjemplar: 'E-1001',
    nombre: 'Bruno',
    codigoFederacion: 'FCA',
    codigoRaza: 'LAB',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Labrador',
    grupo: 1,
  },
  {
    idEjemplar: 'E-1002',
    nombre: 'Luna',
    codigoFederacion: 'FCA',
    codigoRaza: 'GDR',
    federacion: 'FCA',
    categoria: 'Joven',
    raza: 'Golden Retriever',
    grupo: 2,
  },
  {
    idEjemplar: 'E-1003',
    nombre: 'Rocky',
    codigoFederacion: 'FCA',
    codigoRaza: 'PAS',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Pastor Alemán',
    grupo: 1,
  },
  {
    idEjemplar: 'E-2001',
    nombre: 'Maya',
    codigoFederacion: 'CAC',
    codigoRaza: 'CAN',
    federacion: 'CAC',
    categoria: 'Adulto',
    raza: 'Caniche',
    grupo: 3,
  },
  {
    idEjemplar: 'E-2002',
    nombre: 'Thor',
    codigoFederacion: 'CAC',
    codigoRaza: 'BFR',
    federacion: 'CAC',
    categoria: 'Cachorro',
    raza: 'Bulldog Francés',
    grupo: 2,
  },
  {
    idEjemplar: 'E-3001',
    nombre: 'Nina',
    codigoFederacion: 'FCA',
    codigoRaza: 'BEA',
    federacion: 'FCA',
    categoria: 'Adulto',
    raza: 'Beagle',
    grupo: 4,
  },
  {
    idEjemplar: 'E-3002',
    nombre: 'Simba',
    codigoFederacion: 'FCA',
    codigoRaza: 'BOX',
    federacion: 'FCA',
    categoria: 'Veterano',
    raza: 'Boxer',
    grupo: 5,
  },
  {
    idEjemplar: 'E-4001',
    nombre: 'Coco',
    codigoFederacion: 'INT',
    codigoRaza: 'BOR',
    federacion: 'Internacional',
    categoria: 'Adulto',
    raza: 'Border Collie',
    grupo: 1,
  },
]

/**
 * Filtra por códigos, nombre y grupo (entero). Vacío en un campo de texto = no filtra por ese criterio.
 * Si `grupo` es un número finito, solo pasan ejemplares con ese `grupo`.
 * @param {SpecimenInPool[]} pool
 * @param {{ codigoFederacion?: string, codigoRaza?: string, nombre?: string, grupo?: number | null }} q
 */
export function filterSpecimenPool(pool, q) {
  const fed = (q.codigoFederacion ?? '').trim().toLowerCase()
  const raz = (q.codigoRaza ?? '').trim().toLowerCase()
  const nom = (q.nombre ?? '').trim().toLowerCase()
  const g = q.grupo
  const hasGrupo = typeof g === 'number' && Number.isFinite(g)
  if (!fed && !raz && !nom && !hasGrupo) return [...pool]
  return pool.filter((p) => {
    if (fed && !p.codigoFederacion.toLowerCase().includes(fed)) return false
    if (raz && !p.codigoRaza.toLowerCase().includes(raz)) return false
    if (nom && !p.nombre.toLowerCase().includes(nom)) return false
    if (hasGrupo && p.grupo !== g) return false
    return true
  })
}

/** Columnas de la tabla de anotados (federación y raza almacenan códigos). */
export const ENROLLMENT_TABLE_COLUMNS = [
  'id ejemplar',
  'nombre',
  'federacion',
  'categoria',
  'grupo',
  'raza',
  'ordinal',
  'registro',
  'usuario',
]
