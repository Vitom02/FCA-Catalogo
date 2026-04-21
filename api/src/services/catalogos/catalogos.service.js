import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

const TABLE = fromTable("catalogos");

const COLUMNS = [
  "id_exposicion",
  "id_ejemplar",
  "id_categoria",
  "numero",
  "id_usuario",
  "fecha_insc",
];

function formatTimestamp(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    fecha_insc: formatTimestamp(row.fecha_insc),
  };
}

/**
 * @param {{ id_exposicion?: number | string | null }} [filtros]
 */
/**
 * Inscripciones de una exposición con datos para la grilla (ejemplar, categoría, usuario).
 */
export async function listarPorExposicionDetalle(idExposicion) {
  const n = Number(idExposicion);
  if (!Number.isFinite(n)) {
    const err = new Error("id_exposicion inválido");
    err.code = "CATALOGOS_FILTRO_INVALIDO";
    throw err;
  }
  const T_EC = fromTable("exposiciones_categorias");
  const T_U = fromTable("usuarios");
  const r = await query(
    `SELECT
       c.id_catalogo,
       c.id_exposicion,
       c.id_ejemplar,
       c.id_categoria,
       c.numero,
       c.id_usuario,
       c.fecha_insc,
       ec.categoria AS categoria_etiqueta,
       u.usuario AS usuario_login,
       web.ejemplar_nombre(e.nombre, e.prefijo, e.sufijo) AS nombre_completo,
       CASE TRIM(UPPER(COALESCE(e.sexo, '')))
         WHEN 'H' THEN 'HEMBRA'
         WHEN 'M' THEN 'MACHO'
         ELSE NULLIF(UPPER(TRIM(e.sexo)), '')
       END AS sexo,
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
       COALESCE(e.registro::VARCHAR, e.registro_origen::VARCHAR) AS registro
     FROM ${TABLE} c
     LEFT JOIN web.ejemplares e ON e.id_ejemplar = c.id_ejemplar
     LEFT JOIN web.razas r ON r.id_raza = e.id_raza
     LEFT JOIN web.federaciones f ON f.id_federacion = e.id_federacion
     LEFT JOIN web.federaciones fo ON fo.id_federacion = e.id_federacion_origen
     LEFT JOIN web.federaciones fp ON fp.codigo_pais = COALESCE(f.codigo_pais, fo.codigo_pais, e.codigo_pais)
     LEFT JOIN ${T_EC} ec ON ec.id_categoria = c.id_categoria
     LEFT JOIN ${T_U} u ON u.id_usuario = c.id_usuario
     WHERE c.id_exposicion = $1
     ORDER BY c.id_catalogo ASC`,
    [n]
  );
  return r.rows.map(mapRow);
}

/** Inscriptos por exposición (`COUNT` desde `web.catalogos`). */
export async function conteosPorExposicion() {
  const r = await query(
    `SELECT id_exposicion, COUNT(*)::int AS total
     FROM ${TABLE}
     GROUP BY id_exposicion
     ORDER BY id_exposicion`
  );
  return r.rows;
}

export async function listar(filtros = {}) {
  const idExpo = filtros.id_exposicion;
  if (
    idExpo !== undefined &&
    idExpo !== null &&
    String(idExpo).trim() !== ""
  ) {
    const n = Number(idExpo);
    if (!Number.isFinite(n)) {
      const err = new Error("id_exposicion inválido");
      err.code = "CATALOGOS_FILTRO_INVALIDO";
      throw err;
    }
    const r = await query(
      `SELECT * FROM ${TABLE} WHERE id_exposicion = $1 ORDER BY id_catalogo DESC`,
      [n]
    );
    return r.rows.map(mapRow);
  }
  const r = await query(
    `SELECT * FROM ${TABLE} ORDER BY id_catalogo DESC`
  );
  return r.rows.map(mapRow);
}

export async function obtenerPorId(idCatalogo) {
  const r = await query(`SELECT * FROM ${TABLE} WHERE id_catalogo = $1`, [
    idCatalogo,
  ]);
  return mapRow(r.rows[0] ?? null);
}

function optInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function optTimestamp(v) {
  if (v === undefined || v === null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function crear(payload) {
  const id_exposicion = Number(payload.id_exposicion);
  const id_ejemplar = Number(payload.id_ejemplar);
  const id_categoria = Number(payload.id_categoria);
  const id_usuario = Number(payload.id_usuario);
  const numero = optInt(payload.numero);
  const fechaInsc = optTimestamp(payload.fecha_insc);

  const r = await query(
    `INSERT INTO ${TABLE} (
       id_exposicion, id_ejemplar, id_categoria, numero, id_usuario, fecha_insc
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
     RETURNING id_catalogo`,
    [
      id_exposicion,
      id_ejemplar,
      id_categoria,
      numero,
      id_usuario,
      fechaInsc,
    ]
  );
  return obtenerPorId(r.rows[0].id_catalogo);
}

/**
 * Actualiza solo las columnas presentes en `payload` (excepto id_catalogo).
 */
export async function actualizar(idCatalogo, payload) {
  const updates = [];
  const values = [];
  let i = 1;

  for (const col of COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(payload, col)) {
      let v = payload[col];
      if (col === "numero") {
        v = optInt(v);
      } else if (col === "fecha_insc") {
        if (v === null || v === "") {
          const err = new Error("fecha_insc no puede ser vacía");
          err.code = "CATALOGOS_FECHA_INVALIDA";
          throw err;
        }
        const ts = optTimestamp(v);
        if (ts == null) {
          const err = new Error("fecha_insc inválida");
          err.code = "CATALOGOS_FECHA_INVALIDA";
          throw err;
        }
        v = ts;
      } else {
        const n = Number(v);
        v = Number.isFinite(n) ? Math.trunc(n) : v;
      }
      updates.push(`${col} = $${i}`);
      values.push(v);
      i += 1;
    }
  }

  if (updates.length === 0) {
    return obtenerPorId(idCatalogo);
  }

  values.push(idCatalogo);
  await query(
    `UPDATE ${TABLE} SET ${updates.join(", ")} WHERE id_catalogo = $${i}`,
    values
  );
  return obtenerPorId(idCatalogo);
}

export async function eliminar(idCatalogo) {
  const r = await query(
    `DELETE FROM ${TABLE} WHERE id_catalogo = $1 RETURNING id_catalogo`,
    [idCatalogo]
  );
  return r.rowCount > 0;
}
