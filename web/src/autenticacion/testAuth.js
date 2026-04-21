import { ApiError, loginUsuario } from '../apiConnect.jsx'

const SESSION_KEY = 'kennel_session'

/**
 * @typedef {{
 *   username: string,
 *   usuario: string,
 *   role: 'superadmin' | 'user',
 *   kennelId: string | null,
 *   id_usuario: number,
 *   id_club: number | null,
 *   id_categoria: number,
 *   categoria_nombre?: string | null,
 *   nombre?: string,
 *   apellido?: string,
 * }} Session
 */

/** @param {unknown} v @returns {number | null} */
function toNullableClubId(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Session | null}
 */
function sessionFromLogin(data) {
  if (!data || typeof data !== 'object') return null
  const u = data.usuario
  const role = data.role
  if (typeof u !== 'string' || typeof role !== 'string') return null
  if (role !== 'superadmin' && role !== 'user') return null
  const idUsuario = Number(data.id_usuario)
  if (!Number.isFinite(idUsuario) || idUsuario <= 0) return null

  const username = typeof data.username === 'string' ? data.username : u
  const kennelId =
    role === 'superadmin'
      ? null
      : typeof data.kennelId === 'string'
        ? data.kennelId
        : data.id_club != null
          ? String(data.id_club)
          : null

  const idCat = Number(data.id_categoria)
  if (!Number.isFinite(idCat)) return null

  return {
    username,
    usuario: u,
    role,
    kennelId,
    id_usuario: idUsuario,
    id_club: toNullableClubId(data.id_club),
    id_categoria: idCat,
    categoria_nombre:
      typeof data.categoria_nombre === 'string' ? data.categoria_nombre : null,
    nombre: typeof data.nombre === 'string' ? data.nombre : undefined,
    apellido: typeof data.apellido === 'string' ? data.apellido : undefined,
  }
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Session | null>}
 */
export async function authenticate(username, password) {
  try {
    const data = await loginUsuario({
      usuario: username.trim(),
      clave: password,
    })
    return sessionFromLogin(
      data && typeof data === 'object'
        ? /** @type {Record<string, unknown>} */ (data)
        : {},
    )
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

/**
 * @param {unknown} data
 * @returns {Session | null}
 */
function normalizeStoredSession(data) {
  if (!data || typeof data !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (data)
  const usuario = typeof o.usuario === 'string' ? o.usuario : null
  const username =
    typeof o.username === 'string' ? o.username : usuario
  if (!username || typeof o.role !== 'string') return null
  if (o.role !== 'superadmin' && o.role !== 'user') return null
  const idUsuario = Number(o.id_usuario)
  if (!Number.isFinite(idUsuario) || idUsuario <= 0) return null

  const idCat = Number(o.id_categoria)
  if (!Number.isFinite(idCat)) return null

  if (o.role === 'superadmin') {
    return {
      username,
      usuario: usuario ?? username,
      role: 'superadmin',
      kennelId: null,
      id_usuario: idUsuario,
      id_club: toNullableClubId(o.id_club),
      id_categoria: idCat,
      categoria_nombre:
        typeof o.categoria_nombre === 'string' ? o.categoria_nombre : null,
      nombre: typeof o.nombre === 'string' ? o.nombre : undefined,
      apellido: typeof o.apellido === 'string' ? o.apellido : undefined,
    }
  }

  const kennelId =
    typeof o.kennelId === 'string'
      ? o.kennelId
      : o.id_club != null && o.id_club !== ''
        ? String(o.id_club)
        : null

  return {
    username,
    usuario: usuario ?? username,
    role: 'user',
    kennelId,
    id_usuario: idUsuario,
    id_club: toNullableClubId(o.id_club),
    id_categoria: idCat,
    categoria_nombre:
      typeof o.categoria_nombre === 'string' ? o.categoria_nombre : null,
    nombre: typeof o.nombre === 'string' ? o.nombre : undefined,
    apellido: typeof o.apellido === 'string' ? o.apellido : undefined,
  }
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return normalizeStoredSession(data)
  } catch {
    return null
  }
}

/** @param {Session} session */
export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
