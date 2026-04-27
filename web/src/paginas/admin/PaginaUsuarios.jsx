import { useCallback, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  listarCategoriasUsuarios,
  listarUsuarios,
  obtenerUsuarioPorId,
} from '../../apiConnect.jsx'
import { BusquedaSelectTipo } from '../../componentes/comun/BusquedaSelectTipo.jsx'
import { clubesSortedByName } from '../../utilidades/mapClubesApi.js'
import '../catalogo/PaginaInicio.css'
import './PaginaUsuarios.css'

/** En seed `007`: categoría 1 = administrador. */
const ID_CATEGORIA_SUPERADMIN = 1

/**
 * @param {unknown} rows
 * @returns {Record<string, unknown>[]}
 */
function asUsuarioRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => (r && typeof r === 'object' ? /** @type {Record<string, unknown>} */ (r) : {}))
}

function nombreCompletoFila(u) {
  const n = String(u.nombre ?? '').trim()
  const a = String(u.apellido ?? '').trim()
  const t = [n, a].filter(Boolean).join(' ').trim()
  return t || '—'
}

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   isEdit: boolean,
 *   initial: { nombre: string, apellido: string, usuario: string, clave: string, id_club: string },
 *   clubes: { id_club: number, club: string }[],
 *   onClose: () => void,
 *   onSubmit: (f: { nombre: string, apellido: string, usuario: string, clave: string, id_club: string }) => Promise<void>,
 * }} p
 */
function ModalUsuario({ open, title, isEdit, initial, clubes, onClose, onSubmit }) {
  const errId = useId()
  const [form, setForm] = useState(initial)
  const [textoClub, setTextoClub] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (open) {
      setForm(initial)
      setErr(null)
      setSaving(false)
      const id = String(initial.id_club ?? '').trim()
      if (id) {
        const c = clubes.find((x) => String(x.id_club) === id)
        setTextoClub(c ? String(c.club) : '')
      } else {
        setTextoClub('')
      }
    }
  }, [open, initial, clubes])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (!isEdit && !form.clave.trim()) {
      setErr('La clave es obligatoria.')
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
      onClose()
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo guardar.'
      setErr(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="admin-user-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-user-modal"
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 className="admin-user-modal__title">{title}</h2>
        <form className="admin-user-modal__form" onSubmit={handleSubmit} noValidate>
          {err ? (
            <p id={errId} className="admin-user-modal__err" role="alert">
              {err}
            </p>
          ) : null}
          <div className="admin-user-modal__field">
            <span className="admin-user-modal__label">Nombre</span>
            <input
              className="admin-user-modal__input"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              maxLength={30}
              autoComplete="given-name"
              required
            />
          </div>
          <div className="admin-user-modal__field">
            <span className="admin-user-modal__label">Apellido</span>
            <input
              className="admin-user-modal__input"
              value={form.apellido}
              onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              maxLength={30}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="admin-user-modal__field">
            <span className="admin-user-modal__label">Usuario</span>
            <input
              className="admin-user-modal__input"
              value={form.usuario}
              onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
              maxLength={20}
              autoComplete="off"
              required
            />
          </div>
          <div className="admin-user-modal__field">
            <span className="admin-user-modal__label">Contraseña</span>
            <input
              className={`admin-user-modal__input${isEdit ? ' admin-user-modal__input--clave-visible' : ''}`}
              type={isEdit ? 'text' : 'password'}
              value={form.clave}
              onChange={(e) => setForm((f) => ({ ...f, clave: e.target.value }))}
              autoComplete={isEdit ? 'off' : 'new-password'}
              required={!isEdit}
            />
          </div>
          <div className="admin-user-modal__field">
            <span className="admin-user-modal__label">Club</span>
            <BusquedaSelectTipo
              items={clubes}
              getId={(c) => /** @type {{ id_club: number }} */ (c).id_club}
              getLabel={(c) => String(/** @type {{ club: string }} */ (c).club ?? '')}
              valueId={form.id_club}
              inputText={textoClub}
              onValueIdChange={(id) => setForm((f) => ({ ...f, id_club: id }))}
              onInputTextChange={setTextoClub}
              aria-label="Club; escribir para buscar, Tab completa con la primera coincidencia"
              placeholder="Buscar club; vaciar para sin club"
              className="admin-user-modal__input"
              scopeSelector=".admin-user-modal__form"
              disabled={saving}
            />
          </div>
          <div className="admin-user-modal__footer">
            <button
              type="button"
              className="session-home__btn session-home__btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="session-home__btn session-home__btn--primary"
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   session: { id_usuario: number, role: string, usuario?: string, username?: string },
 *   clubes: unknown,
 * }} props
 */
export function PaginaUsuarios({ session, clubes }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [loadState, setLoadState] = useState(/** @type {'idle'|'loading'|'ok'|'err'} */ ('idle'))
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null))
  const [idCategoriaNormal, setIdCategoriaNormal] = useState(/** @type {number | null} */ (null))
  const [idCatError, setIdCatError] = useState(/** @type {string | null} */ (null))

  const [modal, setModal] = useState(/** @type {'add' | 'edit' | null} */ (null))
  const [editId, setEditId] = useState(/** @type {number | null} */ (null))
  const [modalInitial, setModalInitial] = useState(() => ({
    nombre: '',
    apellido: '',
    usuario: '',
    clave: '',
    id_club: '',
  }))
  /** Clave tal como vino del servidor al abrir edición (para no reenviarla si no cambió). */
  const [claveOriginalEdicion, setClaveOriginalEdicion] = useState(
    /** @type {string | null} */ (null),
  )

  const clubesOpts = clubesSortedByName(clubes)

  const recargar = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      const data = await listarUsuarios({ incluir_clave: false })
      setRows(asUsuarioRows(data))
      setLoadState('ok')
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo cargar la lista.'
      setLoadError(msg)
      setLoadState('err')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void recargar()
    }, 0)
    return () => window.clearTimeout(t)
  }, [recargar])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await listarCategoriasUsuarios()
        const list = Array.isArray(raw) ? raw : []
        const noAdmin = list.find(
          (c) => c && typeof c === 'object' && Number(/** @type {{ id_categoria?: unknown }} */ (c).id_categoria) !== ID_CATEGORIA_SUPERADMIN,
        )
        const id = noAdmin
          ? Number(/** @type {{ id_categoria?: unknown }} */ (noAdmin).id_categoria)
          : null
        if (cancelled) return
        if (id != null && Number.isFinite(id)) {
          setIdCategoriaNormal(id)
          setIdCatError(null)
        } else {
          setIdCategoriaNormal(null)
          setIdCatError('No hay categoría de usuario normal en el sistema (distinta de administrador).')
        }
      } catch {
        if (!cancelled) {
          setIdCategoriaNormal(null)
          setIdCatError('No se pudieron cargar las categorías de usuario.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function openAdd() {
    if (idCategoriaNormal == null) return
    setEditId(null)
    setModalInitial({
      nombre: '',
      apellido: '',
      usuario: '',
      clave: '',
      id_club: '',
    })
    setModal('add')
  }

  async function openEdit(u) {
    const id = Number(u.id_usuario)
    if (!Number.isFinite(id)) return
    try {
      const raw = await obtenerUsuarioPorId(id, { incluir_clave: true })
      const row =
        raw && typeof raw === 'object'
          ? /** @type {Record<string, unknown>} */ (raw)
          : u
      const claveStr = String(row.clave ?? '')
      setEditId(id)
      setClaveOriginalEdicion(claveStr)
      setModalInitial({
        nombre: String(row.nombre ?? ''),
        apellido: String(row.apellido ?? ''),
        usuario: String(row.usuario ?? ''),
        clave: claveStr,
        id_club: row.id_club != null && row.id_club !== '' ? String(row.id_club) : '',
      })
      setModal('edit')
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo cargar el usuario.'
      window.alert(msg)
    }
  }

  function closeModal() {
    setModal(null)
    setEditId(null)
    setClaveOriginalEdicion(null)
  }

  /**
   * @param {{ nombre: string, apellido: string, usuario: string, clave: string, id_club: string }} f
   */
  async function submitModal(f) {
    const idClub = f.id_club.trim() === '' ? null : Number(f.id_club)
    if (modal === 'add') {
      if (idCategoriaNormal == null) throw new Error('Falta categoría de usuario.')
      await crearUsuario({
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        usuario: f.usuario.trim(),
        clave: f.clave,
        id_categoria: idCategoriaNormal,
        id_club: idClub != null && Number.isFinite(idClub) ? idClub : null,
      })
    } else if (modal === 'edit' && editId != null) {
      /** @type {Record<string, unknown>} */
      const body = {
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        usuario: f.usuario.trim(),
        id_club: idClub != null && Number.isFinite(idClub) ? idClub : null,
      }
      const orig = (claveOriginalEdicion ?? '').trim()
      const nueva = f.clave.trim()
      if (nueva !== '' && nueva !== orig) {
        body.clave = f.clave
      }
      await actualizarUsuario(editId, body)
    }
    await recargar()
  }

  /**
   * @param {Record<string, unknown>} u
   */
  function handleEliminar(u) {
    const id = Number(u.id_usuario)
    if (!Number.isFinite(id)) return
    if (Number.isFinite(Number(session.id_usuario)) && id === session.id_usuario) {
      window.alert('No podés eliminar tu propio usuario.')
      return
    }
    const label = nombreCompletoFila(u)
    if (!window.confirm(`¿Dar de baja a ${label}?`)) return
    void (async () => {
      try {
        await eliminarUsuario(id)
        await recargar()
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo eliminar.'
        window.alert(msg)
      }
    })()
  }

  return (
    <div className="session-home admin-usuarios">
      <div className="admin-usuarios__bar">
        <button
          type="button"
          className="admin-usuarios__back"
          onClick={() => navigate('/admin')}
        >
          ← Volver al panel
        </button>
      </div>

      <div className="admin-usuarios__section">
        <div
          className="session-home__table-section"
          style={{ border: 'none', padding: 0, boxShadow: 'none' }}
        >
          <div
            className="session-home__table-title"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px 12px',
            }}
          >
            <span>Usuarios</span>
            <button
              type="button"
              className="session-home__btn session-home__btn--primary"
              onClick={openAdd}
              disabled={idCategoriaNormal == null || idCatError != null}
            >
              Agregar usuario
            </button>
          </div>
          {idCatError ? <p className="admin-usuarios__error">{idCatError}</p> : null}
          {loadState === 'loading' ? (
            <p className="admin-usuarios__hint" aria-live="polite">
              Cargando…
            </p>
          ) : loadState === 'err' && loadError ? (
            <p className="admin-usuarios__error" role="alert">
              {loadError}
            </p>
          ) : (
            <div className="session-home__table-wrap">
              <table className="session-home__table">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Usuario</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="session-home__empty">
                        No hay usuarios para listar.
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => {
                      const idC = Number(u.id_categoria)
                      const isAdmin = idC === ID_CATEGORIA_SUPERADMIN
                      const idU = Number(u.id_usuario)
                      const isSelf =
                        Number.isFinite(Number(session.id_usuario)) &&
                        Number.isFinite(idU) &&
                        idU === session.id_usuario
                      return (
                        <tr key={String(u.id_usuario ?? '')}>
                          <td>{nombreCompletoFila(u)}</td>
                          <td>{String(u.usuario ?? '—')}</td>
                          <td>
                            {isSelf ? (
                              <div className="admin-usuarios__actions">
                                <button
                                  type="button"
                                  className="session-home__btn session-home__btn--secondary admin-usuarios__btn--small"
                                  onClick={() => void openEdit(u)}
                                >
                                  Editar
                                </button>
                              </div>
                            ) : isAdmin ? (
                              <span className="admin-usuarios__hint" title="Cuenta de administrador">
                                —
                              </span>
                            ) : (
                              <div className="admin-usuarios__actions">
                                <button
                                  type="button"
                                  className="session-home__btn session-home__btn--secondary admin-usuarios__btn--small"
                                  onClick={() => void openEdit(u)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="session-home__btn session-home__btn--secondary admin-usuarios__btn--small"
                                  onClick={() => handleEliminar(u)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalUsuario
        open={modal != null}
        title={modal === 'add' ? 'Nuevo usuario' : 'Editar usuario'}
        isEdit={modal === 'edit'}
        initial={modalInitial}
        clubes={clubesOpts}
        onClose={closeModal}
        onSubmit={submitModal}
      />
    </div>
  )
}
