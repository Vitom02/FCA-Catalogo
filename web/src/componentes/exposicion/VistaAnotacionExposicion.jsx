import { useEffect, useId, useMemo, useState } from 'react'
import {
  ApiError,
  buscarEjemplares,
  listarCategoriasEjemplares,
  listarFederacionesEjemplares,
  listarRazasEjemplares,
} from '../../apiConnect.jsx'
import { ENROLLMENT_TABLE_COLUMNS } from '../../datos/specimens.js'
import { formatExhibitionDateRange, formatTableDate } from '../../utilidades/dateDisplay.js'
import {
  etiquetaInscripcionCategoria,
  filtrarCategoriasElegibles,
} from '../../utilidades/categoriaExposicion.js'
import { mesesCompletosHastaReferencia } from '../../utilidades/edadEjemplar.js'
import { idCategoriaFromEtiqueta } from '../../utilidades/mapCatalogoApi.js'
import {
  ejemplarBusquedaApiToEnrollment,
  normalizeSexoEjemplarApi,
} from '../../utilidades/mapEjemplarApi.js'
import './vistaAnotacionExposicion.css'

const COLUMN_LABELS = {
  'id ejemplar': 'ID ejemplar',
  nombre: 'Nombre',
  sexo: 'Sexo',
  federacion: 'Cod. federación',
  categoria: 'Categoría',
  raza: 'Cod. raza',
  ordinal: 'Ordinal',
  registro: 'Registro',
  usuario: 'Usuario',
}

const READONLY_COLS = new Set([
  'id ejemplar',
  'sexo',
  'ordinal',
  'registro',
  'usuario',
])

function IconPencil() {
  return (
    <svg
      className="enrollment-modal__action-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.768z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg
      className="enrollment-modal__action-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * @param {{
 *   exhibition: import('../../datos/exhibitionsTable.js').ExhibitionRow,
 *   session: { username: string, role: string, kennelId: string | null },
 *   enrollments: Record<string, string>[],
 *   onBack: () => void,
 *   onAddEnrollment: (entry: Record<string, string>) => void,
 *   onUpdateEnrollment: (index: number, entry: Record<string, string>) => void,
 *   onRemoveEnrollment: (index: number) => void,
 *   catalogosCargando?: boolean,
 *   catalogosError?: string | null,
 * }} props
 */
export function VistaAnotacionExposicion({
  exhibition,
  session,
  enrollments,
  onBack,
  onAddEnrollment,
  onUpdateEnrollment,
  onRemoveEnrollment,
  catalogosCargando = false,
  catalogosError = null,
}) {
  const titleId = useId()
  const modalNombreTitleId = useId()
  const tarjetaCategoriaErrorId = useId()
  const tarjetaEjemplarTitleId = useId()
  const [idFederacion, setIdFederacion] = useState('')
  const [idRaza, setIdRaza] = useState('')
  const [registroBusqueda, setRegistroBusqueda] = useState('')
  const [federaciones, setFederaciones] = useState(
    /** @type {{ id_federacion: number, etiqueta?: string | null, federacion?: string, codigo_pais?: string | null }[]} */ (
      []
    ),
  )
  const [razas, setRazas] = useState(
    /** @type {{ id_raza: number, codigo_raza?: string, raza?: string, etiqueta?: string | null }[]} */ ([]),
  )
  const [categoriasApi, setCategoriasApi] = useState(
    /** @type {Record<string, unknown>[]} */ ([]),
  )
  const [catalogoError, setCatalogoError] = useState(/** @type {string | null} */ (null))
  const [catalogoCargando, setCatalogoCargando] = useState(true)
  const [haBuscado, setHaBuscado] = useState(false)
  const [resultadosApi, setResultadosApi] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [busquedaLoading, setBusquedaLoading] = useState(false)
  const [busquedaError, setBusquedaError] = useState(/** @type {string | null} */ (null))
  const [categoriaSeleccionTarjeta, setCategoriaSeleccionTarjeta] = useState('')
  const [categoriaTarjetaError, setCategoriaTarjetaError] = useState(
    /** @type {string | null} */ (null),
  )
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  const [nombreModalOpen, setNombreModalOpen] = useState(false)
  const [nmSexo, setNmSexo] = useState('')
  const [nmFed, setNmFed] = useState('')
  const [nmRaza, setNmRaza] = useState('')
  const [nmNombre, setNmNombre] = useState('')
  const [nmResultadosApi, setNmResultadosApi] = useState(
    /** @type {Record<string, unknown>[]} */ ([]),
  )
  const [nmBusquedaLoading, setNmBusquedaLoading] = useState(false)
  const [nmBusquedaError, setNmBusquedaError] = useState(/** @type {string | null} */ (null))
  const [tarjetaEjemplar, setTarjetaEjemplar] = useState(
    /** @type {{ row: Record<string, unknown>, origin: 'busqueda' | 'nombre' } | null} */ (null),
  )

  const categoriasElegiblesTarjeta = useMemo(() => {
    if (!tarjetaEjemplar) return []
    const tr = tarjetaEjemplar.row
    const meses = mesesCompletosHastaReferencia(
      tr.fecha_nacimiento,
      exhibition['Fecha inicio'],
    )
    return filtrarCategoriasElegibles(categoriasApi, meses, tr)
  }, [tarjetaEjemplar, categoriasApi, exhibition])

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((e) => String(e['id ejemplar'] ?? ''))),
    [enrollments],
  )

  const nmModalCriterios = useMemo(() => {
    const base =
      (nmSexo === 'Macho' || nmSexo === 'Hembra') &&
      nmFed.trim() !== '' &&
      nmRaza.trim() !== ''
    const nom = nmNombre.trim().length > 0
    return { base, nom }
  }, [nmSexo, nmFed, nmRaza, nmNombre])

  useEffect(() => {
    if (!tarjetaEjemplar) {
      setCategoriaSeleccionTarjeta('')
      setCategoriaTarjetaError(null)
      return
    }
    setCategoriaTarjetaError(null)
    if (categoriasElegiblesTarjeta.length === 1) {
      const lab = etiquetaInscripcionCategoria(
        /** @type {Record<string, unknown>} */ (categoriasElegiblesTarjeta[0]),
      )
      setCategoriaSeleccionTarjeta(lab || '')
    } else {
      setCategoriaSeleccionTarjeta('')
    }
  }, [tarjetaEjemplar, categoriasElegiblesTarjeta])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCatalogoError(null)
      setCatalogoCargando(true)
      try {
        const [fedRes, razRes, catRes] = await Promise.all([
          listarFederacionesEjemplares(),
          listarRazasEjemplares(),
          listarCategoriasEjemplares(),
        ])
        if (cancelled) return
        const fd =
          fedRes && typeof fedRes === 'object' && 'datos' in fedRes && Array.isArray(fedRes.datos)
            ? fedRes.datos
            : []
        const rz =
          razRes && typeof razRes === 'object' && 'datos' in razRes && Array.isArray(razRes.datos)
            ? razRes.datos
            : []
        const cat =
          catRes && typeof catRes === 'object' && 'datos' in catRes && Array.isArray(catRes.datos)
            ? catRes.datos
            : []
        setFederaciones(fd)
        setRazas(rz)
        setCategoriasApi(cat)
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar federaciones, razas ni categorías.'
          setCatalogoError(msg)
          setFederaciones([])
          setRazas([])
          setCategoriasApi([])
        }
      } finally {
        if (!cancelled) setCatalogoCargando(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function resetModalNombre() {
    setNmSexo('')
    setNmFed('')
    setNmRaza('')
    setNmNombre('')
    setNmResultadosApi([])
    setNmBusquedaLoading(false)
    setNmBusquedaError(null)
  }

  function openModalNombre() {
    resetModalNombre()
    setNombreModalOpen(true)
  }

  function closeModalNombre() {
    setNombreModalOpen(false)
    resetModalNombre()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (tarjetaEjemplar) {
        setTarjetaEjemplar(null)
        return
      }
      if (nombreModalOpen) closeModalNombre()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nombreModalOpen, tarjetaEjemplar])

  /** Búsqueda por nombre en vivo: federación, raza y texto de nombre (mientras escribe). */
  useEffect(() => {
    if (!nombreModalOpen) return
    const sexoOk = nmSexo === 'Macho' || nmSexo === 'Hembra'
    const fed = nmFed.trim()
    const raz = nmRaza.trim()
    const nom = nmNombre.trim()

    if (!sexoOk || !fed || !raz || !nom) {
      setNmResultadosApi([])
      setNmBusquedaError(null)
      setNmBusquedaLoading(false)
      return
    }

    let cancelled = false
    const delayMs = 380
    const tid = setTimeout(() => {
      ;(async () => {
        setNmBusquedaLoading(true)
        setNmBusquedaError(null)
        try {
          const res = await buscarEjemplares({
            limit: 100,
            id_federacion: fed,
            id_raza: raz,
            nombre: nom,
          })
          if (cancelled) return
          const raw =
            res && typeof res === 'object' && 'datos' in res && Array.isArray(res.datos)
              ? res.datos
              : []
          const filtrados = raw.filter(
            (row) => normalizeSexoEjemplarApi(row.sexo) === nmSexo,
          )
          setNmResultadosApi(filtrados)
        } catch (err) {
          if (cancelled) return
          const msg =
            err instanceof ApiError ? err.message : 'No se pudo buscar ejemplares.'
          setNmBusquedaError(msg)
          setNmResultadosApi([])
        } finally {
          if (!cancelled) setNmBusquedaLoading(false)
        }
      })()
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(tid)
    }
  }, [nombreModalOpen, nmSexo, nmFed, nmRaza, nmNombre])

  /**
   * @param {Record<string, unknown>} row
   */
  function abrirTarjetaDesdeNombreModal(row) {
    const idStr = String(row.id_ejemplar ?? '')
    if (!idStr || enrolledIds.has(idStr)) return
    setTarjetaEjemplar({ row, origin: 'nombre' })
  }

  function confirmarTarjetaInscripcion() {
    if (!tarjetaEjemplar) return
    const { row, origin } = tarjetaEjemplar
    const idStr = String(row.id_ejemplar ?? '')
    if (!idStr || enrolledIds.has(idStr)) {
      setTarjetaEjemplar(null)
      return
    }
    const categoria = categoriaSeleccionTarjeta.trim()
    if (!categoria) {
      setCategoriaTarjetaError('Seleccioná una categoría.')
      return
    }
    const valida = categoriasElegiblesTarjeta.some(
      (raw) =>
        etiquetaInscripcionCategoria(/** @type {Record<string, unknown>} */ (raw)) ===
        categoria,
    )
    if (!valida) {
      setCategoriaTarjetaError('Elegí una categoría válida para este ejemplar.')
      return
    }
    setCategoriaTarjetaError(null)
    const idCat = idCategoriaFromEtiqueta(categoriasApi, categoria)
    if (idCat == null) {
      setCategoriaTarjetaError('No se pudo resolver el id de categoría.')
      return
    }
    onAddEnrollment(
      ejemplarBusquedaApiToEnrollment(row, {
        ordinal: enrollments.length + 1,
        categoria,
        username: session.username,
        id_categoria: idCat,
      }),
    )
    setTarjetaEjemplar(null)
    if (origin === 'nombre') closeModalNombre()
  }

  async function handleBuscarEjemplaresApi(e) {
    e.preventDefault()
    const fed = idFederacion.trim()
    const raz = idRaza.trim()
    const reg = registroBusqueda.trim()
    if (!fed || !raz || !reg) {
      setBusquedaError(
        'Indicá federación, raza y número de registro (los tres datos son obligatorios).',
      )
      setResultadosApi([])
      setTarjetaEjemplar(null)
      setHaBuscado(true)
      return
    }
    setBusquedaError(null)
    setResultadosApi([])
    setTarjetaEjemplar(null)
    setBusquedaLoading(true)
    setHaBuscado(true)
    try {
      /** @type {Record<string, string | number>} */
      const params = {
        limit: 100,
        id_federacion: fed,
        id_raza: raz,
        registro: reg,
      }
      const res = await buscarEjemplares(params)
      const datos =
        res && typeof res === 'object' && 'datos' in res && Array.isArray(res.datos)
          ? res.datos
          : []
      setResultadosApi(datos)
      if (datos.length > 0) {
        setTarjetaEjemplar({
          row: /** @type {Record<string, unknown>} */ (datos[0]),
          origin: 'busqueda',
        })
      } else {
        setTarjetaEjemplar(null)
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo buscar ejemplares.'
      setBusquedaError(msg)
      setResultadosApi([])
      setTarjetaEjemplar(null)
    } finally {
      setBusquedaLoading(false)
    }
  }

  const fechaRango = formatExhibitionDateRange(
    exhibition['Fecha inicio'],
    exhibition['Fecha fin'],
  )

  /**
   * @param {Record<string, unknown>} row
   */
  function handleAnotarDesdeApi(row) {
    const idStr = String(row.id_ejemplar ?? '')
    if (!idStr || enrolledIds.has(idStr)) return
    setTarjetaEjemplar({ row, origin: 'busqueda' })
  }

  function handleIniciarEdicion(i) {
    setEditingIndex(i)
    setEditDraft({ ...enrollments[i] })
  }

  function handleGuardarEdicion() {
    if (editingIndex == null || !editDraft) return
    const idCat = idCategoriaFromEtiqueta(
      categoriasApi,
      String(editDraft.categoria ?? '').trim(),
    )
    onUpdateEnrollment(editingIndex, {
      ...editDraft,
      id_categoria: idCat ?? editDraft.id_categoria,
    })
    setEditingIndex(null)
    setEditDraft(null)
  }

  function handleCancelarEdicion() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  function handleEliminar(i) {
    const ok = window.confirm('¿Quitar este ejemplar de la anotación?')
    if (!ok) return
    onRemoveEnrollment(i)
    setEditingIndex(null)
    setEditDraft(null)
  }

  function renderTarjetaEjemplarOverlay() {
    if (!tarjetaEjemplar) return null
    const tr = tarjetaEjemplar.row
    const fechaRef = exhibition['Fecha inicio']
    const meses = mesesCompletosHastaReferencia(tr.fecha_nacimiento, fechaRef)
    const edadTxt =
      meses === null ? '—' : meses === 1 ? '1 mes' : `${meses} meses`
    const sinEdad = meses === null
    const sinCategorias =
      !sinEdad && categoriasElegiblesTarjeta.length === 0

    return (
      <div
        className="anotacion-tarjeta-overlay"
        role="presentation"
        onClick={() => setTarjetaEjemplar(null)}
      >
        <div
          className="anotacion-tarjeta-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={tarjetaEjemplarTitleId}
          onClick={(ev) => ev.stopPropagation()}
        >
          <header className="anotacion-tarjeta-dialog__header">
            <h2 id={tarjetaEjemplarTitleId} className="anotacion-tarjeta-dialog__title">
              Datos del ejemplar
            </h2>
            <button
              type="button"
              className="anotacion-tarjeta-dialog__close"
              aria-label="Cerrar"
              onClick={() => setTarjetaEjemplar(null)}
            >
              ×
            </button>
          </header>
          <p className="anotacion-tarjeta-dialog__ref">
            Edad calculada al inicio de la exposición ({formatTableDate(fechaRef)}).
          </p>
          <div className="anotacion-tarjeta-card">
            <dl className="anotacion-tarjeta-card__dl">
              <div className="anotacion-tarjeta-card__row">
                <dt>Nombre</dt>
                <dd>{String(tr.nombre_completo ?? '—')}</dd>
              </div>
              <div className="anotacion-tarjeta-card__row">
                <dt>Sexo</dt>
                <dd>{normalizeSexoEjemplarApi(tr.sexo)}</dd>
              </div>
              <div className="anotacion-tarjeta-card__row">
                <dt>Raza</dt>
                <dd>{String(tr.raza ?? '—')}</dd>
              </div>
              <div className="anotacion-tarjeta-card__row">
                <dt>Fecha de nacimiento</dt>
                <dd>{formatTableDate(tr.fecha_nacimiento)}</dd>
              </div>
              <div className="anotacion-tarjeta-card__row">
                <dt>Edad</dt>
                <dd>{edadTxt}</dd>
              </div>
            </dl>
            <div className="anotacion-tarjeta-card__categoria">
              <label
                className={`enrollment-modal__field anotacion-tarjeta-card__categoria-label${categoriaTarjetaError ? ' enrollment-modal__field--error' : ''}`}
              >
                <span className="enrollment-modal__field-label">Categoría</span>
                <select
                  className="enrollment-modal__input enrollment-modal__select enrollment-modal__input--compact"
                  value={categoriaSeleccionTarjeta}
                  onChange={(e) => {
                    setCategoriaSeleccionTarjeta(e.target.value)
                    setCategoriaTarjetaError(null)
                  }}
                  disabled={sinEdad || categoriasElegiblesTarjeta.length === 0}
                  aria-invalid={categoriaTarjetaError ? true : undefined}
                  aria-describedby={
                    categoriaTarjetaError ? tarjetaCategoriaErrorId : undefined
                  }
                  aria-label="Categoría de inscripción"
                >
                  <option value="">
                    {sinEdad
                      ? 'Requiere fecha de nacimiento'
                      : categoriasElegiblesTarjeta.length === 0
                        ? 'Sin categorías para esta edad y sexo'
                        : 'Seleccionar categoría'}
                  </option>
                  {categoriasElegiblesTarjeta.map((raw) => {
                    const c = /** @type {Record<string, unknown>} */ (raw)
                    const lab = etiquetaInscripcionCategoria(c)
                    const k = c.id_categoria ?? lab
                    return (
                      <option key={String(k)} value={lab}>
                        {lab}
                      </option>
                    )
                  })}
                </select>
              </label>
              {sinEdad ? (
                <p className="anotacion-tarjeta-card__hint-warning">
                  Sin fecha de nacimiento no se puede determinar la categoría.
                </p>
              ) : sinCategorias ? (
                <p className="anotacion-tarjeta-card__hint-warning">
                  Ninguna categoría coincide con el sexo y la edad de este ejemplar.
                </p>
              ) : null}
              {categoriaTarjetaError ? (
                <p
                  id={tarjetaCategoriaErrorId}
                  className="enrollment-modal__field-error"
                  role="alert"
                >
                  {categoriaTarjetaError}
                </p>
              ) : null}
            </div>
          </div>
          <footer className="anotacion-tarjeta-dialog__footer">
            <button
              type="button"
              className="enrollment-modal__btn enrollment-modal__btn--secondary"
              onClick={() => setTarjetaEjemplar(null)}
            >
              Volver
            </button>
            <button
              type="button"
              className="enrollment-modal__btn enrollment-modal__btn--primary"
              disabled={sinEdad || categoriasElegiblesTarjeta.length === 0}
              onClick={confirmarTarjetaInscripcion}
            >
              Confirmar inscripción
            </button>
          </footer>
        </div>
      </div>
    )
  }

  const colCount = ENROLLMENT_TABLE_COLUMNS.length + 1

  return (
    <div className="anotacion-page" role="region" aria-labelledby={titleId}>
      <header className="enrollment-modal__header">
        <div>
          <h2 id={titleId} className="enrollment-modal__title">
            Anotación en exposición
          </h2>
          <p className="enrollment-modal__subtitle">
            N.º {exhibition['Número'] ?? '—'} · {exhibition['Descripción'] ?? '—'}
          </p>
          {fechaRango ? (
            <p className="enrollment-modal__subtitle-dates">{fechaRango}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="enrollment-modal__close"
          aria-label="Volver al listado"
          onClick={onBack}
        >
          ×
        </button>
      </header>

      <section className="enrollment-modal__section">
        <h3 className="enrollment-modal__section-title">Inscribir ejemplar</h3>
        {catalogoCargando ? (
          <p className="enrollment-modal__hint" aria-live="polite">
            Cargando federaciones, razas y categorías…
          </p>
        ) : null}
        {catalogoError ? (
          <p className="enrollment-modal__hint enrollment-modal__hint--error" role="alert">
            {catalogoError} Revisá que la API esté en marcha y las rutas{' '}
            <code>/api/ejemplares/federaciones</code>, <code>/api/ejemplares/razas</code> y{' '}
            <code>/api/ejemplares/categorias</code>.
          </p>
        ) : null}
        <form className="enrollment-modal__filters" onSubmit={handleBuscarEjemplaresApi}>
          <div className="enrollment-modal__filters-toolbar">
            <div className="enrollment-modal__filters-fields enrollment-modal__filters-fields--compact">
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Federación</span>
                <select
                  className="enrollment-modal__input enrollment-modal__select enrollment-modal__input--compact"
                  value={idFederacion}
                  onChange={(e) => setIdFederacion(e.target.value)}
                  required
                  aria-required
                  aria-label="Federación (obligatorio)"
                >
                  <option value="">Seleccionar federación</option>
                  {federaciones.map((f) => {
                    const lab =
                      f.etiqueta != null && String(f.etiqueta).trim() !== ''
                        ? String(f.etiqueta)
                        : [f.federacion, f.codigo_pais].filter(Boolean).join(' · ')
                    return (
                      <option key={f.id_federacion} value={String(f.id_federacion)}>
                        {lab}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Raza</span>
                <select
                  className="enrollment-modal__input enrollment-modal__select enrollment-modal__input--compact"
                  value={idRaza}
                  onChange={(e) => setIdRaza(e.target.value)}
                  required
                  aria-required
                  aria-label="Raza (obligatorio)"
                >
                  <option value="">Seleccionar raza</option>
                  {razas.map((r) => {
                    const lab =
                      r.etiqueta != null && String(r.etiqueta).trim() !== ''
                        ? String(r.etiqueta)
                        : r.raza
                          ? `${r.raza} (${r.codigo_raza ?? ''})`
                          : String(r.codigo_raza ?? '—')
                    return (
                      <option key={r.id_raza} value={String(r.id_raza)}>
                        {lab}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Registro</span>
                <input
                  className="enrollment-modal__input enrollment-modal__input--compact"
                  value={registroBusqueda}
                  onChange={(e) => setRegistroBusqueda(e.target.value)}
                  placeholder="N.º de registro"
                  autoComplete="off"
                  inputMode="numeric"
                  required
                  aria-required
                  aria-label="Número de registro (obligatorio)"
                />
              </label>
            </div>
            <div className="enrollment-modal__filters-toolbar-actions">
              <button
                type="submit"
                className="enrollment-modal__btn enrollment-modal__btn--primary"
                disabled={busquedaLoading}
                aria-busy={busquedaLoading}
              >
                {busquedaLoading ? 'Buscando…' : 'Buscar'}
              </button>
              <button
                type="button"
                className="enrollment-modal__btn enrollment-modal__btn--secondary"
                onClick={openModalNombre}
              >
                Anotar por nombre
              </button>
            </div>
          </div>
        </form>

        <div className="enrollment-modal__results">
          {!haBuscado ? (
            <p className="enrollment-modal__hint">
              Completá <strong>federación</strong>, <strong>raza</strong> y{' '}
              <strong>número de registro</strong> (los tres son obligatorios) y pulsá «Buscar».
              Si hay coincidencias, verás la tarjeta del ejemplar y podrás anotar con la categoría
              que corresponda.
            </p>
          ) : busquedaLoading ? (
            <p className="enrollment-modal__hint">Buscando…</p>
          ) : busquedaError ? (
            <p className="enrollment-modal__hint enrollment-modal__hint--error" role="alert">
              {busquedaError}
            </p>
          ) : resultadosApi.length === 0 ? (
            <p className="enrollment-modal__hint">No hay ejemplares con esos criterios.</p>
          ) : (
            <div className="enrollment-modal__resultados-con-categoria">
              <ul className="enrollment-modal__result-list">
                {resultadosApi.map((raw) => {
                  const row = /** @type {Record<string, unknown>} */ (raw)
                  const id = String(row.id_ejemplar ?? '')
                  const ya = enrolledIds.has(id)
                  const nom = String(row.nombre_completo ?? '—')
                  const fed = String(row.codigo_pais ?? '—')
                  const raz = String(row.raza ?? '—')
                  const reg = row.registro != null ? String(row.registro) : '—'
                  const sx = String(row.sexo ?? '—')
                  return (
                    <li key={id || nom} className="enrollment-modal__result-row">
                      <span className="enrollment-modal__result-meta">
                        <strong>{id}</strong> · {nom} · {fed} · {raz} · reg. {reg} · {sx}
                      </span>
                      <button
                        type="button"
                        className="enrollment-modal__btn enrollment-modal__btn--secondary"
                        disabled={ya}
                        onClick={() => handleAnotarDesdeApi(row)}
                      >
                        {ya ? 'Ya anotado' : 'Anotar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {nombreModalOpen ? (
        <div
          className="anotacion-nombre-overlay"
          role="presentation"
          onClick={closeModalNombre}
        >
          <div
            className="anotacion-nombre-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalNombreTitleId}
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="anotacion-nombre-dialog__header">
              <h2 id={modalNombreTitleId} className="anotacion-nombre-dialog__title">
                Anotar por nombre
              </h2>
              <button
                type="button"
                className="anotacion-nombre-dialog__close"
                aria-label="Cerrar"
                onClick={closeModalNombre}
              >
                ×
              </button>
            </header>

            <div
              className="anotacion-nombre-split"
              role="group"
              aria-label="Sexo del ejemplar"
            >
              <button
                type="button"
                className={`anotacion-nombre-split__half${nmSexo === 'Macho' ? ' is-selected' : ''}`}
                onClick={() => setNmSexo('Macho')}
              >
                <span className="anotacion-nombre-split__label">Macho</span>
              </button>
              <button
                type="button"
                className={`anotacion-nombre-split__half${nmSexo === 'Hembra' ? ' is-selected' : ''}`}
                onClick={() => setNmSexo('Hembra')}
              >
                <span className="anotacion-nombre-split__label">Hembra</span>
              </button>
            </div>

            <div className="anotacion-nombre-form">
              <p className="anotacion-nombre-form__live-hint">
                Elegí sexo, federación y raza; luego escribí parte del nombre: la tabla se actualiza
                sola mientras escribís. Tocá una fila para abrir la tarjeta e inscribir.
              </p>
              <div className="anotacion-nombre-form__row">
                <label className="enrollment-modal__field">
                  <span className="enrollment-modal__field-label">Federación</span>
                  <select
                    className="enrollment-modal__input enrollment-modal__select"
                    value={nmFed}
                    onChange={(e) => setNmFed(e.target.value)}
                    required
                    aria-required
                    aria-label="Federación (obligatorio)"
                  >
                    <option value="">Seleccionar federación</option>
                    {federaciones.map((f) => {
                      const lab =
                        f.etiqueta != null && String(f.etiqueta).trim() !== ''
                          ? String(f.etiqueta)
                          : [f.federacion, f.codigo_pais].filter(Boolean).join(' · ')
                      return (
                        <option key={f.id_federacion} value={String(f.id_federacion)}>
                          {lab}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label className="enrollment-modal__field">
                  <span className="enrollment-modal__field-label">Raza</span>
                  <select
                    className="enrollment-modal__input enrollment-modal__select"
                    value={nmRaza}
                    onChange={(e) => setNmRaza(e.target.value)}
                    required
                    aria-required
                    aria-label="Raza (obligatorio)"
                  >
                    <option value="">Seleccionar raza</option>
                    {razas.map((r) => {
                      const lab =
                        r.etiqueta != null && String(r.etiqueta).trim() !== ''
                          ? String(r.etiqueta)
                          : r.raza
                            ? `${r.raza} (${r.codigo_raza ?? ''})`
                            : String(r.codigo_raza ?? '—')
                      return (
                        <option key={r.id_raza} value={String(r.id_raza)}>
                          {lab}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label className="enrollment-modal__field anotacion-nombre-form__nombre">
                  <span className="enrollment-modal__field-label">Nombre</span>
                  <input
                    className="enrollment-modal__input"
                    value={nmNombre}
                    onChange={(e) => setNmNombre(e.target.value)}
                    placeholder="Filtrar mientras escribís…"
                    autoComplete="off"
                    aria-label="Parte del nombre para filtrar en vivo"
                  />
                </label>
              </div>
            </div>

            <div className="anotacion-nombre-table-wrap">
              <table className="session-home__table anotacion-nombre-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Federación</th>
                    <th scope="col">Raza</th>
                    <th scope="col">Registro</th>
                    <th scope="col">Sexo</th>
                  </tr>
                </thead>
                <tbody>
                  {!nmModalCriterios.base ? (
                    <tr>
                      <td colSpan={5} className="enrollment-modal__hint anotacion-nombre-table__empty">
                        Elegí sexo, federación y raza para habilitar la búsqueda por nombre.
                      </td>
                    </tr>
                  ) : !nmModalCriterios.nom ? (
                    <tr>
                      <td colSpan={5} className="enrollment-modal__hint anotacion-nombre-table__empty">
                        Escribí parte del nombre: la tabla se filtra mientras escribís.
                      </td>
                    </tr>
                  ) : nmBusquedaLoading ? (
                    <tr>
                      <td colSpan={5} className="enrollment-modal__hint anotacion-nombre-table__empty">
                        Buscando…
                      </td>
                    </tr>
                  ) : nmBusquedaError ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="enrollment-modal__hint anotacion-nombre-table__empty enrollment-modal__hint--error"
                      >
                        {nmBusquedaError}
                      </td>
                    </tr>
                  ) : nmResultadosApi.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="enrollment-modal__hint anotacion-nombre-table__empty">
                        No hay ejemplares con esos criterios.
                      </td>
                    </tr>
                  ) : (
                    nmResultadosApi.map((raw) => {
                      const row = /** @type {Record<string, unknown>} */ (raw)
                      const id = String(row.id_ejemplar ?? '')
                      const ya = enrolledIds.has(id)
                      const nom = String(row.nombre_completo ?? '—')
                      return (
                        <tr
                          key={id || nom}
                          tabIndex={ya ? -1 : 0}
                          role="button"
                          className={`anotacion-nombre-table__row${ya ? ' is-disabled' : ''}`}
                          onClick={(ev) => {
                            ev.stopPropagation()
                            if (!ya) abrirTarjetaDesdeNombreModal(row)
                          }}
                          onKeyDown={(ev) => {
                            if (ya) return
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault()
                              abrirTarjetaDesdeNombreModal(row)
                            }
                          }}
                        >
                          <td>{nom}</td>
                          <td>{String(row.codigo_pais ?? '—')}</td>
                          <td>{String(row.raza ?? '—')}</td>
                          <td>
                            {row.registro != null && row.registro !== ''
                              ? String(row.registro)
                              : '—'}
                          </td>
                          <td>{normalizeSexoEjemplarApi(row.sexo)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {renderTarjetaEjemplarOverlay()}

      <section className="enrollment-modal__section enrollment-modal__section--table">
        <h3 className="enrollment-modal__section-title">Ejemplares anotados</h3>
        <div className="enrollment-modal__table-wrap">
          <table className="session-home__table enrollment-modal__table">
            <thead>
              <tr>
                {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                  <th key={col} scope="col">
                    {COLUMN_LABELS[col] ?? col}
                  </th>
                ))}
                <th scope="col" className="enrollment-modal__th-actions">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {catalogosCargando ? (
                <tr>
                  <td className="session-home__empty" colSpan={colCount}>
                    Cargando inscripciones del catálogo…
                  </td>
                </tr>
              ) : catalogosError ? (
                <tr>
                  <td
                    className="session-home__empty enrollment-modal__hint--error"
                    colSpan={colCount}
                    role="alert"
                  >
                    {catalogosError}
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td
                    className="session-home__empty"
                    colSpan={colCount}
                  >
                    Todavía no hay ejemplares anotados en esta exposición.
                  </td>
                </tr>
              ) : (
                enrollments.map((row, i) => {
                  const editando = editingIndex === i && editDraft != null
                  const fuente = editando ? editDraft : row
                  const rk = row.id_catalogo ?? row['id ejemplar']
                  return (
                    <tr key={`${rk}-${i}`}>
                      {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                        <td key={col}>
                          {editando ? (
                            READONLY_COLS.has(col) ? (
                              <span className="enrollment-modal__cell-readonly">
                                {fuente[col] ?? '—'}
                              </span>
                            ) : (
                              <input
                                className="enrollment-modal__input enrollment-modal__input--inline"
                                value={fuente[col] ?? ''}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, [col]: e.target.value } : d,
                                  )
                                }
                                aria-label={COLUMN_LABELS[col] ?? col}
                              />
                            )
                          ) : (
                            row[col] ?? '—'
                          )}
                        </td>
                      ))}
                      <td className="enrollment-modal__td-actions">
                        {editando ? (
                          <div className="enrollment-modal__row-actions">
                            <button
                              type="button"
                              className="enrollment-modal__btn enrollment-modal__btn--primary enrollment-modal__btn--compact"
                              onClick={handleGuardarEdicion}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="enrollment-modal__btn enrollment-modal__btn--secondary enrollment-modal__btn--compact"
                              onClick={handleCancelarEdicion}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="enrollment-modal__row-actions">
                            <button
                              type="button"
                              className="enrollment-modal__icon-btn enrollment-modal__icon-btn--edit"
                              title="Editar"
                              aria-label="Editar fila"
                              onClick={() => handleIniciarEdicion(i)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              type="button"
                              className="enrollment-modal__icon-btn enrollment-modal__icon-btn--delete"
                              title="Eliminar"
                              aria-label="Eliminar de la anotación"
                              onClick={() => handleEliminar(i)}
                            >
                              <IconTrash />
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
      </section>
    </div>
  )
}
