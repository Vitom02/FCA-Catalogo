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

/**
 * CTE + ventanas (`COUNT(*) OVER (PARTITION BY …)`), sin `GROUP BY`.
 * Usa `web.razas.id_grupo` → `web.razas_grupos` para la etiqueta del grupo.
 * Migración 010 asegura la columna en `razas` si faltara. NULL/0 = "Sin grupo".
 * @param {number | string | null} idExposicion
 * @returns {Promise<{ grupos: object[], totales_por_categoria: object[] }>}
 */
export async function resumenAgrupadoPorExposicion(idExposicion) {
  const n = Number(idExposicion);
  if (!Number.isFinite(n)) {
    const err = new Error("id_exposicion inválido");
    err.code = "CATALOGOS_FILTRO_INVALIDO";
    throw err;
  }

  const T_EC = fromTable("exposiciones_categorias");

  const baseCte = `
    WITH base AS (
      SELECT
        c.id_exposicion,
        c.id_catalogo,
        c.id_categoria,
        COALESCE(e.id_raza, 0)::int AS id_raza,
        COALESCE(r.id_grupo, 0)::int AS id_grupo,
        CASE
          WHEN COALESCE(r.id_grupo, 0) = 0 THEN 'Sin grupo'
          ELSE COALESCE(
            NULLIF(TRIM(rg.grupo), ''),
            'Grupo ' || r.id_grupo::text
          )
        END AS etiqueta_grupo,
        COALESCE(
          NULLIF(TRIM(r.codigo_raza), ''),
          NULLIF(TRIM(r.raza), ''),
          'Raza ' || COALESCE(e.id_raza, 0)::text
        ) AS etiqueta_raza,
        COALESCE(
          NULLIF(TRIM(ec.categoria), ''),
          'Cat. ' || c.id_categoria::text
        ) AS categoria_etiqueta
      FROM ${TABLE} c
      INNER JOIN web.ejemplares e ON e.id_ejemplar = c.id_ejemplar
      LEFT JOIN web.razas r ON r.id_raza = e.id_raza
      LEFT JOIN web.razas_grupos rg ON rg.id_grupo = r.id_grupo
      LEFT JOIN ${T_EC} ec ON ec.id_categoria = c.id_categoria
      WHERE c.id_exposicion = $1
    )`;

  const rCeldas = await query(
    `${baseCte}
     SELECT DISTINCT ON (b.id_grupo, b.id_raza, b.id_categoria)
       b.id_grupo,
       b.etiqueta_grupo,
       b.id_raza,
       b.etiqueta_raza,
       b.id_categoria,
       b.categoria_etiqueta,
       (COUNT(*) OVER (PARTITION BY b.id_exposicion, b.id_grupo))::int AS n_grupo,
       (COUNT(*) OVER (PARTITION BY b.id_exposicion, b.id_grupo, b.id_raza))::int
         AS n_raza,
       (COUNT(*) OVER (
         PARTITION BY b.id_exposicion, b.id_grupo, b.id_raza, b.id_categoria
       ))::int AS n_celda
     FROM base b
     ORDER BY b.id_grupo, b.id_raza, b.id_categoria, b.id_catalogo`,
    [n]
  );

  const rCat = await query(
    `${baseCte}
     SELECT DISTINCT ON (b.id_categoria)
       b.id_categoria,
       b.categoria_etiqueta,
       (COUNT(*) OVER (PARTITION BY b.id_exposicion, b.id_categoria))::int AS total
     FROM base b
     ORDER BY b.id_categoria, b.id_catalogo`,
    [n]
  );

  return {
    grupos: buildResumenArbol(rCeldas.rows),
    totales_por_categoria: (rCat.rows || []).map((row) => ({
      id_categoria: row.id_categoria,
      categoria: row.categoria_etiqueta,
      total: row.total,
    })),
  };
}

/**
 * @param {Record<string, unknown>[]} celdas
 */
function buildResumenArbol(celdas) {
  if (!Array.isArray(celdas) || celdas.length === 0) {
    return [];
  }
  const byG = new Map();
  for (const row of celdas) {
    const gk = Number(row.id_grupo);
    const gKey = Number.isFinite(gk) ? gk : 0;
    if (!byG.has(gKey)) {
      byG.set(gKey, {
        id_grupo: gKey,
        etiqueta_grupo: String(row.etiqueta_grupo ?? "Sin grupo"),
        total: Number(row.n_grupo) || 0,
        razas: new Map(),
      });
    }
    const g = byG.get(gKey);
    const rk = Number(row.id_raza);
    const rKey = Number.isFinite(rk) ? rk : 0;
    if (!g.razas.has(rKey)) {
      g.razas.set(rKey, {
        id_raza: rKey,
        etiqueta_raza: String(row.etiqueta_raza ?? "—"),
        total: Number(row.n_raza) || 0,
        categorias: [],
      });
    }
    g.razas.get(rKey).categorias.push({
      id_categoria: row.id_categoria,
      categoria: String(row.categoria_etiqueta ?? "—"),
      total: Number(row.n_celda) || 0,
    });
  }
  return [...byG.values()]
    .map((g) => ({
      id_grupo: g.id_grupo,
      etiqueta_grupo: g.etiqueta_grupo,
      total: g.total,
      razas: [...g.razas.values()].sort((a, b) =>
        a.etiqueta_raza.localeCompare(b.etiqueta_raza, "es", {
          sensitivity: "base",
        })
      ),
    }))
    .sort((a, b) => {
      if (a.id_grupo === 0) return 1;
      if (b.id_grupo === 0) return -1;
      return a.id_grupo - b.id_grupo;
    });
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
