import { query } from "../../database/index.js";

/**
 * Detalle por id: columnas de `ejemplares` + nombre armado con la función de BD.
 * `nombre_completo` = web.ejemplar_nombre (el que conviene mostrar).
 * `nombre_completo_columna` = valor guardado en la tabla (si lo usás aparte).
 */
const SELECT_DETALLE = `
  SELECT
    e.id_ejemplar,
    CONCAT_WS(
      ' - ',
      NULLIF(TRIM(COALESCE(fp.codigo_pais, f.codigo_pais, fo.codigo_pais, e.codigo_pais)), ''),
      NULLIF(TRIM(COALESCE(fp.federacion, f.federacion, fo.federacion)), '')
    ) AS codigo_pais,
    CONCAT_WS(
      ' - ',
      NULLIF(TRIM(COALESCE(r.codigo_raza, e.codigo_raza)), ''),
      NULLIF(TRIM(r.raza), '')
    ) AS raza,
    e.registro,
    e.nombre,
    e.prefijo,
    e.sufijo,
    web.ejemplar_nombre(e.nombre, e.prefijo, e.sufijo) AS nombre_completo,
    e.nombre_completo AS nombre_completo_columna,
    CASE TRIM(UPPER(COALESCE(e.sexo, '')))
      WHEN 'H' THEN 'HEMBRA'
      WHEN 'M' THEN 'MACHO'
      ELSE NULLIF(UPPER(TRIM(e.sexo)), '')
    END AS sexo,
    e.fecha_nacimiento,
    e.id_raza,
    e.id_tamano,
    e.id_pelaje,
    e.id_color,
    e.id_ejemplar_madre,
    e.id_ejemplar_padre,
    e.imagen,
    e.codigo_variedad,
    e.codigo_color,
    e.id_federacion,
    e.microchip,
    e.id_servicio,
    e.apto_cria,
    e.apto_exposicion,
    e.nace_vivo,
    e.id_federacion_origen,
    e.registro_origen
  FROM web.ejemplares e
  LEFT JOIN web.razas r ON r.id_raza = e.id_raza
  LEFT JOIN web.federaciones f ON f.id_federacion = e.id_federacion
  LEFT JOIN web.federaciones fo ON fo.id_federacion = e.id_federacion_origen
  LEFT JOIN web.federaciones fp ON fp.codigo_pais = COALESCE(f.codigo_pais, fo.codigo_pais, e.codigo_pais)
`;

/**
 * Listado acotado: JOINs + columnas derivadas (misma idea que en pgAdmin).
 * Los filtros se arman solo con parámetros presentes (AND).
 */
const SELECT_BUSCAR = `
  SELECT
    e.id_ejemplar,
    CONCAT_WS(
      ' - ',
      NULLIF(TRIM(COALESCE(fp.codigo_pais, f.codigo_pais, fo.codigo_pais, e.codigo_pais)), ''),
      NULLIF(TRIM(COALESCE(fp.federacion, f.federacion, fo.federacion)), '')
    ) AS codigo_pais,
    CONCAT_WS(
      ' - ',
      NULLIF(TRIM(r.codigo_raza), ''),
      NULLIF(TRIM(r.raza), '')
    ) AS raza,
    COALESCE(e.registro::VARCHAR, e.registro_origen::VARCHAR) AS registro,
    web.ejemplar_nombre(e.nombre, e.prefijo, e.sufijo) AS nombre_completo,
    e.fecha_nacimiento,
    CASE TRIM(UPPER(COALESCE(e.sexo, '')))
      WHEN 'H' THEN 'HEMBRA'
      WHEN 'M' THEN 'MACHO'
      ELSE NULLIF(UPPER(TRIM(e.sexo)), '')
    END AS sexo
  FROM web.ejemplares e
  JOIN web.razas r ON r.id_raza = e.id_raza
  LEFT JOIN web.federaciones f ON f.id_federacion = e.id_federacion
  LEFT JOIN web.federaciones fo ON fo.id_federacion = e.id_federacion_origen
  LEFT JOIN web.federaciones fp ON fp.codigo_pais = COALESCE(f.codigo_pais, fo.codigo_pais, e.codigo_pais)
`;

function formatPgDate(value) {
  if (value == null) return value;
  if (typeof value === "string") return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mapDetalle(row) {
  if (!row) return null;
  return {
    ...row,
    fecha_nacimiento: formatPgDate(row.fecha_nacimiento),
  };
}

function mapBuscar(row) {
  if (!row) return null;
  return {
    ...row,
    fecha_nacimiento: formatPgDate(row.fecha_nacimiento),
  };
}

/** FCA en `web.federaciones`: circuito local usa `e.id_federacion` + `e.registro`. */
const ID_FEDERACION_FCA = 1;

/** Escapa % y _ para ILIKE con caracteres literales. */
function escapeLikePattern(s) {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * @param {{
 *   id_raza?: number | string | null,
 *   id_federacion?: number | string | null,
 *   registro?: number | string | null,
 *   nombre?: string | null,
 *   limit?: number,
 *   offset?: number,
 * }} filtros Al menos uno de id_raza | id_federacion | registro | nombre debe venir con valor.
 * Con `id_federacion` + `registro`: FCA (`id_federacion` = 1) usa `e.id_federacion` + `e.registro`.
 *   Otras federaciones: `(origen + registro_origen) OR (local id_federacion + registro)` para cubrir p. ej. FCAI u otras cargadas como circuito local.
 * Con `id_federacion` sin `registro`: FCA solo `e.id_federacion`; otras `(e.id_federacion OR e.id_federacion_origen)`.
 */
export async function buscarEjemplares(filtros) {
  const {
    id_raza,
    id_federacion,
    registro,
    nombre,
    limit: rawLimit = 50,
    offset: rawOffset = 0,
  } = filtros;

  const limit = Math.min(500, Math.max(1, Number(rawLimit) || 50));
  const offset = Math.max(0, Number(rawOffset) || 0);

  const conditions = [];
  const values = [];
  let i = 1;

  if (id_raza !== undefined && id_raza !== null && id_raza !== "") {
    conditions.push(`r.id_raza = $${i}`);
    values.push(Number(id_raza));
    i += 1;
  }

  const hasFed =
    id_federacion !== undefined && id_federacion !== null && id_federacion !== "";
  const fedNum = hasFed ? Number(id_federacion) : NaN;
  const hasReg =
    registro !== undefined && registro !== null && registro !== "";
  const regTrim = hasReg ? String(registro).trim() : "";

  if (hasFed && hasReg) {
    if (fedNum === ID_FEDERACION_FCA) {
      conditions.push(`e.id_federacion = $${i}`);
      values.push(ID_FEDERACION_FCA);
      i += 1;
      conditions.push(`e.registro = $${i}`);
      values.push(Number(regTrim));
      i += 1;
    } else if (Number.isFinite(fedNum)) {
      /* Otras federaciones: puede figurar como circuito local (id_federacion + registro)
         o como origen (id_federacion_origen + registro_origen), p. ej. FCAI. */
      const pFed = i;
      const pReg = i + 1;
      i += 2;
      conditions.push(`(
        (e.id_federacion_origen = $${pFed} AND TRIM(BOTH FROM COALESCE(e.registro_origen, '')) = TRIM(BOTH FROM $${pReg}::text))
        OR
        (e.id_federacion = $${pFed} AND e.registro IS NOT NULL AND TRIM(e.registro::text) = TRIM($${pReg}::text))
      )`);
      values.push(fedNum, regTrim);
    }
  } else if (hasFed && !hasReg) {
    if (fedNum === ID_FEDERACION_FCA) {
      conditions.push(`e.id_federacion = $${i}`);
      values.push(ID_FEDERACION_FCA);
      i += 1;
    } else if (Number.isFinite(fedNum)) {
      conditions.push(
        `(e.id_federacion = $${i} OR e.id_federacion_origen = $${i})`
      );
      values.push(fedNum);
      i += 1;
    }
  } else if (!hasFed && hasReg) {
    conditions.push(
      `((e.registro IS NOT NULL AND e.registro::text = TRIM($${i}::text)) OR (TRIM(BOTH FROM COALESCE(e.registro_origen, '')) = TRIM(BOTH FROM $${i}::text)))`
    );
    values.push(regTrim);
    i += 1;
  }
  const nombreTrim = nombre != null ? String(nombre).trim() : "";
  if (nombreTrim !== "") {
    conditions.push(
      `web.ejemplar_nombre(e.nombre, e.prefijo, e.sufijo) ILIKE $${i} ESCAPE '\\'`
    );
    values.push(`%${escapeLikePattern(nombreTrim)}%`);
    i += 1;
  }

  if (conditions.length === 0) {
    const err = new Error(
      "Indicá al menos un filtro: id_raza, id_federacion, registro o nombre"
    );
    err.code = "EJEMPLARES_SIN_FILTRO";
    throw err;
  }

  values.push(limit, offset);
  const limIdx = i;
  const offIdx = i + 1;

  const sql = `
    ${SELECT_BUSCAR}
    WHERE ${conditions.join(" AND ")}
    ORDER BY nombre_completo
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const r = await query(sql, values);
  return {
    datos: r.rows.map(mapBuscar),
    limit,
    offset,
  };
}

export async function obtenerPorId(idEjemplar) {
  const r = await query(`${SELECT_DETALLE} WHERE e.id_ejemplar = $1`, [
    idEjemplar,
  ]);
  return mapDetalle(r.rows[0] ?? null);
}
