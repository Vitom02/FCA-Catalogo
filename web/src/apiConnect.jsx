/**
 * Conexión al backend Node (carpeta `/api` del repo).
 * Base por defecto: `http://localhost:3001`. Con `VITE_API_URL` vacío, las rutas `/api/...` van al mismo origen (útil con Nginx proxy).
 *
 * Uso en componentes:
 *   import { listarExposiciones, buscarEjemplares, listarCategoriasEjemplares } from './apiConnect.jsx'
 */

/** @type {string} */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
)

/** URL absoluta para fetch: mismo origen si `VITE_API_URL` está vacío (p. ej. Nginx + `/api`). */
function resolveApiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  if (API_BASE_URL) {
    return `${API_BASE_URL}${p}`
  }
  return new URL(p, window.location.origin).href
}

/**
 * @param {string} path Ruta absoluta desde la raíz del servidor, ej. `/api/exposiciones`
 * @param {Record<string, string | number | boolean | undefined | null>} [query]
 */
function urlConQuery(path, query) {
  const u = new URL(resolveApiUrl(path.startsWith('/') ? path : `/${path}`))
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        u.searchParams.set(k, String(v))
      }
    }
  }
  return u.toString()
}

/**
 * Error HTTP con cuerpo devuelto por la API (si existe).
 */
export class ApiError extends Error {
  /** @param {string} message @param {{ status: number, body?: unknown }} init */
  constructor(message, { status, body }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, query?: Record<string, string | number | boolean | undefined | null> }} [opts]
 */
async function request(method, path, opts = {}) {
  const { body, query } = opts
  const url = query
    ? urlConQuery(path, query)
    : resolveApiUrl(path.startsWith('/') ? path : `/${path}`)

  /** @type {RequestInit} */
  const init = {
    method,
    headers: { Accept: 'application/json' },
  }
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    }
    init.body = JSON.stringify(body)
  }

  const res = await fetch(url, init)
  const text = await res.text()
  /** @type {unknown} */
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String(/** @type {{ error?: string }} */ (data).error)
        : res.statusText
    throw new ApiError(msg || `HTTP ${res.status}`, { status: res.status, body: data })
  }
  return data
}

// ─── CLUBES ──────────────────────────────────────────────────────────────────

/** Todas las filas de `web.clubes` (`SELECT *`). */
export function listarClubes() {
  return request('GET', '/api/clubes')
}

// ─── EXPOSICIONES ─────────────────────────────────────────────────────────────

/** Lista todas las exposiciones (con nombre de club). */
export function listarExposiciones() {
  return request('GET', '/api/exposiciones')
}

/** Solo exposiciones con fecha de inicio ≥ hoy. */
export function listarExposicionesProximas() {
  return request('GET', '/api/exposiciones/proximas')
}

/** Filtra por `id_club`. */
export function listarExposicionesPorClub(idClub) {
  return request(
    'GET',
    `/api/exposiciones/club/${encodeURIComponent(String(idClub))}`,
  )
}

/** Una exposición por `id_exposicion`. */
export function obtenerExposicionPorId(id) {
  return request('GET', `/api/exposiciones/${encodeURIComponent(String(id))}`)
}

/** Alta (body según validación del backend). */
export function crearExposicion(payload) {
  return request('POST', '/api/exposiciones', { body: payload })
}

/** Actualización. */
export function actualizarExposicion(id, payload) {
  return request('PUT', `/api/exposiciones/${encodeURIComponent(String(id))}`, {
    body: payload,
  })
}

/** Baja. */
export function eliminarExposicion(id) {
  return request('DELETE', `/api/exposiciones/${encodeURIComponent(String(id))}`)
}

// ─── CATÁLOGOS (inscripciones ejemplar ↔ exposición) ─────────────────────────

/**
 * Conteo de inscriptos por `id_exposicion`.
 * @returns {Promise<{ id_exposicion: number, total: number }[]>}
 */
export function listarCatalogosConteosPorExposicion() {
  return request('GET', '/api/catalogos/conteos')
}

/**
 * Inscripciones con datos de ejemplar, categoría y usuario.
 * @param {number | string} idExposicion
 */
export function listarCatalogosPorExposicionDetalle(idExposicion) {
  return request(
    'GET',
    `/api/catalogos/exposicion/${encodeURIComponent(String(idExposicion))}/detalle`,
  )
}

/**
 * @param {{
 *   id_exposicion: number,
 *   id_ejemplar: number,
 *   id_categoria: number,
 *   id_usuario: number,
 *   numero?: number | null,
 *   fecha_insc?: string | null,
 * }} payload
 */
export function crearCatalogo(payload) {
  return request('POST', '/api/catalogos', { body: payload })
}

/**
 * @param {number | string} idCatalogo
 * @param {Record<string, unknown>} payload
 */
export function actualizarCatalogo(idCatalogo, payload) {
  return request('PUT', `/api/catalogos/${encodeURIComponent(String(idCatalogo))}`, {
    body: payload,
  })
}

export function eliminarCatalogo(idCatalogo) {
  return request('DELETE', `/api/catalogos/${encodeURIComponent(String(idCatalogo))}`)
}

// ─── EJEMPLARES ───────────────────────────────────────────────────────────────

/**
 * Listado para selects; cada fila incluye `etiqueta` (texto armado en el servidor).
 * @returns {Promise<{ datos: { id_federacion: number, etiqueta?: string }[] }>}
 */
export function listarFederacionesEjemplares() {
  return request('GET', '/api/ejemplares/federaciones')
}

/**
 * @returns {Promise<{ datos: { id_raza: number, codigo_raza: string, raza: string, etiqueta?: string }[] }>}
 */
export function listarRazasEjemplares() {
  return request('GET', '/api/ejemplares/razas')
}

/**
 * Categorías de exposición para combos de inscripción (`web.exposiciones_categorias`).
 * @returns {Promise<{ datos: Record<string, unknown>[] }>}
 */
export function listarCategoriasEjemplares() {
  return request('GET', '/api/ejemplares/categorias')
}

/**
 * Búsqueda con filtros (al menos uno: id_raza, id_federacion, registro, nombre).
 * FCA = `id_federacion` 1: registro numérico local; otras: `registro_origen`.
 *
 * @param {{
 *   id_raza?: string | number,
 *   id_federacion?: string | number,
 *   registro?: string | number,
 *   nombre?: string,
 *   limit?: string | number,
 *   offset?: string | number,
 * }} params
 * @returns {Promise<{ datos: unknown[], limit: number, offset: number }>}
 */
export function buscarEjemplares(params) {
  return request('GET', '/api/ejemplares', { query: params })
}

/** Detalle por `id_ejemplar`. */
export function obtenerEjemplarPorId(id) {
  return request('GET', `/api/ejemplares/${encodeURIComponent(String(id))}`)
}

/** URL base actual (por si necesitás log o debug). Vacío = mismo origen que la web. */
export function getApiBaseUrl() {
  return API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
}

// ─── AUTENTICACIÓN ───────────────────────────────────────────────────────────

/**
 * Login contra `POST /api/auth/login`.
 * Body: `{ usuario, clave }` (también acepta `username` / `password`).
 * @param {{ usuario: string, clave: string }} payload
 */
export function loginUsuario(payload) {
  return request('POST', '/api/auth/login', { body: payload })
}
