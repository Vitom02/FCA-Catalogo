import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ApiError,
  actualizarCatalogo,
  crearCatalogo,
  eliminarCatalogo,
  listarCatalogosPorExposicionDetalle,
} from '../../apiConnect.jsx'
import { VistaAnotacionExposicion } from '../../componentes/exposicion/VistaAnotacionExposicion.jsx'
import {
  getExhibitionRowKey,
  sessionMatchesExhibitionRow,
} from '../../datos/exhibitionsTable.js'
import { mapCatalogoDetalleToEnrollment } from '../../utilidades/mapCatalogoApi.js'
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
 * }} props
 */
export function PaginaExposicion({
  session,
  exhibitionRows,
  enrollmentsByExhibition,
  setEnrollmentsByExhibition,
}) {
  const { expoKey } = useParams()
  /** @type {'idle' | 'loading' | 'ok' | 'error'} */
  const [catalogosLoad, setCatalogosLoad] = useState('idle')
  const [catalogosError, setCatalogosError] = useState(/** @type {string | null} */ (null))

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
    return sessionMatchesExhibitionRow(session, exhibition)
  }, [session, exhibition])

  const rowKey = exhibition ? getExhibitionRowKey(exhibition) : ''
  const idExposicion = exhibition?.id_exposicion

  const aplicarFilasCatalogo = useCallback(
    (rows) => {
      setEnrollmentsByExhibition((prev) => ({
        ...prev,
        [rowKey]: rows.map((r) => mapCatalogoDetalleToEnrollment(r)),
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

  useEffect(() => {
    if (idExposicion == null || !rowKey) return
    let cancelled = false
    setCatalogosLoad('loading')
    setCatalogosError(null)
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
      await crearCatalogo({
        id_exposicion: idExposicion,
        id_ejemplar: idEj,
        id_categoria: idCat,
        id_usuario: idUsuario,
      })
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
      const payload = {}
      if (idCat != null && Number.isFinite(Number(idCat))) {
        payload.id_categoria = Number(idCat)
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
        onAddEnrollment={handleAddEnrollment}
        onUpdateEnrollment={handleUpdateEnrollment}
        onRemoveEnrollment={handleRemoveEnrollment}
        catalogosCargando={catalogosLoad === 'loading'}
        catalogosError={catalogosError}
      />
    </div>
  )
}
