/**
 * Orden y agrupación del catálogo para PDF: misma jerarquía que el resumen
 * (grupo → raza alfabética → categoría por n.º de clase **descendente** y sexo en empate → ejemplares por n.º catálogo descendente).
 *
 * Los textos de raza para PDF vienen de `web.razas`: **función** = `funcion`, **características** = `descripcion`
 * (expuestos en el detalle como `raza_funcion`, `raza_descripcion`). `infoRazaPorIdRaza` sigue pudiendo sobreescribir.
 */

import { formatTableDate } from './dateDisplay.js'

/** @typedef {{ procedencia?: string, funcion?: string, caracteristicas?: string }} CatalogoPdfRazaInfoLocal */

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

/** Subtítulo de página PDF: `Grupo I`, `Grupo II`, … o `Sin grupo`. */
function subtituloGrupoPdf(idGrupo) {
  const id = Number(idGrupo)
  if (!Number.isFinite(id) || id <= 0) return "Sin grupo"
  const rom = enteroARomano(id)
  return rom ? `Grupo ${rom}` : "Sin grupo"
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
  const sex = String(row?.sexo ?? '').trim()
  const fed = String(row?.codigo_pais ?? '').trim()
  const ini = incluirNro && nro ? `${nro}. ` : ''
  const nombrePart = nom ? `${ini}${nom}` : (ini || '—')
  const core = [reg ? `REG. ${reg}` : '', fed, sex].filter(Boolean)
  /** @type {string[]} */
  const tail = []
  const fnac = row?.fecha_nacimiento
  if (fnac != null && String(fnac).trim() !== '') {
    const fd = formatTableDate(fnac)
    if (fd !== '—') tail.push(`NAC: ${fd}`)
  }
  const nomPad = String(row?.nombre_padre ?? '').trim()
  const nomMad = String(row?.nombre_madre ?? '').trim()
  if (nomPad || nomMad) {
    const por = [nomPad, nomMad].filter(Boolean).join(' / ')
    tail.push(`POR: ${por}`)
  }
  const ni = String(row?.nacional_importado ?? '').trim().toUpperCase()
  if (ni === 'I' || ni === 'N') tail.push(`N/I: ${ni}`)
  const chip = String(row?.microchip ?? '').trim()
  if (chip) tail.push(`CHIP: ${chip}`)
  const prop = String(row?.propietario ?? '').trim()
  if (prop) tail.push(`EXP.: ${prop}`)
  const mid = core.length ? core.join(sep) : ''
  let line = mid ? `${nombrePart}${sep}${mid}` : nombrePart
  if (tail.length) line += sep + tail.join(sep)
  return line
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
 * Combina datos de raza desde el detalle (`raza_funcion`, `raza_descripcion`) con `infoRazaPorIdRaza`.
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
    procedencia: pick(fromMap.procedencia, undefined),
    funcion: pick(fromMap.funcion, filaMuestra?.raza_funcion),
    caracteristicas: pick(fromMap.caracteristicas, filaMuestra?.raza_descripcion),
  }
}

/**
 * Convierte filas del detalle de catálogo en páginas PDF (una página por grupo FCI).
 *
 * @param {Record<string, unknown>[]} filas
 * @param {{
 *   tituloPrincipal?: string,
 *   incluirPrefijoNumeroCatalogoEjemplar?: boolean,
 *   infoRazaPorIdRaza?: Map<number, CatalogoPdfRazaInfoLocal> | Record<string, CatalogoPdfRazaInfoLocal>,
 *   lineaEjemplar?: (row: Record<string, unknown>) => string,
 * }} [opciones] Sin `tituloPrincipal` la hoja arranca en «GRUPO …». `incluirPrefijoNumeroCatalogoEjemplar: false` omite n.º en ejemplar (torneo abierto).
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

  /** @type {Map<string, { id_grupo: number, grupo_etiqueta: string, razas: Map<string, { id_raza: number, etiqueta_raza: string, categorias: Map<string, { id_categoria: number, categoria_etiqueta: string, filas: Record<string, unknown>[] }> }> }>} */
  const porGrupo = new Map()

  for (const row of arr) {
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

  const gruposOrdenados = [...porGrupo.values()].sort(compararGrupoResumen)

  /** @type {import('./exportCatalogoPdf.js').CatalogoPdfPagina[]} */
  const paginas = []
  let nPag = 0

  for (const g of gruposOrdenados) {
    const razasArr = [...g.razas.values()].sort(compararRazaAlfabetico)

    /** @type {import('./exportCatalogoPdf.js').CatalogoPdfSeccionRaza[]} */
    const secciones = []

    for (const rz of razasArr) {
      const catsArr = [...rz.categorias.values()].sort(compararCategoriaPorOrdinalEnNombre)

      /** @type {import('./exportCatalogoPdf.js').CatalogoPdfCategoriaBloque[]} */
      const categorias = []
      for (const c of catsArr) {
        const ordenadas = [...c.filas].sort(compararEjemplarNumeroCatalogoDesc)
        const lineas = ordenadas.map((fila) => lineaEjemplar(fila)).filter((s) => String(s).trim() !== '')
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

      secciones.push({
        nombreRaza: rz.etiqueta_raza,
        info,
        categorias,
      })
    }

    nPag += 1
    paginas.push({
      titulo: tituloPrincipal,
      subtitulo: subtituloGrupoPdf(g.id_grupo),
      secciones,
      numeroPagina: nPag,
    })
  }

  return paginas
}
