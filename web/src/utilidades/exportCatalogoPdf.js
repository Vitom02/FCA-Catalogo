/**
 * HTML + estilos para exportar el catálogo a PDF (estructura alineada al resumen por grupo/raza/categoría).
 * La composición de datos (textos de filas, orden, paginado) se completa con las reglas de negocio.
 */

import catalogoPdfCss from './catalogoPdf.css?raw'
import { filasDetalleAPaginasPdf } from './catalogoPdfLogica.js'

export {
  ordinalDesdeEtiquetaCategoria,
  pesoSexoCategoriaParaOrden,
  compararGrupoResumen,
  compararRazaAlfabetico,
  compararCategoriaPorOrdinalEnNombre,
  compararEjemplarNumeroCatalogoDesc,
  lineaEjemplarCatalogoPdfPorDefecto,
  filasDetalleAPaginasPdf,
  enteroARomano,
  PDF_MACRO_SECCIONES_CATALOGO,
  compararEjemplarPdfMachoPrimeroMasAdultoPrimero,
  filasDetalleEnOrdenCatalogoPdf,
} from './catalogoPdfLogica.js'

/**
 * @typedef {{ trayectoria?: string, funcion?: string, caracteristicas?: string }} CatalogoPdfRazaInfo
 * `trayectoria`: país de la raza (`raza_trayectoria` en el detalle, desde `web.razas.id_pais` → `web.paises`).
 */

/**
 * @typedef {{ etiqueta: string, lineas: string[] }} CatalogoPdfCategoriaBloque
 */

/**
 * @typedef {{ nombreRaza: string, info?: CatalogoPdfRazaInfo, categorias: CatalogoPdfCategoriaBloque[] }} CatalogoPdfSeccionRaza
 */

/**
 * @typedef {{ tituloGrupo: string, secciones: CatalogoPdfSeccionRaza[] }} CatalogoPdfBloqueGrupo
 * Bloque por grupo FCI dentro de una macro-sección (ADULTOS, …).
 */

/**
 * @typedef {{
 *   titulo: string,
 *   subtitulo: string,
 *   grupos: CatalogoPdfBloqueGrupo[],
 *   secciones?: CatalogoPdfSeccionRaza[],
 *   numeroPagina?: number | string,
 * }} CatalogoPdfPagina
 * Si faltan `grupos`, se usa `secciones` como una sola agrupación sin título de grupo (compat).
 */

export function getCatalogoPdfStyles() {
  return catalogoPdfCss
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Texto de país / trayectoria: primera letra de cada palabra en mayúscula, resto en minúsculas
 * (evita el aspecto «gritado» cuando en BD viene en mayúsculas).
 * @param {unknown} raw
 */
function formatoTituloTrayectoria(raw) {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  return t
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      return word
        .split('-')
        .map((part) =>
          part ? part.charAt(0).toLocaleUpperCase('es') + part.slice(1) : part,
        )
        .join('-')
    })
    .join(' ')
}

/**
 * @param {{ label: string, texto: string, valorTitulo?: boolean }} p
 * Si `valorTitulo` es true (Trayectoria), el valor se normaliza a tipo título (p. ej. «Gran Bretaña»), no todo en mayúsculas.
 */
function bloqueInfo(p) {
  const textoRaw = String(p.texto ?? '').trim()
  if (!textoRaw) return ''
  const texto = p.valorTitulo ? formatoTituloTrayectoria(textoRaw) : textoRaw
  const valueClass =
    'pdf-info-value' + (p.valorTitulo ? ' pdf-info-value--trayectoria' : '')
  return `<div class="pdf-info-row"><span class="pdf-label">${escapeHtml(p.label)}</span><span class="${valueClass}">${escapeHtml(texto)}</span></div>`
}

/**
 * Una línea de ejemplar: índice opcional (n.º cat.) + cuerpo monoespaciado (modelo impreso).
 * @param {string} rawLine
 */
function resaltarNumeroInicioLinea(rawLine) {
  const t = String(rawLine ?? '').trim()
  if (!t) return ''
  /** Estilo catálogo RCC: «1 NOMBRE …» o «1. NOMBRE …» */
  const m = t.match(/^(\d+)(?:\.\s+|\s+)(.*)$/s)
  if (m) {
    return `<div class="pdf-entry"><span class="pdf-entry-index">${escapeHtml(m[1])}</span><span class="pdf-entry-body">${escapeHtml(m[2])}</span></div>`
  }
  return `<div class="pdf-entry"><span class="pdf-entry-index"></span><span class="pdf-entry-body">${escapeHtml(t)}</span></div>`
}

/**
 * @param {CatalogoPdfSeccionRaza} seccion
 * @param {boolean} esPrimera
 */
function htmlSeccionRaza(seccion, esPrimera) {
  const nombre = String(seccion.nombreRaza ?? '').trim() || '—'
  const info = seccion.info ?? {}
  const categorias = Array.isArray(seccion.categorias) ? seccion.categorias : []

  const attrSeccion = esPrimera ? '' : ' class="pdf-section"'

  const partesCategorias = categorias.map((cat) => {
    const etiqueta = String(cat.etiqueta ?? '').trim()
    const lineas = Array.isArray(cat.lineas) ? cat.lineas : []
    const items = lineas
      .map((linea) => {
        const t = String(linea ?? '').trim()
        return t ? resaltarNumeroInicioLinea(t) : ''
      })
      .filter(Boolean)
      .join('')
    if (!etiqueta && !items) return ''
    const tituloCat = etiqueta
      ? `<h3 class="pdf-category">${escapeHtml(etiqueta)}</h3>`
      : ''
    const lista = items ? `<div class="pdf-entries">${items}</div>` : ''
    return tituloCat + lista
  })

  return `
<section${attrSeccion}>
  <div class="pdf-breed-block">
    <div class="pdf-breed">RAZA: ${escapeHtml(nombre)}</div>
    <div class="pdf-raza-datos">
      ${bloqueInfo({ label: 'Trayectoria:', texto: info.trayectoria ?? '', valorTitulo: true })}
      ${bloqueInfo({ label: 'Función:', texto: info.funcion ?? '' })}
      ${bloqueInfo({ label: 'Características:', texto: info.caracteristicas ?? '' })}
    </div>
  </div>
  ${partesCategorias.join('\n')}
</section>`.trim()
}

/**
 * Una página del PDF (título, subtítulo, bloques por raza, pie opcional).
 * @param {CatalogoPdfPagina} pagina
 * @param {{ indice?: number, totalPaginas?: number }} [meta] Pie «-- n of total --» (bloques por grupo FCI).
 */
export function buildCatalogoPdfPaginaHtml(pagina, meta = {}) {
  const titulo = String(pagina.titulo ?? '').trim()
  const subtitulo = String(pagina.subtitulo ?? '').trim()
  const gruposIn = Array.isArray(pagina.grupos) ? pagina.grupos : []
  const grupos =
    gruposIn.length > 0
      ? gruposIn
      : [{ tituloGrupo: '', secciones: Array.isArray(pagina.secciones) ? pagina.secciones : [] }]
  const nPag = pagina.numeroPagina
  const total = meta.totalPaginas
  const indicePie = meta.indice ?? nPag

  const cuerpoTitulos = [
    titulo ? `<h1 class="pdf-title">${escapeHtml(titulo)}</h1>` : '',
    subtitulo ? `<h2 class="pdf-subtitle">${escapeHtml(subtitulo)}</h2>` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const partes = []
  let primeraSeccionGlobal = true
  for (const bloque of grupos) {
    const tituloGrupo = String(bloque?.tituloGrupo ?? '').trim()
    if (tituloGrupo) {
      partes.push(`<h3 class="pdf-group">${escapeHtml(tituloGrupo)}</h3>`)
    }
    const secciones = Array.isArray(bloque?.secciones) ? bloque.secciones : []
    for (const sec of secciones) {
      partes.push(htmlSeccionRaza(sec, primeraSeccionGlobal))
      primeraSeccionGlobal = false
    }
  }
  const cuerpoRazas = partes.join('\n')

  let pie = ''
  if (
    total != null &&
    Number.isFinite(Number(total)) &&
    Number(total) > 0 &&
    indicePie !== undefined &&
    indicePie !== null &&
    String(indicePie).trim() !== ''
  ) {
    const i = escapeHtml(String(indicePie))
    const t = escapeHtml(String(total))
    pie = `<div class="pdf-footer"><div class="pdf-footer__num">${i}</div><div class="pdf-footer__of">-- ${i} of ${t} --</div></div>`
  } else if (nPag !== undefined && nPag !== null && String(nPag).trim() !== '') {
    pie = `<div class="pdf-footer"><div class="pdf-footer__num">${escapeHtml(String(nPag))}</div></div>`
  }

  return `<div class="pdf-page">
<div class="pdf-container">
${cuerpoTitulos}
${cuerpoRazas}
</div>
${pie}
</div>`.trim()
}

/**
 * Documento completo listo para imprimir / vista previa / motor PDF (una o más páginas).
 * @param {{
 *   paginas: CatalogoPdfPagina[],
 *   tituloDocumento?: string,
 * }} opts
 */
export function buildCatalogoPdfDocumentoHtml(opts) {
  const paginas = Array.isArray(opts.paginas) ? opts.paginas : []
  const tituloDoc = String(opts.tituloDocumento ?? 'Catálogo').trim() || 'Catálogo'
  const total = paginas.length
  const cuerpo = paginas
    .map((p, i) => buildCatalogoPdfPaginaHtml(p, { indice: i + 1, totalPaginas: total }))
    .join('\n')
  const tituloDocJs = JSON.stringify(tituloDoc)

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(tituloDoc)}</title>
<style>
${catalogoPdfCss}
</style>
</head>
<body>
<div class="pdf-preview-toolbar pdf-no-print">
  <button type="button" class="pdf-preview-toolbar__btn" onclick="window.print()">Descargar PDF</button>
  <span class="pdf-preview-toolbar__hint"><strong>Hoja limpia al guardar PDF:</strong> en el cuadro de impresión desactivá <strong>Encabezados y pies de página</strong> (Chrome/Edge: «Más ajustes»; Firefox: desmarcá esas opciones). Así no se imprimen fecha, URL ni nombre del archivo arriba y abajo. Elegí <strong>Guardar como PDF</strong> o <strong>Microsoft Print to PDF</strong>.</span>
</div>
${cuerpo}
<script>
(function () {
  var tituloOriginal = null
  window.addEventListener('beforeprint', function () {
    if (tituloOriginal === null) tituloOriginal = document.title
    document.title = '\u200b'
  })
  window.addEventListener('afterprint', function () {
    if (tituloOriginal !== null) document.title = tituloOriginal
    else document.title = ${tituloDocJs}
  })
})()
</script>
</body>
</html>`
}

/**
 * HTML completo del PDF a partir de filas de `GET .../catalogos/exposicion/:id/detalle`.
 * @param {Record<string, unknown>[]} filasDetalle
 * @param {{
 *   tituloDocumento?: string,
 *   tituloPrincipal?: string,
 *   incluirPrefijoNumeroCatalogoEjemplar?: boolean,
 *   infoRazaPorIdRaza?: Map<number, { trayectoria?: string, funcion?: string, caracteristicas?: string }> | Record<string, { trayectoria?: string, funcion?: string, caracteristicas?: string }>,
 *   lineaEjemplar?: (row: Record<string, unknown>) => string,
 * }} [opciones] Si la exposición está abierta, pasar `incluirPrefijoNumeroCatalogoEjemplar: false` para no numerar líneas de ejemplares.
 */
export function buildDocumentoHtmlCatalogoDesdeFilasDetalle(filasDetalle, opciones = {}) {
  const paginas = filasDetalleAPaginasPdf(filasDetalle, opciones)
  const tituloDoc =
    String(opciones.tituloDocumento ?? opciones.tituloPrincipal ?? 'Catálogo').trim() ||
    'Catálogo'
  return buildCatalogoPdfDocumentoHtml({ paginas, tituloDocumento: tituloDoc })
}

/**
 * Abre una pestaña con el HTML del catálogo (útil para “Imprimir / Guardar como PDF” del navegador).
 * @param {string} htmlCompleto resultado de buildCatalogoPdfDocumentoHtml
 */
export function abrirVistaPreviaCatalogoPdf(htmlCompleto) {
  const blob = new Blob([htmlCompleto], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) {
    w.addEventListener('beforeunload', () => URL.revokeObjectURL(url))
  } else {
    URL.revokeObjectURL(url)
  }
}
