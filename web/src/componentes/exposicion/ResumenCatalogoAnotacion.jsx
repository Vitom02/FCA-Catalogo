import { useEffect, useId, useState } from 'react'
import { ApiError, obtenerResumenCatalogoAgrupado } from '../../apiConnect.jsx'
import './resumenCatalogoAnotacion.css'

/**
 * @param {{
 *   idExposicion: number | null | undefined,
 *   refreshKey?: number | string,
 * }} props
 */
export function ResumenCatalogoAnotacion({ idExposicion, refreshKey = 0 }) {
  const titleId = useId()
  const [data, setData] = useState(
    /** @type {{ grupos: unknown[], totales_por_categoria: unknown[] } | null} */ (null),
  )
  const [estado, setEstado] = useState(/** @type {'idle'|'cargando'|'ok'|'err'} */ ('idle'))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      const id = idExposicion != null ? Number(idExposicion) : NaN
      if (!Number.isFinite(id) || id <= 0) {
        if (cancelled) return
        setData(null)
        setEstado('idle')
        setError(null)
        return
      }
      if (cancelled) return
      setEstado('cargando')
      setError(null)
      void obtenerResumenCatalogoAgrupado(id)
        .then((d) => {
          if (cancelled) return
          setData(
            d && typeof d === 'object'
              ? /** @type {{ grupos: unknown[], totales_por_categoria: unknown[] }} */ (d)
              : { grupos: [], totales_por_categoria: [] },
          )
          setEstado('ok')
        })
        .catch((e) => {
          if (cancelled) return
          const msg =
            e instanceof ApiError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'No se pudo cargar el resumen.'
          setError(msg)
          setData(null)
          setEstado('err')
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [idExposicion, refreshKey])

  if (idExposicion == null || !Number.isFinite(Number(idExposicion))) {
    return null
  }

  if (estado === 'cargando' || estado === 'idle') {
    return (
      <section
        className="resumen-catalogo"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="resumen-catalogo__title">
          Resumen del catálogo
        </h3>
        <p className="resumen-catalogo__hint" aria-live="polite">
          Cargando resumen…
        </p>
      </section>
    )
  }

  if (estado === 'err' && error) {
    return (
      <section className="resumen-catalogo" aria-labelledby={titleId}>
        <h3 id={titleId} className="resumen-catalogo__title">
          Resumen del catálogo
        </h3>
        <p className="resumen-catalogo__err" role="alert">
          {error}
        </p>
      </section>
    )
  }

  const grupos = Array.isArray(data?.grupos) ? data.grupos : []
  const totalesCat = Array.isArray(data?.totales_por_categoria)
    ? data.totales_por_categoria
    : []
  const totalGral =
    totalesCat.length > 0
      ? totalesCat.reduce(
          (s, t) => s + (typeof t === 'object' && t && 'total' in t ? Number(t.total) : 0),
          0,
        )
      : 0
  const totalAnotados =
    totalesCat.length > 0
      ? totalGral
      : grupos.reduce((s, g) => {
          const go = g && typeof g === 'object' ? g : {}
          return s + (Number(go.total) || 0)
        }, 0)

  if (grupos.length === 0 && totalesCat.length === 0) {
    return (
      <section className="resumen-catalogo" aria-labelledby={titleId}>
        <h3 id={titleId} className="resumen-catalogo__title">
          Resumen del catálogo
        </h3>
        <p className="resumen-catalogo__hint">Todavía no hay inscriptos en esta exposición.</p>
      </section>
    )
  }

  return (
    <section className="resumen-catalogo" aria-labelledby={titleId}>
      <h3 id={titleId} className="resumen-catalogo__title">
        Resumen del catálogo
      </h3>

      <div className="resumen-catalogo__arbol" role="tree">
        {grupos.map((g) => {
          const go = g && typeof g === 'object' ? g : {}
          const eg = String(go.etiqueta_grupo ?? 'Grupo')
          const tg = Number(go.total) || 0
          const razas = Array.isArray(go.razas) ? go.razas : []
          return (
            <details
              key={`g-${eg}-${go.id_grupo}`}
              className="resumen-catalogo__nodo resumen-catalogo__nodo--grupo"
              open
            >
              <summary className="resumen-catalogo__pildora">
                <span className="resumen-catalogo__label">{eg}</span>
                <span className="resumen-catalogo__valor">{tg}</span>
              </summary>
              <div className="resumen-catalogo__hijos" role="group">
                {razas.map((r) => {
                  const ro = r && typeof r === 'object' ? r : {}
                  const er = String(ro.etiqueta_raza ?? 'Raza')
                  const tr = Number(ro.total) || 0
                  const cats = Array.isArray(ro.categorias) ? ro.categorias : []
                  return (
                    <details
                      key={`r-${er}-${ro.id_raza}`}
                      className="resumen-catalogo__nodo resumen-catalogo__nodo--raza"
                      open
                    >
                      <summary className="resumen-catalogo__pildora">
                        <span className="resumen-catalogo__label">{er}</span>
                        <span className="resumen-catalogo__valor">{tr}</span>
                      </summary>
                      <ul className="resumen-catalogo__hijos resumen-catalogo__lista-cat">
                        {cats.map((c) => {
                          const co = c && typeof c === 'object' ? c : {}
                          const lab = String(co.categoria ?? '—')
                          const n = Number(co.total) || 0
                          return (
                            <li
                              key={`c-${String(co.id_categoria)}-${lab}`}
                              className="resumen-catalogo__pildora resumen-catalogo__pildora--hoja"
                            >
                              <span className="resumen-catalogo__label">{lab}</span>
                              <span className="resumen-catalogo__valor">{n}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </details>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>

      {totalesCat.length > 0 ? (
        <details
          className="resumen-catalogo__nodo resumen-catalogo__nodo--grupo resumen-catalogo__totales-cat"
          open
        >
          <summary className="resumen-catalogo__pildora">
            <span className="resumen-catalogo__label">
              Por categoría (total exposición)
            </span>
            <span className="resumen-catalogo__valor">{totalGral}</span>
          </summary>
          <div className="resumen-catalogo__hijos" role="group">
            <ul className="resumen-catalogo__totales-lista">
              {totalesCat.map((t) => {
                const o = t && typeof t === 'object' ? t : {}
                return (
                  <li
                    key={String(o.id_categoria ?? o.categoria)}
                    className="resumen-catalogo__pildora resumen-catalogo__pildora--hoja"
                  >
                    <span className="resumen-catalogo__label">
                      {String(o.categoria ?? '—')}
                    </span>
                    <span className="resumen-catalogo__valor">
                      {Number(o.total) || 0}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </details>
      ) : null}

      <p className="resumen-catalogo__total-anotados" role="status">
        <span className="resumen-catalogo__label">Total anotados</span>
        <span className="resumen-catalogo__valor">{totalAnotados}</span>
      </p>
    </section>
  )
}
