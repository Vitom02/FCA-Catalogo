/**
 * Orden y agrupación del catálogo para PDF:
 * Por **macro-sección** (ADULTOS → JÓVENES → VETERANOS → CACHORROS → CACHORROS ESPECIALES):
 * en cada una se mantiene **grupo FCI → raza (alfabético) → categorías de esa sección** (orden fijo por `id_categoria`).
 * Dentro de cada categoría, los ejemplares van **primero machos, luego hembras**; dentro de cada sexo,
 * **el más adulto primero** (fecha de nacimiento más antigua). Desempate: n.º de catálogo descendente, luego `id_catalogo`.
 *
 * Los textos de raza para PDF: **trayectoria** = país desde `web.razas.id_pais` → `web.paises.pais` (`raza_trayectoria`);
 * **función** = `funcion`; **características** = `descripcion` (`raza_funcion`, `raza_descripcion`).
 * `infoRazaPorIdRaza` sigue pudiendo sobreescribir.
 */

import dayjs from 'dayjs'

/** @typedef {{ trayectoria?: string, procedencia?: string, funcion?: string, caracteristicas?: string }} CatalogoPdfRazaInfoLocal */

/**
 * Definición de bloques del PDF: `idsOrden` son `id_categoria` (`web.exposiciones_categorias`).
 * Adultos: clases 5–8 y 9–12 (ids 5…12). Jóvenes: 3 y 15; 4 y 16 (el id 4 no repite en adultos).
 * Ajustá estos arrays si tu seed de categorías difiere.
 */
export const PDF_MACRO_SECCIONES_CATALOGO = [
  { titulo: 'ADULTOS', idsOrden: [5, 6, 7, 8, 9, 10, 11, 12] },
  { titulo: 'JÓVENES', idsOrden: [3, 15, 4, 16] },
  { titulo: 'VETERANOS', idsOrden: [13, 14] },
  { titulo: 'CACHORROS', idsOrden: [1, 2] },
  { titulo: 'CACHORROS ESPECIALES', idsOrden: [17, 18] },
]

/**
 * Entero positivo (p. ej. n.º FCI 1–10) → número romano. 0 o fuera de rango → ''.
 * @param {unknown} n
 */
export function enteroARomano(n) {
  const x = Math.floor(Number(n))
  if (!Number.isFinite(x) || x <= 0 || x > 3999) return ""
  const pairs = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let s = ""
  let v = x
  for (const [arab, rom] of pairs) {
    while (v >= arab) {
      s += rom
      v -= arab
    }
  }
  return s
}

/**
 * Título de grupo FCI para el PDF («Grupo I», …) o etiqueta / Sin grupo.
 * @param {{ id_grupo?: unknown, grupo_etiqueta?: unknown }} g
 */
function tituloGrupoFciParaPdf(g) {
  const id = Number(g?.id_grupo)
  if (!Number.isFinite(id) || id <= 0) {
    const lab = String(g?.grupo_etiqueta ?? '').trim()
    return lab || 'Sin grupo'
  }
  const rom = enteroARomano(id)
  if (rom) return `Grupo ${rom}`
  const lab = String(g?.grupo_etiqueta ?? '').trim()
  return lab || 'Sin grupo'
}

/** Sin número reconocible en la etiqueta → se ordena al final. */
const ORDINAL_SIN_NUMERO = 9999

/**
 * Extrae el número de clase de la categoría (p. ej. `8° CAMPEONES`, `CAT. 13ª: Veteranos`).
 * Prefiere el dígito seguido de °/º/ª (evita tomar "15" de "más de 15 meses").
 * @param {string} etiqueta
 */
export function ordinalDesdeEtiquetaCategoria(etiqueta) {
  const t = String(etiqueta ?? '').trim()
  if (!t) return ORDINAL_SIN_NUMERO
  let m = t.match(/^\s*(\d+)\s*[°ºª]/i)
  if (m) return parseInt(m[1], 10)
  m = t.match(/\bCAT\.?\s*(\d+)\s*[°ºª]/i)
  if (m) return parseInt(m[1], 10)
  m = t.match(/(\d+)\s*[°ºª]/i)
  if (m) return parseInt(m[1], 10)
  m = t.match(/^\s*(\d+)\s*va\b/i)
  if (m) return parseInt(m[1], 10)
  m = t.match(/^\s*(\d+)\b/)
  return m ? parseInt(m[1], 10) : ORDINAL_SIN_NUMERO
}

/**
 * Si dos categorías comparten el mismo n.º, MACHOS antes que HEMBRAS.
 * @param {string} etiqueta
 * @returns {number} 0 machos, 1 hembras, 2 otro / no aclarado
 */
export function pesoSexoCategoriaParaOrden(etiqueta) {
  const t = String(etiqueta ?? '').toUpperCase()
  if (/\bMACHOS?\b/.test(t)) return 0
  if (/\bHEMBRAS?\b/.test(t) || /\bHEMBRA\b/.test(t)) return 1
  return 2
}

/**
 * Igual que el resumen API: `id_grupo` numérico; 0 / sin grupo al final.
 * @param {{ id_grupo?: unknown }} a
 * @param {{ id_grupo?: unknown }} b
 */
export function compararGrupoResumen(a, b) {
  const ga = Number(a?.id_grupo)
  const gb = Number(b?.id_grupo)
  const fa = Number.isFinite(ga) ? ga : 0
  const fb = Number.isFinite(gb) ? gb : 0
  if (fa === 0 && fb !== 0) return 1
  if (fb === 0 && fa !== 0) return -1
  return fa - fb
}

/**
 * Alfabético por etiqueta de raza (es).
 * @param {{ etiqueta_raza?: unknown }} a
 * @param {{ etiqueta_raza?: unknown }} b
 */
export function compararRazaAlfabetico(a, b) {
  const la = String(a?.etiqueta_raza ?? '').trim()
  const lb = String(b?.etiqueta_raza ?? '').trim()
  return la.localeCompare(lb, 'es', { sensitivity: 'base' })
}

/**
 * Categoría: primero por n.º de clase **mayor a menor** (13ª antes que 8ª que 6ª); si repite n.º, MACHOS antes que HEMBRAS; después texto.
 * @param {{ categoria_etiqueta?: unknown }} a
 * @param {{ categoria_etiqueta?: unknown }} b
 */
export function compararCategoriaPorOrdinalEnNombre(a, b) {
  const ta = String(a?.categoria_etiqueta ?? '')
  const tb = String(b?.categoria_etiqueta ?? '')
  const oa = ordinalDesdeEtiquetaCategoria(ta)
  const ob = ordinalDesdeEtiquetaCategoria(tb)
  if (oa !== ob) return ob - oa
  const sa = pesoSexoCategoriaParaOrden(ta)
  const sb = pesoSexoCategoriaParaOrden(tb)
  if (sa !== sb) return sa - sb
  return ta.localeCompare(tb, 'es', { sensitivity: 'base' })
}

/**
 * Ejemplar (fila detalle): macho antes que hembra; dentro de cada sexo, **más adulto primero**
 * (`fecha_nacimiento` más antigua). Sin fecha válida al final. Desempate: n.º catálogo desc., `id_catalogo` desc.
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function compararEjemplarPdfMachoPrimeroMasAdultoPrimero(a, b) {
  const sa = pesoSexoEjemplarFila(a)
  const sb = pesoSexoEjemplarFila(b)
  if (sa !== sb) return sa - sb

  const fa = valorFechaNacimientoOrdenMasAdultoPrimero(a)
  const fb = valorFechaNacimientoOrdenMasAdultoPrimero(b)
  if (fa !== fb) return fa - fb

  const na = a?.numero != null && a.numero !== '' ? Number(a.numero) : NaN
  const nb = b?.numero != null && b.numero !== '' ? Number(b.numero) : NaN
  const va = Number.isFinite(na) ? na : -Infinity
  const vb = Number.isFinite(nb) ? nb : -Infinity
  if (vb !== va) return vb - va

  const ia = Number(a?.id_catalogo) || 0
  const ib = Number(b?.id_catalogo) || 0
  return ib - ia
}

/** @param {Record<string, unknown>} row @returns {number} 0 macho, 1 hembra, 2 otro */
function pesoSexoEjemplarFila(row) {
  const s = String(row?.sexo ?? '').trim().toUpperCase()
  if (s === 'MACHO' || s === 'M') return 0
  if (s === 'HEMBRA' || s === 'H') return 1
  return 2
}

/**
 * Valor numérico para orden ascendente: menor = más adulto. Sin fecha válida → +∞ (al final).
 * @param {Record<string, unknown>} row
 */
function valorFechaNacimientoOrdenMasAdultoPrimero(row) {
  const fn = row?.fecha_nacimiento
  if (fn == null || String(fn).trim() === '') return Number.POSITIVE_INFINITY
  const raw = String(fn).trim().slice(0, 10)
  const d = dayjs(raw)
  if (!d.isValid()) return Number.POSITIVE_INFINITY
  return d.valueOf()
}

/**
 * Ejemplar: mayor n.º de catálogo primero; empate por id_catalogo descendente.
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function compararEjemplarNumeroCatalogoDesc(a, b) {
  const na = a?.numero != null && a.numero !== '' ? Number(a.numero) : NaN
  const nb = b?.numero != null && b.numero !== '' ? Number(b.numero) : NaN
  const va = Number.isFinite(na) ? na : -Infinity
  const vb = Number.isFinite(nb) ? nb : -Infinity
  if (vb !== va) return vb - va
  const ia = Number(a?.id_catalogo) || 0
  const ib = Number(b?.id_catalogo) || 0
  return ib - ia
}

/**
 * Línea de listado del GET detalle (listado formal): nombre, registro, federación, sexo;
 * nac., padre/madre, N/I, microchip, propietario si vienen en la fila.
 * Si `incluirPrefijoNumeroCatalogo` es false (p. ej. exposición abierta), no antepone `n.º.` al nombre.
 * @param {Record<string, unknown>} row
 * @param {{ incluirPrefijoNumeroCatalogo?: boolean }} [opts]
 */
export function lineaEjemplarCatalogoPdfPorDefecto(row, opts = {}) {
  const sep = ' - '
  const incluirNro = opts.incluirPrefijoNumeroCatalogo !== false
  const nro = row?.numero != null && row.numero !== '' ? String(row.numero).trim() : ''
  const nom = String(row?.nombre_completo ?? '').trim()
  const reg = String(row?.registro ?? '').trim()
  const sexFull = String(row?.sexo ?? '').trim()
  const sex =
    sexFull === 'HEMBRA'
      ? 'H'
      : sexFull === 'MACHO'
        ? 'M'
        : (sexFull.slice(0, 1) || '').toUpperCase()
  const fed = String(row?.codigo_pais_federacion ?? row?.codigo_pais ?? '').trim()
  const ni = String(row?.nacional_importado ?? '').trim().toUpperCase()
  const niShort = ni === 'I' || ni === 'N' ? ni : ''

  const cabezal =
    incluirNro && nro && nom ? `${nro} ${nom}` : nom ? nom : incluirNro && nro ? nro : ''

  /** @type {string[]} */
  const cuerpo = []
  if (reg) {
    cuerpo.push(fed ? `${fed} ${reg}` : reg)
  } else if (fed) {
    cuerpo.push(fed)
  }
  if (niShort) cuerpo.push(niShort)

  const fnac = row?.fecha_nacimiento
  if (fnac != null && String(fnac).trim() !== '') {
    const d = dayjs(String(fnac).trim())
    const nacTxt = d.isValid()
      ? `NAC: ${d.format('DD/MM/YY')}`
      : (() => {
          const s = String(fnac).trim()
          if (!s || s === '—') return ''
          return `NAC: ${s}`
        })()
    if (nacTxt) cuerpo.push(nacTxt)
  }

  if (sex) cuerpo.push(sex)

  const nomPad = String(row?.nombre_padre ?? '').trim()
  const nomMad = String(row?.nombre_madre ?? '').trim()
  if (nomPad || nomMad) {
    cuerpo.push(`POR: ${[nomPad, nomMad].filter(Boolean).join(' y ')}`)
  }

  const criador = String(row?.criador ?? '').trim()
  if (criador) cuerpo.push(`CR.: ${criador}`)

  const chip = String(row?.microchip ?? '').trim()
  if (chip) cuerpo.push(`CHIP: ${chip}`)

  const prop = String(row?.propietario ?? '').trim()
  if (prop) cuerpo.push(`EXP.: ${prop}`)

  if (!cabezal && cuerpo.length === 0) return ''
  if (cuerpo.length === 0) return cabezal
  return cabezal ? `${cabezal}${sep}${cuerpo.join(sep)}` : cuerpo.join(sep)
}

/**
 * @param {number | string} idRaza
 * @param {Map<number, CatalogoPdfRazaInfoLocal> | Record<string, CatalogoPdfRazaInfoLocal> | null | undefined} mapa
 */
function infoRazaParaId(idRaza, mapa) {
  if (!mapa) return undefined
  const n = Number(idRaza)
  if (mapa instanceof Map) {
    return mapa.get(Number.isFinite(n) ? n : 0)
  }
  const key = Number.isFinite(n) ? String(n) : String(idRaza)
  return mapa[key]
}

/**
 * Combina datos de raza desde el detalle (`raza_trayectoria`, `raza_funcion`, `raza_descripcion`) con `infoRazaPorIdRaza`.
 * Características del PDF = columna `descripcion` en BD.
 *
 * @param {Record<string, unknown> | null | undefined} filaMuestra
 * @param {number} idRaza
 * @param {{ infoRazaPorIdRaza?: Map<number, CatalogoPdfRazaInfoLocal> | Record<string, CatalogoPdfRazaInfoLocal> } | undefined} opciones
 */
function mergeInfoRazaPdf(filaMuestra, idRaza, opciones) {
  const fromMap = infoRazaParaId(idRaza, opciones?.infoRazaPorIdRaza) ?? {}
  /** @param {unknown} mapVal @param {unknown} dbVal */
  const pick = (mapVal, dbVal) => {
    const m =
      mapVal != null && String(mapVal).trim() !== '' ? String(mapVal).trim() : ''
    if (m) return m
    const d =
      dbVal != null && String(dbVal).trim() !== '' ? String(dbVal).trim() : ''
    return d || undefined
  }
  return {
    trayectoria: pick(
      fromMap.trayectoria ?? fromMap.procedencia,
      filaMuestra?.raza_trayectoria,
    ),
    funcion: pick(fromMap.funcion, filaMuestra?.raza_funcion),
    caracteristicas: pick(fromMap.caracteristicas, filaMuestra?.raza_descripcion),
  }
}

/**
 * @param {Map<string, { id_grupo: number, grupo_etiqueta: string, razas: Map<string, { id_raza: number, etiqueta_raza: string, categorias: Map<string, { id_categoria: number, categoria_etiqueta: string, filas: Record<string, unknown>[] }> }> }>} porGrupo
 * @param {Record<string, unknown>} row
 */
function insertarFilaEnPorGrupo(porGrupo, row) {
  const r = row && typeof row === 'object' ? row : {}
  const idG = Number(r.id_grupo)
  const gKey = Number.isFinite(idG) ? idG : 0
  const gLabel = String(r.grupo_etiqueta ?? 'Sin grupo').trim() || 'Sin grupo'
  const idR = Number(r.id_raza)
  const rKey = Number.isFinite(idR) ? idR : 0
  const rLabel = String(r.raza ?? '—').trim() || '—'
  const idC = Number(r.id_categoria)
  const cKey = Number.isFinite(idC) ? idC : 0
  const cLabel = String(r.categoria_etiqueta ?? '—').trim() || '—'

  const gk = String(gKey)
  if (!porGrupo.has(gk)) {
    porGrupo.set(gk, {
      id_grupo: gKey,
      grupo_etiqueta: gLabel,
      razas: new Map(),
    })
  }
  const gNode = porGrupo.get(gk)
  const rk = `raza-${rKey}-${rLabel}`
  if (!gNode.razas.has(rk)) {
    gNode.razas.set(rk, {
      id_raza: rKey,
      etiqueta_raza: rLabel,
      categorias: new Map(),
    })
  }
  const rNode = gNode.razas.get(rk)
  const ck = String(cKey)
  if (!rNode.categorias.has(ck)) {
    rNode.categorias.set(ck, {
      id_categoria: cKey,
      categoria_etiqueta: cLabel,
      filas: [],
    })
  }
  rNode.categorias.get(ck).filas.push(r)
}

/**
 * Ordena categorías según `idsOrden`; las no listadas quedan al final en orden de aparición.
 * @param {Map<string, { id_categoria: number, categoria_etiqueta: string, filas: Record<string, unknown>[] }>} categoriasMap
 * @param {number[]} idsOrden
 */
function categoriasEnOrdenPorIds(categoriasMap, idsOrden) {
  const ordenados = []
  const seen = new Set()
  for (const id of idsOrden) {
    const ck = String(id)
    if (categoriasMap.has(ck)) {
      ordenados.push(categoriasMap.get(ck))
      seen.add(ck)
    }
  }
  for (const [k, v] of categoriasMap) {
    if (!seen.has(k)) ordenados.push(v)
  }
  return ordenados
}

/**
 * Misma sucesión de filas que el PDF del catálogo (macro-sección → grupo → raza → categoría → ejemplares).
 * Incluye al final las filas que no entraron en ninguna sección (p. ej. `id_categoria` inválido), por `id_catalogo`.
 *
 * @param {Record<string, unknown>[]} filas
 * @returns {Record<string, unknown>[]}
 */
export function filasDetalleEnOrdenCatalogoPdf(filas) {
  const arr = Array.isArray(filas) ? filas : []
  const todosIdsAsignados = new Set(
    PDF_MACRO_SECCIONES_CATALOGO.flatMap((s) => s.idsOrden),
  )
  /** @type {Record<string, unknown>[]} */
  const out = []

  /**
   * @param {Record<string, unknown>[]} filasSubset
   * @param {number[]} idsOrdenCategorias
   * @param {boolean} ordenOrdinalFallback
   */
  function recolectar(filasSubset, idsOrdenCategorias, ordenOrdinalFallback) {
    const porGrupo = new Map()
    for (const row of filasSubset) {
      insertarFilaEnPorGrupo(porGrupo, row)
    }
    const gruposOrdenados = [...porGrupo.values()].sort(compararGrupoResumen)
    for (const g of gruposOrdenados) {
      const razasArr = [...g.razas.values()].sort(compararRazaAlfabetico)
      for (const rz of razasArr) {
        const catsArr = ordenOrdinalFallback
          ? [...rz.categorias.values()].sort(compararCategoriaPorOrdinalEnNombre)
          : categoriasEnOrdenPorIds(rz.categorias, idsOrdenCategorias)
        for (const c of catsArr) {
          const ordenadas = [...c.filas].sort(compararEjemplarPdfMachoPrimeroMasAdultoPrimero)
          for (const fila of ordenadas) {
            out.push(fila)
          }
        }
      }
    }
  }

  for (const sec of PDF_MACRO_SECCIONES_CATALOGO) {
    const permitidos = new Set(sec.idsOrden)
    const filasSec = arr.filter((row) => {
      const id = Number(row.id_categoria)
      return Number.isFinite(id) && permitidos.has(id)
    })
    if (filasSec.length === 0) continue
    recolectar(filasSec, sec.idsOrden, false)
  }

  const filasOtros = arr.filter((row) => {
    const id = Number(row.id_categoria)
    return Number.isFinite(id) && !todosIdsAsignados.has(id)
  })
  if (filasOtros.length > 0) {
    recolectar(filasOtros, [], true)
  }

  const seen = new Set(
    out.map((r) => Number(r.id_catalogo)).filter((n) => Number.isFinite(n)),
  )
  const rest = arr.filter((r) => {
    const idc = Number(r.id_catalogo)
    return Number.isFinite(idc) && !seen.has(idc)
  })
  rest.sort((a, b) => (Number(a.id_catalogo) || 0) - (Number(b.id_catalogo) || 0))
  out.push(...rest)

  return out
}

/**
 * Convierte filas del detalle de catálogo en páginas PDF (una hoja **por macro-sección**:
 * ADULTOS, JÓVENES, VETERANOS, CACHORROS, CACHORROS ESPECIALES; al final **OTRAS CATEGORÍAS** si hay ids fuera de lista).
 *
 * @param {Record<string, unknown>[]} filas
 * @param {{
 *   tituloPrincipal?: string,
 *   incluirPrefijoNumeroCatalogoEjemplar?: boolean,
 *   infoRazaPorIdRaza?: Map<number, CatalogoPdfRazaInfoLocal> | Record<string, CatalogoPdfRazaInfoLocal>,
 *   lineaEjemplar?: (row: Record<string, unknown>) => string,
 * }} [opciones] `incluirPrefijoNumeroCatalogoEjemplar: false` omite n.º en ejemplar (torneo abierto).
 * @returns {import('./exportCatalogoPdf.js').CatalogoPdfPagina[]}
 */
export function filasDetalleAPaginasPdf(filas, opciones = {}) {
  const tituloPrincipal = String(opciones.tituloPrincipal ?? '').trim()
  const incluirPrefijoNumero =
    opciones.incluirPrefijoNumeroCatalogoEjemplar !== false
  const lineaEjemplarCustom = opciones.lineaEjemplar
  const lineaEjemplar =
    lineaEjemplarCustom != null
      ? lineaEjemplarCustom
      : (fila) =>
          lineaEjemplarCatalogoPdfPorDefecto(fila, {
            incluirPrefijoNumeroCatalogo: incluirPrefijoNumero,
          })
  const arr = Array.isArray(filas) ? filas : []

  const todosIdsAsignados = new Set(
    PDF_MACRO_SECCIONES_CATALOGO.flatMap((s) => s.idsOrden),
  )

  /** @type {import('./exportCatalogoPdf.js').CatalogoPdfPagina[]} */
  const paginas = []
  let nPag = 0

  /**
   * @param {Record<string, unknown>[]} filasSubset
   * @param {number[]} idsOrdenCategorias
   * @param {boolean} ordenOrdinalFallback
   * @returns {import('./exportCatalogoPdf.js').CatalogoPdfBloqueGrupo[]}
   */
  function bloquesGrupoRazasDesdeFilas(
    filasSubset,
    idsOrdenCategorias,
    ordenOrdinalFallback,
  ) {
    const porGrupo = new Map()
    for (const row of filasSubset) {
      insertarFilaEnPorGrupo(porGrupo, row)
    }
    const gruposOrdenados = [...porGrupo.values()].sort(compararGrupoResumen)
    /** @type {import('./exportCatalogoPdf.js').CatalogoPdfBloqueGrupo[]} */
    const bloquesGrupo = []

    for (const g of gruposOrdenados) {
      const razasArr = [...g.razas.values()].sort(compararRazaAlfabetico)
      /** @type {import('./exportCatalogoPdf.js').CatalogoPdfSeccionRaza[]} */
      const seccionesGrupo = []

      for (const rz of razasArr) {
        const catsArr = ordenOrdinalFallback
          ? [...rz.categorias.values()].sort(compararCategoriaPorOrdinalEnNombre)
          : categoriasEnOrdenPorIds(rz.categorias, idsOrdenCategorias)

        /** @type {import('./exportCatalogoPdf.js').CatalogoPdfCategoriaBloque[]} */
        const categorias = []
        for (const c of catsArr) {
          const ordenadas = [...c.filas].sort(compararEjemplarPdfMachoPrimeroMasAdultoPrimero)
          const lineas = ordenadas
            .map((fila) => lineaEjemplar(fila))
            .filter((s) => String(s).trim() !== '')
          const etiqueta = c.categoria_etiqueta
            ? `CATEGORIA: ${c.categoria_etiqueta}`
            : 'CATEGORIA: —'
          categorias.push({ etiqueta, lineas })
        }

        const filaMuestra =
          catsArr.length > 0 && catsArr[0].filas.length > 0
            ? catsArr[0].filas[0]
            : undefined
        const info = mergeInfoRazaPdf(filaMuestra, rz.id_raza, opciones)

        seccionesGrupo.push({
          nombreRaza: rz.etiqueta_raza,
          info,
          categorias,
        })
      }

      if (seccionesGrupo.length > 0) {
        bloquesGrupo.push({
          tituloGrupo: tituloGrupoFciParaPdf(g),
          secciones: seccionesGrupo,
        })
      }
    }
    return bloquesGrupo
  }

  for (const sec of PDF_MACRO_SECCIONES_CATALOGO) {
    const permitidos = new Set(sec.idsOrden)
    const filasSec = arr.filter((row) => {
      const id = Number(row.id_categoria)
      return Number.isFinite(id) && permitidos.has(id)
    })
    if (filasSec.length === 0) continue

    const grupos = bloquesGrupoRazasDesdeFilas(filasSec, sec.idsOrden, false)
    if (grupos.length === 0) continue

    nPag += 1
    paginas.push({
      titulo: tituloPrincipal,
      subtitulo: sec.titulo,
      grupos,
      numeroPagina: nPag,
    })
  }

  const filasOtros = arr.filter((row) => {
    const id = Number(row.id_categoria)
    return Number.isFinite(id) && !todosIdsAsignados.has(id)
  })
  if (filasOtros.length > 0) {
    const grupos = bloquesGrupoRazasDesdeFilas(filasOtros, [], true)
    if (grupos.length > 0) {
      nPag += 1
      paginas.push({
        titulo: tituloPrincipal,
        subtitulo: 'OTRAS CATEGORÍAS',
        grupos,
        numeroPagina: nPag,
      })
    }
  }

  return paginas
}
