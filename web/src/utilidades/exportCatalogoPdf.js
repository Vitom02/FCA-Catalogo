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
} from './catalogoPdfLogica.js'

/**
 * @typedef {{ procedencia?: string, funcion?: string, caracteristicas?: string }} CatalogoPdfRazaInfo
 */

/**
 * @typedef {{ etiqueta: string, lineas: string[] }} CatalogoPdfCategoriaBloque
 */

/**
 * @typedef {{ nombreRaza: string, info?: CatalogoPdfRazaInfo, categorias: CatalogoPdfCategoriaBloque[] }} CatalogoPdfSeccionRaza
 */

/**
 * @typedef {{
 *   titulo: string,
 *   subtitulo: string,
 *   secciones: CatalogoPdfSeccionRaza[],
 *   numeroPagina?: number | string,
 * }} CatalogoPdfPagina
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
 * @param {{ label: string, texto: string }} p
 */
function bloqueInfo(p) {
  const texto = String(p.texto ?? '').trim()
  if (!texto) return ''
  return `<div class="pdf-info-row"><span class="pdf-label">${escapeHtml(p.label)}</span><span class="pdf-info-value">${escapeHtml(texto)}</span></div>`
}

/**
 * Una línea de ejemplar: índice opcional (n.º cat.) + cuerpo monoespaciado (modelo impreso).
 * @param {string} rawLine
 */
function htmlLineaEjemplar(rawLine) {
  const t = String(rawLine ?? '').trim()
  if (!t) return ''
  const m = t.match(/^(\d+)\.\s+(.*)$/s)
  if (m) {
    return `<li class="pdf-entry"><span class="pdf-entry-index" aria-hidden="true">${escapeHtml(m[1])}</span><span class="pdf-entry-body">${escapeHtml(m[2])}</span></li>`
  }
  return `<li class="pdf-entry"><span class="pdf-entry-index" aria-hidden="true"></span><span class="pdf-entry-body">${escapeHtml(t)}</span></li>`
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
        return t ? htmlLineaEjemplar(t) : ''
      })
      .filter(Boolean)
      .join('')
    if (!etiqueta && !items) return ''
    const tituloCat = etiqueta
      ? `<h3 class="pdf-category">${escapeHtml(etiqueta)}</h3>`
      : ''
    const lista = items ? `<ul class="pdf-list">${items}</ul>` : ''
    return tituloCat + lista
  })

  return `
<section${attrSeccion}>
  <div class="pdf-breed">RAZA: ${escapeHtml(nombre)}</div>
  ${bloqueInfo({ label: 'Procedencia:', texto: info.procedencia ?? '' })}
  ${bloqueInfo({ label: 'Función:', texto: info.funcion ?? '' })}
  ${bloqueInfo({ label: 'Características:', texto: info.caracteristicas ?? '' })}
  ${partesCategorias.join('\n')}
</section>`.trim()
}

/**
 * Una página del PDF (título, subtítulo, bloques por raza, pie opcional).
 * @param {CatalogoPdfPagina} pagina
 */
export function buildCatalogoPdfPaginaHtml(pagina) {
  const titulo = String(pagina.titulo ?? '').trim()
  const subtitulo = String(pagina.subtitulo ?? '').trim()
  const secciones = Array.isArray(pagina.secciones) ? pagina.secciones : []
  const nPag = pagina.numeroPagina

  const cuerpoTitulos = [
    titulo ? `<h1 class="pdf-title">${escapeHtml(titulo)}</h1>` : '',
    subtitulo ? `<h2 class="pdf-subtitle">${escapeHtml(subtitulo)}</h2>` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const cuerpoRazas = secciones
    .map((sec, i) => htmlSeccionRaza(sec, i === 0))
    .join('\n')

  const pie =
    nPag !== undefined && nPag !== null && String(nPag).trim() !== ''
      ? `<div class="pdf-footer">${escapeHtml(String(nPag))}</div>`
      : ''

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
  const cuerpo = paginas.map(buildCatalogoPdfPaginaHtml).join('\n')
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
 *   infoRazaPorIdRaza?: Map<number, { procedencia?: string, funcion?: string, caracteristicas?: string }> | Record<string, { procedencia?: string, funcion?: string, caracteristicas?: string }>,
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
