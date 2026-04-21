/**
 * Pool de ejemplares para búsqueda y anotación a exposiciones (demo sin API).
 * La búsqueda filtra por código de federación, código de raza, nombre, grupo (entero) y registro (parcial).
 */

/**
 * @typedef {'Macho' | 'Hembra'} SexoEjemplar
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
 *   sexo: SexoEjemplar,
 *   numeroRegistro: string,
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
    sexo: 'Macho',
    numeroRegistro: 'FCA-2024-1001',
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
    sexo: 'Hembra',
    numeroRegistro: 'FCA-2024-1002',
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
    sexo: 'Macho',
    numeroRegistro: 'FCA-2023-0455',
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
    sexo: 'Hembra',
    numeroRegistro: 'CAC-2022-7781',
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
    sexo: 'Macho',
    numeroRegistro: 'CAC-2025-0099',
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
    sexo: 'Hembra',
    numeroRegistro: 'FCA-2021-3300',
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
    sexo: 'Macho',
    numeroRegistro: 'FCA-2019-2100',
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
    sexo: 'Hembra',
    numeroRegistro: 'INT-2024-5001',
  },
]

/**
 * Opciones únicas para selects (código + etiqueta legible).
 */
export function getFederacionOpciones() {
  const seen = new Set()
  /** @type {{ value: string, label: string }[]} */
  const out = []
  for (const p of EJEMPLAR_POOL) {
    const v = p.codigoFederacion
    if (seen.has(v)) continue
    seen.add(v)
    const label =
      p.federacion && p.federacion !== v ? `${p.federacion} (${v})` : v
    out.push({ value: v, label })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/**
 * Razas (código + nombre) presentes en el pool para una federación dada.
 * @param {string} codigoFederacion
 */
export function getRazaOpcionesPorFederacion(codigoFederacion) {
  const fed = (codigoFederacion ?? '').trim()
  if (!fed) return []
  const seen = new Set()
  /** @type {{ value: string, label: string }[]} */
  const out = []
  for (const p of EJEMPLAR_POOL) {
    if (p.codigoFederacion !== fed) continue
    const v = p.codigoRaza
    if (seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: p.raza ? `${p.raza} (${v})` : v })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/** Categorías presentes en el pool (para inscripción por nombre). */
export function getCategoriaOpciones() {
  const seen = new Set()
  /** @type {string[]} */
  const out = []
  for (const p of EJEMPLAR_POOL) {
    const c = (p.categoria ?? '').trim()
    if (!c || seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  return out.sort((a, b) => a.localeCompare(b, 'es'))
}

/**
 * Filtra por códigos, nombre, grupo (entero), sexo y/o número de registro (parcial en id. ejemplar).
 * Vacío en un campo de texto = no filtra por ese criterio.
 * Si `grupo` es un número finito, solo pasan ejemplares con ese `grupo`.
 * Si `sexo` es Macho o Hembra, solo pasan ejemplares con ese sexo.
 * @param {SpecimenInPool[]} pool
 * @param {{ codigoFederacion?: string, codigoRaza?: string, nombre?: string, grupo?: number | null, registro?: string, sexo?: SexoEjemplar }} q
 */
export function filterSpecimenPool(pool, q) {
  const fed = (q.codigoFederacion ?? '').trim().toLowerCase()
  const raz = (q.codigoRaza ?? '').trim().toLowerCase()
  const nom = (q.nombre ?? '').trim().toLowerCase()
  const reg = (q.registro ?? '').trim().toLowerCase()
  const g = q.grupo
  const hasGrupo = typeof g === 'number' && Number.isFinite(g)
  const sx = q.sexo
  const hasSexo = sx === 'Macho' || sx === 'Hembra'
  if (!fed && !raz && !nom && !reg && !hasGrupo && !hasSexo) return [...pool]
  return pool.filter((p) => {
    if (hasSexo && p.sexo !== sx) return false
    if (fed && !p.codigoFederacion.toLowerCase().includes(fed)) return false
    if (raz && !p.codigoRaza.toLowerCase().includes(raz)) return false
    if (nom && !p.nombre.toLowerCase().includes(nom)) return false
    if (hasGrupo && p.grupo !== g) return false
    if (reg) {
      const id = p.idEjemplar.toLowerCase()
      const nr = (p.numeroRegistro ?? '').toLowerCase()
      if (
        !id.includes(reg) &&
        !p.nombre.toLowerCase().includes(reg) &&
        !nr.includes(reg)
      ) {
        return false
      }
    }
    return true
  })
}

/** Columnas de la tabla de anotados (federación y raza almacenan códigos). */
export const ENROLLMENT_TABLE_COLUMNS = [
  'id ejemplar',
  'nombre',
  'sexo',
  'federacion',
  'categoria',
  'raza',
  'ordinal',
  'registro',
  'usuario',
]
