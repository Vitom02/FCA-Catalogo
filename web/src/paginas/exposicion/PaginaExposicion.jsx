import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { VistaAnotacionExposicion } from '../../componentes/exposicion/VistaAnotacionExposicion.jsx'
import { getExhibitionRowKey } from '../../datos/exhibitionsTable.js'
import '../catalogo/PaginaInicio.css'
import './PaginaExposicion.css'

/**
 * @param {{
 *   session: { username: string, role: string, kennelId: string | null },
 *   exhibitionRows: import('../../datos/exhibitionsTable.js').ExhibitionRow[],
 *   enrollmentsByExhibition: Record<string, Record<string, string>[]>,
 *   setEnrollmentsByExhibition: (updater: unknown) => void,
 * }} props
 */
export function PaginaExposicion({
  session,
  exhibitionRows,
  enrollmentsByExhibition,
  setEnrollmentsByExhibition,
}) {
  const { expoKey } = useParams()
  const navigate = useNavigate()

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
    if (session.role === 'superadmin') return true
    return session.kennelId != null && session.kennelId === exhibition.kennelId
  }, [session, exhibition])

  if (!exhibition || !canAccess) {
    return <Navigate to="/" replace />
  }

  const rowKey = getExhibitionRowKey(exhibition)
  const enrollments = enrollmentsByExhibition[rowKey] ?? []

  function handleBack() {
    navigate('/')
  }

  function handleAddEnrollment(entry) {
    setEnrollmentsByExhibition((prev) => ({
      ...prev,
      [rowKey]: [...(prev[rowKey] ?? []), entry],
    }))
  }

  function handleUpdateEnrollment(index, entry) {
    setEnrollmentsByExhibition((prev) => {
      const list = [...(prev[rowKey] ?? [])]
      list[index] = entry
      return { ...prev, [rowKey]: list }
    })
  }

  function handleRemoveEnrollment(index) {
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
        onBack={handleBack}
        onAddEnrollment={handleAddEnrollment}
        onUpdateEnrollment={handleUpdateEnrollment}
        onRemoveEnrollment={handleRemoveEnrollment}
      />
    </div>
  )
}
