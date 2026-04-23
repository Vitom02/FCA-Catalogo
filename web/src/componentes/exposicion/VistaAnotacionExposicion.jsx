import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  buscarEjemplares,
  listarCategoriasEjemplares,
  listarFederacionesEjemplares,
  listarRazasEjemplares,
  obtenerEjemplarPorId,
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
import {
  BusquedaSelectTipo,
  matchUnicoEtiqueta,
  normalizarBusqueda,
} from '../comun/BusquedaSelectTipo.jsx'
import './vistaAnotacionExposicion.css'

/** Misma convención que `ID_FEDERACION_FCA` en la API de ejemplares. */
const ID_FEDERACION_FCA_DEFAULT = 1

const COLUMN_LABELS = {
  numero: 'N.º catálogo',
  nombre: 'Nombre',
  raza: 'Raza',
  federacion: 'Federación',
  registro: 'Registro',
  sexo: 'Sexo',
  categoria: 'Categoría',
  usuario: 'Usuario',
}

/** Celdas vacías en lugar de guión largo. */
function textoCeldaInscripcion(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'bigint') return String(v)
  const s = String(v).trim()
  if (s === '' || s === '—') return ''
  return s
}

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
 * @param {{ etiqueta?: string | null, federacion?: string, codigo_pais?: string | null }} f
 */
function etiquetaFederacion(f) {
  return f.etiqueta != null && String(f.etiqueta).trim() !== ''
    ? String(f.etiqueta)
    : [f.federacion, f.codigo_pais].filter(Boolean).join(' · ')
}

/**
 * @param {{ etiqueta?: string | null, raza?: string, codigo_raza?: string }} r
 */
function etiquetaRaza(r) {
  return r.etiqueta != null && String(r.etiqueta).trim() !== ''
    ? String(r.etiqueta)
    : r.raza
      ? `${r.raza} (${r.codigo_raza ?? ''})`
      : String(r.codigo_raza ?? '—')
}

/**
 * @param {{
 *   exhibition: import('../../datos/exhibitionsTable.js').ExhibitionRow,
 *   session: { username: string, role: string, kennelId: string | null },
 *   enrollments: Record<string, string>[],
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
  const editCategoriaTitleId = useId()
  const editCategoriaErrorId = useId()
  const [idFederacion, setIdFederacion] = useState('')
  const [idRaza, setIdRaza] = useState('')
  const [textoBusqFederacion, setTextoBusqFederacion] = useState('')
  const [textoBusqRaza, setTextoBusqRaza] = useState('')
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
  const [editCategoriaIndex, setEditCategoriaIndex] = useState(/** @type {number | null} */ (null))
  const [editCategoriaEjemplar, setEditCategoriaEjemplar] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  )
  const [categoriaEditEtiqueta, setCategoriaEditEtiqueta] = useState('')
  const [categoriaEdicionError, setCategoriaEdicionError] = useState(
    /** @type {string | null} */ (null),
  )
  const [editCategoriaCargando, setEditCategoriaCargando] = useState(false)

  const [nombreModalOpen, setNombreModalOpen] = useState(false)
  const [nmSexo, setNmSexo] = useState('Macho')
  const [nmFed, setNmFed] = useState('')
  const [nmRaza, setNmRaza] = useState('')
  const [textoNmFed, setTextoNmFed] = useState('')
  const [textoNmRaza, setTextoNmRaza] = useState('')
  const [nmNombre, setNmNombre] = useState('')
  const federacionDefectoAplicada = useRef(false)
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

  const filaEdicionCategoria = useMemo(() => {
    if (editCategoriaIndex == null) return null
    return /** @type {Record<string, unknown> | null} */ (enrollments[editCategoriaIndex] ?? null)
  }, [editCategoriaIndex, enrollments])

  const categoriasElegiblesEdicion = useMemo(() => {
    if (!editCategoriaEjemplar) return []
    const meses = mesesCompletosHastaReferencia(
      editCategoriaEjemplar.fecha_nacimiento,
      exhibition['Fecha inicio'],
    )
    return filtrarCategoriasElegibles(categoriasApi, meses, editCategoriaEjemplar)
  }, [editCategoriaEjemplar, categoriasApi, exhibition])

  const opcionesCategoriaEdicion = useMemo(() => {
    if (!filaEdicionCategoria) return []
    const eleg = categoriasElegiblesEdicion
    const labCur = String(filaEdicionCategoria.categoria ?? '').trim()
    const idCur = filaEdicionCategoria.id_categoria
    const tiene = eleg.some(
      (c) => etiquetaInscripcionCategoria(/** @type {Record<string, unknown>} */ (c)) === labCur,
    )
    if (labCur && !tiene && idCur != null) {
      return [
        { id_categoria: idCur, categoria: labCur },
        ...eleg,
      ]
    }
    return eleg
  }, [filaEdicionCategoria, categoriasElegiblesEdicion])

  const nmFedEfectivo = useMemo(() => {
    const id = nmFed.trim()
    if (id) return id
    const u = matchUnicoEtiqueta(federaciones, etiquetaFederacion, textoNmFed)
    return u ? String(u.id_federacion) : ''
  }, [nmFed, textoNmFed, federaciones])

  const nmRazaEfectivo = useMemo(() => {
    const id = nmRaza.trim()
    if (id) return id
    const u = matchUnicoEtiqueta(razas, etiquetaRaza, textoNmRaza)
    return u ? String(u.id_raza) : ''
  }, [nmRaza, textoNmRaza, razas])

  const nmModalCriterios = useMemo(() => {
    const base =
      (nmSexo === 'Macho' || nmSexo === 'Hembra') &&
      nmFedEfectivo.trim() !== '' &&
      nmRazaEfectivo.trim() !== ''
    const nom = nmNombre.trim().length > 0
    return { base, nom }
  }, [nmSexo, nmFedEfectivo, nmRazaEfectivo, nmNombre])

  const busquedaEsFca = useMemo(() => {
    const id = Number(idFederacion)
    return Number.isFinite(id) && id === ID_FEDERACION_FCA_DEFAULT
  }, [idFederacion])

  useEffect(() => {
    if (!busquedaEsFca) return
    setRegistroBusqueda((prev) => prev.replace(/\D/g, ''))
  }, [busquedaEsFca])

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

  useEffect(() => {
    if (federacionDefectoAplicada.current || federaciones.length === 0) return
    const fca =
      federaciones.find((f) => Number(f.id_federacion) === ID_FEDERACION_FCA_DEFAULT) ??
      federaciones.find(
        (f) => normalizarBusqueda(String(f.codigo_pais ?? '')) === 'fca',
      )
    if (!fca) return
    federacionDefectoAplicada.current = true
    setIdFederacion(String(fca.id_federacion))
    setTextoBusqFederacion(etiquetaFederacion(fca))
  }, [federaciones])

  function resetModalNombre() {
    setNmSexo('Macho')
    setNmFed('')
    setNmRaza('')
    setTextoNmFed('')
    setTextoNmRaza('')
    setNmNombre('')
    setNmResultadosApi([])
    setNmBusquedaLoading(false)
    setNmBusquedaError(null)
  }

  function openModalNombre() {
    resetModalNombre()
    if (idFederacion.trim() !== '') {
      setNmFed(idFederacion)
      const f = federaciones.find((x) => String(x.id_federacion) === idFederacion)
      setTextoNmFed(f ? etiquetaFederacion(f) : textoBusqFederacion)
    } else {
      setTextoNmFed(textoBusqFederacion)
    }
    if (idRaza.trim() !== '') {
      setNmRaza(idRaza)
      const r = razas.find((x) => String(x.id_raza) === idRaza)
      setTextoNmRaza(r ? etiquetaRaza(r) : textoBusqRaza)
    } else {
      setTextoNmRaza(textoBusqRaza)
    }
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
    const fed = nmFedEfectivo.trim()
    const raz = nmRazaEfectivo.trim()
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
  }, [nombreModalOpen, nmSexo, nmFedEfectivo, nmRazaEfectivo, nmNombre])

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
    let fed = idFederacion.trim()
    let raz = idRaza.trim()
    if (!fed) {
      const u = matchUnicoEtiqueta(federaciones, etiquetaFederacion, textoBusqFederacion)
      if (u) {
        fed = String(u.id_federacion)
        setIdFederacion(fed)
        setTextoBusqFederacion(etiquetaFederacion(u))
      }
    }
    if (!raz) {
      const u = matchUnicoEtiqueta(razas, etiquetaRaza, textoBusqRaza)
      if (u) {
        raz = String(u.id_raza)
        setIdRaza(raz)
        setTextoBusqRaza(etiquetaRaza(u))
      }
    }
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

  async function abrirEdicionCategoria(i) {
    const fila = enrollments[i]
    if (!fila) return
    setEditCategoriaIndex(i)
    setCategoriaEditEtiqueta(String(fila.categoria ?? ''))
    setCategoriaEdicionError(null)
    setEditCategoriaEjemplar(null)
    setEditCategoriaCargando(true)
    const idEj = Number(fila['id ejemplar'])
    if (!Number.isFinite(idEj)) {
      setCategoriaEdicionError('Falta id de ejemplar en la inscripción.')
      setEditCategoriaCargando(false)
      return
    }
    try {
      const data = await obtenerEjemplarPorId(idEj)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setEditCategoriaEjemplar(/** @type {Record<string, unknown>} */ (data))
      } else {
        setCategoriaEdicionError('Respuesta de ejemplar no válida.')
      }
    } catch (e) {
      setCategoriaEdicionError(
        e instanceof ApiError ? e.message : 'No se pudo cargar el ejemplar.',
      )
    } finally {
      setEditCategoriaCargando(false)
    }
  }

  function cerrarEdicionCategoria() {
    setEditCategoriaIndex(null)
    setEditCategoriaEjemplar(null)
    setCategoriaEdicionError(null)
    setCategoriaEditEtiqueta('')
  }

  function guardarEdicionCategoria() {
    if (editCategoriaIndex == null || !filaEdicionCategoria) return
    const t = categoriaEditEtiqueta.trim()
    if (!t) {
      setCategoriaEdicionError('Elegí una categoría.')
      return
    }
    let idCat = idCategoriaFromEtiqueta(categoriasApi, t)
    if (idCat == null) {
      const same =
        t === String(filaEdicionCategoria.categoria ?? '').trim() &&
        filaEdicionCategoria.id_categoria != null
      if (same) {
        const n = Number(filaEdicionCategoria.id_categoria)
        if (Number.isFinite(n)) idCat = n
      }
    }
    if (idCat == null || !Number.isFinite(idCat)) {
      setCategoriaEdicionError('Categoría no válida para este ejemplar.')
      return
    }
    onUpdateEnrollment(editCategoriaIndex, {
      ...filaEdicionCategoria,
      categoria: t,
      id_categoria: idCat,
    })
    cerrarEdicionCategoria()
  }

  function handleEliminar(i) {
    const ok = window.confirm('¿Quitar este ejemplar de la anotación?')
    if (!ok) return
    cerrarEdicionCategoria()
    onRemoveEnrollment(i)
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
      <div className="anotacion-tarjeta-overlay" role="presentation">
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

  function renderEdicionCategoriaModal() {
    if (editCategoriaIndex == null) return null
    const fila = filaEdicionCategoria
    const meses =
      editCategoriaEjemplar != null
        ? mesesCompletosHastaReferencia(
            editCategoriaEjemplar.fecha_nacimiento,
            exhibition['Fecha inicio'],
          )
        : null
    const sinEdad =
      !editCategoriaCargando &&
      editCategoriaEjemplar != null &&
      meses === null
    const sinCategorias =
      !editCategoriaCargando &&
      editCategoriaEjemplar != null &&
      meses != null &&
      opcionesCategoriaEdicion.length === 0

    return (
      <div className="anotacion-edit-cat-overlay" role="presentation">
        <div
          className="anotacion-edit-cat-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={editCategoriaTitleId}
          onClick={(ev) => ev.stopPropagation()}
        >
          <h2 id={editCategoriaTitleId} className="anotacion-edit-cat-dialog__title">
            Cambiar categoría
          </h2>
          {fila ? (
            <p className="anotacion-edit-cat-dialog__meta">
              {textoCeldaInscripcion(fila.nombre) || '—'}
            </p>
          ) : null}
          {editCategoriaCargando ? (
            <p className="enrollment-modal__hint">Cargando datos del ejemplar…</p>
          ) : !editCategoriaEjemplar ? (
            <p className="enrollment-modal__hint enrollment-modal__hint--error" role="alert">
              {categoriaEdicionError ?? 'No se pudo cargar el ejemplar.'}
            </p>
          ) : (
            <>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Categoría</span>
                <select
                  className="enrollment-modal__input enrollment-modal__select enrollment-modal__input--compact"
                  value={categoriaEditEtiqueta}
                  onChange={(e) => {
                    setCategoriaEditEtiqueta(e.target.value)
                    setCategoriaEdicionError(null)
                  }}
                  disabled={sinEdad || sinCategorias}
                  aria-invalid={categoriaEdicionError ? true : undefined}
                  aria-describedby={categoriaEdicionError ? editCategoriaErrorId : undefined}
                  aria-label="Categoría de inscripción"
                >
                  <option value="">
                    {sinEdad
                      ? 'Requiere fecha de nacimiento'
                      : sinCategorias
                        ? 'Sin categorías para esta edad y sexo'
                        : 'Seleccionar categoría'}
                  </option>
                  {opcionesCategoriaEdicion.map((raw) => {
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
              {categoriaEdicionError ? (
                <p
                  id={editCategoriaErrorId}
                  className="enrollment-modal__field-error"
                  role="alert"
                >
                  {categoriaEdicionError}
                </p>
              ) : null}
            </>
          )}
          <div className="anotacion-edit-cat-dialog__footer">
            <button
              type="button"
              className="enrollment-modal__btn enrollment-modal__btn--secondary"
              onClick={cerrarEdicionCategoria}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="enrollment-modal__btn enrollment-modal__btn--primary"
              disabled={
                editCategoriaCargando ||
                !editCategoriaEjemplar ||
                sinEdad ||
                sinCategorias
              }
              onClick={guardarEdicionCategoria}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="anotacion-page" role="region" aria-labelledby={titleId}>
      <header className="enrollment-modal__header enrollment-modal__header--anotacion-linea">
        <h2 id={titleId} className="enrollment-modal__title enrollment-modal__title--anotacion-linea">
          <span className="enrollment-modal__title-anotacion-label">Anotación en exposición</span>
          <span className="enrollment-modal__title-anotacion-sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="enrollment-modal__title-anotacion-meta">
            N.º {exhibition['Número'] ?? '—'} · {exhibition['Descripción'] ?? '—'}
            {fechaRango ? (
              <>
                <span className="enrollment-modal__title-anotacion-sep" aria-hidden>
                  {' '}
                  ·{' '}
                </span>
                {fechaRango}
              </>
            ) : null}
          </span>
        </h2>
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
                <BusquedaSelectTipo
                  items={federaciones}
                  getId={(f) => /** @type {{ id_federacion: number }} */ (f).id_federacion}
                  getLabel={(f) => etiquetaFederacion(f)}
                  valueId={idFederacion}
                  inputText={textoBusqFederacion}
                  onValueIdChange={setIdFederacion}
                  onInputTextChange={setTextoBusqFederacion}
                  aria-label="Federación (obligatorio); Tab completa si hay una sola coincidencia"
                  placeholder=""
                  className="enrollment-modal__input enrollment-modal__input--compact"
                  scopeSelector=".enrollment-modal__filters-fields--compact"
                  disabled={catalogoCargando}
                />
              </label>
              <label className="enrollment-modal__field">
                <span className="enrollment-modal__field-label">Raza</span>
                <BusquedaSelectTipo
                  items={razas}
                  getId={(r) => /** @type {{ id_raza: number }} */ (r).id_raza}
                  getLabel={(r) => etiquetaRaza(r)}
                  valueId={idRaza}
                  inputText={textoBusqRaza}
                  onValueIdChange={setIdRaza}
                  onInputTextChange={setTextoBusqRaza}
                  aria-label="Raza (obligatorio); Tab completa si hay una sola coincidencia"
                  placeholder=""
                  className="enrollment-modal__input enrollment-modal__input--compact"
                  scopeSelector=".enrollment-modal__filters-fields--compact"
                  disabled={catalogoCargando}
                />
              </label>
              <div className="enrollment-modal__registro-y-acciones">
                <label className="enrollment-modal__field enrollment-modal__field--registro-inline">
                  <span className="enrollment-modal__field-label">Registro</span>
                  <input
                    className="enrollment-modal__input enrollment-modal__input--compact"
                    value={registroBusqueda}
                    onChange={(e) => {
                      const v = e.target.value
                      setRegistroBusqueda(busquedaEsFca ? v.replace(/\D/g, '') : v)
                    }}
                    placeholder={
                      busquedaEsFca ? 'Solo números (FCA)' : 'N.º de registro'
                    }
                    autoComplete="off"
                    inputMode={busquedaEsFca ? 'numeric' : 'text'}
                    pattern={busquedaEsFca ? '[0-9]*' : undefined}
                    required
                    aria-required
                    aria-label={
                      busquedaEsFca
                        ? 'Número de registro FCA, solo dígitos (obligatorio)'
                        : 'Número de registro (obligatorio)'
                    }
                  />
                </label>
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
            </div>
          </div>
        </form>

        <div className="enrollment-modal__results">
          {!haBuscado ? (
            <p className="enrollment-modal__hint">
              Completá <strong>federación</strong>, <strong>raza</strong> y{' '}
              <strong>número de registro</strong> (los tres son obligatorios) y pulsá «Buscar».
              En federación y raza podés escribir para buscar; con <strong>Tab</strong> se completa la
              opción si solo hay una coincidencia con lo escrito.
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
        <div className="anotacion-nombre-overlay" role="presentation">
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

            <div className="anotacion-nombre-dialog__main">
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
                  Elegí sexo; en federación y raza escribí para buscar y usá <strong>Tab</strong> para
                  completar cuando haya una sola coincidencia. Luego escribí parte del nombre: la tabla
                  se actualiza sola. Tocá una fila para abrir la tarjeta e inscribir. Si ya elegiste
                  federación y raza en la búsqueda por registro, se rellenan acá.
                </p>
                <div className="anotacion-nombre-form__row anotacion-nombre-form__row--tercios">
                  <label className="enrollment-modal__field">
                    <span className="enrollment-modal__field-label">Federación</span>
                    <BusquedaSelectTipo
                      items={federaciones}
                      getId={(f) => /** @type {{ id_federacion: number }} */ (f).id_federacion}
                      getLabel={(f) => etiquetaFederacion(f)}
                      valueId={nmFed}
                      inputText={textoNmFed}
                      onValueIdChange={setNmFed}
                      onInputTextChange={setTextoNmFed}
                      aria-label="Federación (obligatorio); Tab completa si hay una sola coincidencia"
                      placeholder=""
                      className="enrollment-modal__input enrollment-modal__select"
                      scopeSelector=".anotacion-nombre-form__row--tercios"
                      disabled={catalogoCargando}
                    />
                </label>
                <label className="enrollment-modal__field">
                  <span className="enrollment-modal__field-label">Raza</span>
                  <BusquedaSelectTipo
                    items={razas}
                    getId={(r) => /** @type {{ id_raza: number }} */ (r).id_raza}
                    getLabel={(r) => etiquetaRaza(r)}
                    valueId={nmRaza}
                    inputText={textoNmRaza}
                    onValueIdChange={setNmRaza}
                    onInputTextChange={setTextoNmRaza}
                    aria-label="Raza (obligatorio); Tab completa si hay una sola coincidencia"
                    placeholder=""
                    className="enrollment-modal__input enrollment-modal__select"
                    scopeSelector=".anotacion-nombre-form__row--tercios"
                    disabled={catalogoCargando}
                  />
                </label>
                <label className="enrollment-modal__field">
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
        </div>
      ) : null}

      {renderTarjetaEjemplarOverlay()}
      {renderEdicionCategoriaModal()}

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
                  const rk = row.id_catalogo ?? row['id ejemplar']
                  return (
                    <tr key={`${rk}-${i}`}>
                      {ENROLLMENT_TABLE_COLUMNS.map((col) => (
                        <td key={col}>
                          {col === 'numero'
                            ? ''
                            : textoCeldaInscripcion(row[col])}
                        </td>
                      ))}
                      <td className="enrollment-modal__td-actions">
                        <div className="enrollment-modal__row-actions">
                          <button
                            type="button"
                            className="enrollment-modal__icon-btn enrollment-modal__icon-btn--edit"
                            title="Cambiar categoría"
                            aria-label="Cambiar categoría"
                            onClick={() => void abrirEdicionCategoria(i)}
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
