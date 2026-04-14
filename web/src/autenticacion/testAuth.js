const SESSION_KEY = 'kennel_session'

/** Usuarios solo para desarrollo / demo (sin backend). */
const TEST_USERS = [
  {
    username: 'user',
    password: '1234',
    role: 'user',
    /** Kennel (perrera) al que pertenece; solo ve exposiciones de ese kennel. */
    kennelId: 'club-fca-norte',
  },
  {
    username: 'superadmin',
    password: 'superadmin1234',
    role: 'superadmin',
    kennelId: null,
  },
]

function sessionFromUser(found) {
  return {
    username: found.username,
    role: found.role,
    kennelId: found.kennelId ?? null,
  }
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {{ username: string, role: string, kennelId: string | null } | null}
 */
export function authenticate(username, password) {
  const u = username.trim().toLowerCase()
  const p = password
  const found = TEST_USERS.find(
    (t) => t.username === u && t.password === p,
  )
  if (!found) return null
  return sessionFromUser(found)
}

/**
 * @param {{ username?: string, role?: string, kennelId?: string | null, clubId?: string | null }} data
 * @returns {{ username: string, role: string, kennelId: string | null } | null}
 */
function normalizeStoredSession(data) {
  if (!data || typeof data.username !== 'string' || typeof data.role !== 'string') {
    return null
  }
  const fromTable = TEST_USERS.find((t) => t.username === data.username)
  const legacyKennelId =
    typeof data.kennelId === 'string'
      ? data.kennelId
      : typeof data.clubId === 'string'
        ? data.clubId
        : null

  if (data.role === 'superadmin') {
    return { username: data.username, role: 'superadmin', kennelId: null }
  }
  if (data.role === 'user') {
    const kennelId = legacyKennelId ?? fromTable?.kennelId ?? null
    return { username: data.username, role: 'user', kennelId }
  }
  return {
    username: data.username,
    role: data.role,
    kennelId: legacyKennelId ?? fromTable?.kennelId ?? null,
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

/** @param {{ username: string, role: string, kennelId: string | null }} session */
export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
