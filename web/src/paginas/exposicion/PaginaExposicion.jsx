import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ApiError,
  actualizarCatalogo,
  cerrarTorneoYNumerarCatalogo,
  crearCatalogo,
  eliminarCatalogo,
  listarCatalogosConteosPorExposicion,
  listarCatalogosPorExposicionDetalle,
  listarExposicionesProximas,
} from '../../apiConnect.jsx'
import { VistaAnotacionExposicion } from '../../componentes/exposicion/VistaAnotacionExposicion.jsx'
import {
  esExposicionAccesibleParaCatalogoClub,
  esExposicionEstadoAbierto,
  getExhibitionRowKey,
  sessionMatchesExhibitionRow,
} from '../../datos/exhibitionsTable.js'
import { mapCatalogoDetalleToEnrollment, sortCatalogoDetallePorNumeroCatalogo } from '../../utilidades/mapCatalogoApi.js'
import {
  mapConteosCantidadEnFilas,
  mapListaExposicionesApi,
} from '../../utilidades/mapExposicionesApi.js'
import '../catalogo/PaginaInicio.css'
import './PaginaExposicion.css'

/**
 * @param {{
 *   session: {
 *     username: string,
 *     role: string,
 *     kennelId: string | null,
 *     id_usuario?: number,
 *   },
 *   exhibitionRows: import('../../datos/exhibitionsTable.js').ExhibitionRow[],
 *   enrollmentsByExhibition: Record<string, Record<string, unknown>[]>,
 *   setEnrollmentsByExhibition: React.Dispatch<
 *     React.SetStateAction<Record<string, Record<string, unknown>[]>>
 *   >,
 *   setExhibitionRows?: React.Dispatch<React.SetStateAction<import('../../datos/exhibitionsTable.js').ExhibitionRow[]>>,
 * }} props
 */
export function PaginaExposicion({
  session,
  exhibitionRows,
  enrollmentsByExhibition,
  setEnrollmentsByExhibition,
  setExhibitionRows,
}) {
  const { expoKey } = useParams()
  /** @type {'idle' | 'loading' | 'ok' | 'error'} */
  const [catalogosLoad, setCatalogosLoad] = useState('idle')
  const [catalogosError, setCatalogosError] = useState(/** @type {string | null} */ (null))
  /** Filas crudas del GET detalle (misma respuesta que PDF); evita un segundo request al generar PDF. */
  const [catalogoDetalleFilas, setCatalogoDetalleFilas] = useState(
    /** @type {Record<string, unknown>[] | null} */ (null),
  )

  const decodedKey = useMemo(() => {
    if (expoKey == null) return ''
    try {
      return decodeURIComponent(expoKey)
    } catch {
      return ''
    }
  }, [expoKey])

  const exhibition = useMemo(
    () => exhibitionRows.find((r) => getExhibitionRowKey(r) === decodedKey),
    [exhibitionRows, decodedKey],
  )

  const canAccess = useMemo(() => {
    if (!exhibition) return false
    if (!sessionMatchesExhibitionRow(session, exhibition)) return false
    if (
      session.role !== 'superadmin' &&
      !esExposicionAccesibleParaCatalogoClub(exhibition)
    ) {
      return false
    }
    return true
  }, [session, exhibition])

  const rowKey = exhibition ? getExhibitionRowKey(exhibition) : ''
  const idExposicion = exhibition?.id_exposicion

  const aplicarFilasCatalogo = useCallback(
    (rows) => {
      const list = Array.isArray(rows) ? rows : []
      const ordered = sortCatalogoDetallePorNumeroCatalogo(list)
      setCatalogoDetalleFilas(ordered)
      setEnrollmentsByExhibition((prev) => ({
        ...prev,
        [rowKey]: ordered.map((r) => mapCatalogoDetalleToEnrollment(r)),
      }))
    },
    [rowKey, setEnrollmentsByExhibition],
  )

  const refreshCatalogos = useCallback(async () => {
    if (idExposicion == null) return
    const data = await listarCatalogosPorExposicionDetalle(idExposicion)
    const rows = Array.isArray(data) ? data : []
    aplicarFilasCatalogo(rows)
  }, [idExposicion, aplicarFilasCatalogo])

  const recargarFilasExposiciones = useCallback(async () => {
    if (setExhibitionRows == null) return
    try {
      const [data, conteos] = await Promise.all([
        listarExposicionesProximas(),
        listarCatalogosConteosPorExposicion().catch(() => []),
      ])
      const base = mapListaExposicionesApi(data)
      let merged = mapConteosCantidadEnFilas(base, conteos)
      if (session.role !== 'superadmin') {
        merged = merged.filter((r) => esExposicionAccesibleParaCatalogoClub(r))
      }
      setExhibitionRows(merged)
    } catch {
      /* listado principal se actualiza en la próxima visita al inicio */
    }
  }, [setExhibitionRows, session.role])

  const numeracionAutomatica = useMemo(
    () => exhibition != null && Number(exhibition.tipo_numeracion) !== 1,
    [exhibition],
  )

  const handleCerrarTorneoYNumerar = useCallback(async () => {
    if (idExposicion == null) return
    try {
      await cerrarTorneoYNumerarCatalogo(idExposicion)
      await refreshCatalogos()
      await recargarFilasExposiciones()
    } catch (e) {
      window.alert(
        e instanceof ApiError
          ? e.message
          : 'No se pudo cerrar el torneo ni asignar la numeración.',
      )
    }
  }, [idExposicion, refreshCatalogos, recargarFilasExposiciones])

  useEffect(() => {
    if (idExposicion == null || !rowKey) return
    let cancelled = false
    setCatalogosLoad('loading')
    setCatalogosError(null)
    setCatalogoDetalleFilas(null)
    listarCatalogosPorExposicionDetalle(idExposicion)
      .then((data) => {
        if (cancelled) return
        const rows = Array.isArray(data) ? data : []
        aplicarFilasCatalogo(rows)
        setCatalogosLoad('ok')
      })
      .catch((e) => {
        if (cancelled) return
        setCatalogosError(
          e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.',
        )
        setCatalogosLoad('error')
      })
    return () => {
      cancelled = true
    }
  }, [idExposicion, rowKey, aplicarFilasCatalogo])

  if (!exhibition || !canAccess) {
    return <Navigate to="/" replace />
  }

  const enrollments = enrollmentsByExhibition[rowKey] ?? []

  async function handleAddEnrollment(entry) {
    const idUsuario = session.id_usuario
    const idCat = entry.id_categoria
    const idEj = Number(entry['id ejemplar'])
    if (
      idExposicion == null ||
      idUsuario == null ||
      !Number.isFinite(idUsuario) ||
      idCat == null ||
      !Number.isFinite(idCat) ||
      !Number.isFinite(idEj)
    ) {
      window.alert(
        'No se puede guardar: falta id de exposición, usuario o categoría. Volvé a iniciar sesión.',
      )
      return
    }
    try {
      /** @type {Record<string, unknown>} */
      const body = {
        id_exposicion: idExposicion,
        id_ejemplar: idEj,
        id_categoria: idCat,
        id_usuario: idUsuario,
      }
      const numRaw = entry.numero
      if (
        exhibition != null &&
        esExposicionEstadoAbierto(exhibition) &&
        numRaw !== undefined &&
        numRaw !== null &&
        numRaw !== ''
      ) {
        const n = Number(numRaw)
        if (Number.isFinite(n) && n >= 1) {
          body.numero = Math.trunc(n)
        }
      }
      await crearCatalogo(body)
      await refreshCatalogos()
    } catch (e) {
      window.alert(
        e instanceof ApiError ? e.message : 'No se pudo guardar la inscripción.',
      )
    }
  }

  async function handleUpdateEnrollment(index, entry) {
    const idCat = entry.id_categoria
    const idCatalogo = entry.id_catalogo
    if (idCatalogo == null) {
      setEnrollmentsByExhibition((prev) => {
        const list = [...(prev[rowKey] ?? [])]
        list[index] = entry
        return { ...prev, [rowKey]: list }
      })
      return
    }
    try {
      /** @type {Record<string, unknown>} */
      const payload = {}
      if (idCat != null && Number.isFinite(Number(idCat))) {
        payload.id_categoria = Number(idCat)
      }
      const nex = Number(entry.numeros_extra)
      const esNe = Number.isFinite(nex) && nex >= 1
      const rawNum = entry.numero
      if (
        !esNe &&
        rawNum !== undefined &&
        rawNum !== null &&
        rawNum !== ''
      ) {
        const n = Number(rawNum)
        if (Number.isFinite(n) && n >= 1) {
          payload.numero = Math.trunc(n)
        }
      }
      if (Object.keys(payload).length > 0) {
        await actualizarCatalogo(idCatalogo, payload)
      }
      await refreshCatalogos()
    } catch (e) {
      window.alert(
        e instanceof ApiError ? e.message : 'No se pudo actualizar la inscripción.',
      )
    }
  }

  async function handleRemoveEnrollment(index) {
    const row = enrollments[index]
    const idCatalogo = row?.id_catalogo
    if (idCatalogo != null) {
      try {
        await eliminarCatalogo(idCatalogo)
        await refreshCatalogos()
      } catch (e) {
        window.alert(
          e instanceof ApiError ? e.message : 'No se pudo eliminar la inscripción.',
        )
      }
      return
    }
    setEnrollmentsByExhibition((prev) => {
      const list = [...(prev[rowKey] ?? [])]
      list.splice(index, 1)
      const renumbered = list.map((e, idx) => ({
        ...e,
        ordinal: String(idx + 1),
      }))
      return { ...prev, [rowKey]: renumbered }
    })
  }

  return (
    <div className="exhibition-page">
      <nav className="exhibition-page__nav" aria-label="Navegación de exposición">
        <Link to="/" className="exhibition-page__back-link">
          ← Volver a exposiciones
        </Link>
      </nav>
      <VistaAnotacionExposicion
        exhibition={exhibition}
        session={session}
        enrollments={enrollments}
        catalogoDetalleFilas={catalogoDetalleFilas}
        onAddEnrollment={handleAddEnrollment}
        onUpdateEnrollment={handleUpdateEnrollment}
        onRemoveEnrollment={handleRemoveEnrollment}
        onCerrarTorneoYNumerar={
          numeracionAutomatica ? handleCerrarTorneoYNumerar : undefined
        }
        catalogosCargando={catalogosLoad === 'loading'}
        catalogosError={catalogosError}
      />
    </div>
  )
}
