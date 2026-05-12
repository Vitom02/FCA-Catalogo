/**
 * Orden del catálogo alineado al PDF (numeración automática en servidor).
 * Espejo de la lógica en `web/src/utilidades/catalogoPdfLogica.js` → `filasDetalleEnOrdenCatalogoPdf`
 * (la imagen Docker solo incluye `/api`, no el front).
 */
import dayjs from "dayjs";

const PDF_MACRO_SECCIONES_CATALOGO = [
  { titulo: "ADULTOS", idsOrden: [5, 6, 7, 8, 9, 10, 11, 12] },
  { titulo: "JÓVENES", idsOrden: [3, 15, 4, 16] },
  { titulo: "VETERANOS", idsOrden: [13, 14] },
  { titulo: "CACHORROS", idsOrden: [1, 2] },
  { titulo: "CACHORROS ESPECIALES", idsOrden: [17, 18] },
];

const ORDINAL_SIN_NUMERO = 9999;

function ordinalDesdeEtiquetaCategoria(etiqueta) {
  const t = String(etiqueta ?? "").trim();
  if (!t) return ORDINAL_SIN_NUMERO;
  let m = t.match(/^\s*(\d+)\s*[°ºª]/i);
  if (m) return parseInt(m[1], 10);
  m = t.match(/\bCAT\.?\s*(\d+)\s*[°ºª]/i);
  if (m) return parseInt(m[1], 10);
  m = t.match(/(\d+)\s*[°ºª]/i);
  if (m) return parseInt(m[1], 10);
  m = t.match(/^\s*(\d+)\s*va\b/i);
  if (m) return parseInt(m[1], 10);
  m = t.match(/^\s*(\d+)\b/);
  return m ? parseInt(m[1], 10) : ORDINAL_SIN_NUMERO;
}

function pesoSexoCategoriaParaOrden(etiqueta) {
  const t = String(etiqueta ?? "").toUpperCase();
  if (/\bMACHOS?\b/.test(t)) return 0;
  if (/\bHEMBRAS?\b/.test(t) || /\bHEMBRA\b/.test(t)) return 1;
  return 2;
}

function compararGrupoResumen(a, b) {
  const ga = Number(a?.id_grupo);
  const gb = Number(b?.id_grupo);
  const fa = Number.isFinite(ga) ? ga : 0;
  const fb = Number.isFinite(gb) ? gb : 0;
  if (fa === 0 && fb !== 0) return 1;
  if (fb === 0 && fa !== 0) return -1;
  return fa - fb;
}

function compararRazaAlfabetico(a, b) {
  const la = String(a?.etiqueta_raza ?? "").trim();
  const lb = String(b?.etiqueta_raza ?? "").trim();
  return la.localeCompare(lb, "es", { sensitivity: "base" });
}

function compararCategoriaPorOrdinalEnNombre(a, b) {
  const ta = String(a?.categoria_etiqueta ?? "");
  const tb = String(b?.categoria_etiqueta ?? "");
  const oa = ordinalDesdeEtiquetaCategoria(ta);
  const ob = ordinalDesdeEtiquetaCategoria(tb);
  if (oa !== ob) return ob - oa;
  const sa = pesoSexoCategoriaParaOrden(ta);
  const sb = pesoSexoCategoriaParaOrden(tb);
  if (sa !== sb) return sa - sb;
  return ta.localeCompare(tb, "es", { sensitivity: "base" });
}

function pesoSexoEjemplarFila(row) {
  const s = String(row?.sexo ?? "")
    .trim()
    .toUpperCase();
  if (s === "MACHO" || s === "M") return 0;
  if (s === "HEMBRA" || s === "H") return 1;
  return 2;
}

function valorFechaNacimientoOrdenMasAdultoPrimero(row) {
  const fn = row?.fecha_nacimiento;
  if (fn == null || String(fn).trim() === "") return Number.POSITIVE_INFINITY;
  const raw = String(fn).trim().slice(0, 10);
  const d = dayjs(raw);
  if (!d.isValid()) return Number.POSITIVE_INFINITY;
  return d.valueOf();
}

function compararEjemplarPdfMachoPrimeroMasAdultoPrimero(a, b) {
  const sa = pesoSexoEjemplarFila(a);
  const sb = pesoSexoEjemplarFila(b);
  if (sa !== sb) return sa - sb;

  const fa = valorFechaNacimientoOrdenMasAdultoPrimero(a);
  const fb = valorFechaNacimientoOrdenMasAdultoPrimero(b);
  if (fa !== fb) return fa - fb;

  const na = a?.numero != null && a.numero !== "" ? Number(a.numero) : NaN;
  const nb = b?.numero != null && b.numero !== "" ? Number(b.numero) : NaN;
  const vaNumber = Number.isFinite(na) ? na : -Infinity;
  const vbNumber = Number.isFinite(nb) ? nb : -Infinity;
  if (vbNumber !== vaNumber) return vbNumber - vaNumber;

  const ia = Number(a?.id_catalogo) || 0;
  const ib = Number(b?.id_catalogo) || 0;
  return ib - ia;
}

function insertarFilaEnPorGrupo(porGrupo, row) {
  const r = row && typeof row === "object" ? row : {};
  const idG = Number(r.id_grupo);
  const gKey = Number.isFinite(idG) ? idG : 0;
  const gLabel = String(r.grupo_etiqueta ?? "Sin grupo").trim() || "Sin grupo";
  const idR = Number(r.id_raza);
  const rKey = Number.isFinite(idR) ? idR : 0;
  const rLabel = String(r.raza ?? "—").trim() || "—";
  const idC = Number(r.id_categoria);
  const cKey = Number.isFinite(idC) ? idC : 0;
  const cLabel = String(r.categoria_etiqueta ?? "—").trim() || "—";

  const gk = String(gKey);
  if (!porGrupo.has(gk)) {
    porGrupo.set(gk, {
      id_grupo: gKey,
      grupo_etiqueta: gLabel,
      razas: new Map(),
    });
  }
  const gNode = porGrupo.get(gk);
  const rk = `raza-${rKey}-${rLabel}`;
  if (!gNode.razas.has(rk)) {
    gNode.razas.set(rk, {
      id_raza: rKey,
      etiqueta_raza: rLabel,
      categorias: new Map(),
    });
  }
  const rNode = gNode.razas.get(rk);
  const ck = String(cKey);
  if (!rNode.categorias.has(ck)) {
    rNode.categorias.set(ck, {
      id_categoria: cKey,
      categoria_etiqueta: cLabel,
      filas: [],
    });
  }
  rNode.categorias.get(ck).filas.push(r);
}

function categoriasEnOrdenPorIds(categoriasMap, idsOrden) {
  const ordenados = [];
  const seen = new Set();
  for (const id of idsOrden) {
    const ck = String(id);
    if (categoriasMap.has(ck)) {
      ordenados.push(categoriasMap.get(ck));
      seen.add(ck);
    }
  }
  for (const [k, v] of categoriasMap) {
    if (!seen.has(k)) ordenados.push(v);
  }
  return ordenados;
}

/**
 * @param {Record<string, unknown>[]} filas
 * @returns {Record<string, unknown>[]}
 */
export function filasDetalleEnOrdenCatalogoPdf(filas) {
  const arr = Array.isArray(filas) ? filas : [];
  const todosIdsAsignados = new Set(
    PDF_MACRO_SECCIONES_CATALOGO.flatMap((s) => s.idsOrden),
  );
  /** @type {Record<string, unknown>[]} */
  const out = [];

  function recolectar(filasSubset, idsOrdenCategorias, ordenOrdinalFallback) {
    const porGrupo = new Map();
    for (const row of filasSubset) {
      insertarFilaEnPorGrupo(porGrupo, row);
    }
    const gruposOrdenados = [...porGrupo.values()].sort(compararGrupoResumen);
    for (const g of gruposOrdenados) {
      const razasArr = [...g.razas.values()].sort(compararRazaAlfabetico);
      for (const rz of razasArr) {
        const catsArr = ordenOrdinalFallback
          ? [...rz.categorias.values()].sort(compararCategoriaPorOrdinalEnNombre)
          : categoriasEnOrdenPorIds(rz.categorias, idsOrdenCategorias);
        for (const c of catsArr) {
          const ordenadas = [...c.filas].sort(
            compararEjemplarPdfMachoPrimeroMasAdultoPrimero,
          );
          for (const fila of ordenadas) {
            out.push(fila);
          }
        }
      }
    }
  }

  for (const sec of PDF_MACRO_SECCIONES_CATALOGO) {
    const permitidos = new Set(sec.idsOrden);
    const filasSec = arr.filter((row) => {
      const id = Number(row.id_categoria);
      return Number.isFinite(id) && permitidos.has(id);
    });
    if (filasSec.length === 0) continue;
    recolectar(filasSec, sec.idsOrden, false);
  }

  const filasOtros = arr.filter((row) => {
    const id = Number(row.id_categoria);
    return Number.isFinite(id) && !todosIdsAsignados.has(id);
  });
  if (filasOtros.length > 0) {
    recolectar(filasOtros, [], true);
  }

  const seen = new Set(
    out.map((r) => Number(r.id_catalogo)).filter((n) => Number.isFinite(n)),
  );
  const rest = arr.filter((r) => {
    const idc = Number(r.id_catalogo);
    return Number.isFinite(idc) && !seen.has(idc);
  });
  rest.sort(
    (a, b) => (Number(a.id_catalogo) || 0) - (Number(b.id_catalogo) || 0),
  );
  out.push(...rest);

  return out;
}
