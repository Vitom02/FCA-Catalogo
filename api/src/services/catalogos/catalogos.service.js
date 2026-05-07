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

/** Fecha calendario (solo día) para JSON estable; evita corrimientos en date-only. */
function formatDateOnly(value) {
  if (value == null || value === "") return value;
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    fecha_insc: formatTimestamp(row.fecha_insc),
    fecha_nacimiento: formatDateOnly(row.fecha_nacimiento),
  };
}

/**
 * Detalle de inscriptos (grilla + PDF). Un solo parámetro: `id_exposicion`.
 * Propietario y criador se calculan con CTEs + JOIN (no subconsultas por fila), para escalar
 * con muchas inscripciones. Índices: migración `020_catalogos_detalle_indexes.sql`.
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
    `WITH catalogo_ejemplares AS (
       SELECT DISTINCT c.id_ejemplar
       FROM ${TABLE} c
       WHERE c.id_exposicion = $1
     ),
     propietarios_agg AS (
       SELECT
         pe.id_ejemplar,
         STRING_AGG(
           TRIM(CONCAT_WS(' ', p.nombre::text, p.apellido::text)),
           ', '
           ORDER BY p.apellido, p.nombre, p.id_propietario
         ) AS propietario
       FROM catalogo_ejemplares ce
       JOIN web.propiedades_ejemplares pe ON pe.id_ejemplar = ce.id_ejemplar
       JOIN web.propiedades_propietarios pp ON pp.id_propiedad = pe.id_propiedad
       JOIN web.propietarios p ON p.id_propietario = pp.id_propietario
       WHERE pe.hasta IS NULL
       GROUP BY pe.id_ejemplar
     ),
     criadores_agg AS (
       SELECT
         ej.id_ejemplar,
         STRING_AGG(
           TRIM(CONCAT_WS(' ', p.nombre::text, p.apellido::text)),
           ', '
           ORDER BY p.apellido, p.nombre, p.id_propietario
         ) AS criador
       FROM catalogo_ejemplares ce
       JOIN web.ejemplares ej ON ej.id_ejemplar = ce.id_ejemplar
       JOIN web.servicios s ON s.id_servicio = ej.id_servicio
       JOIN web.criaderos cr ON cr.id_criadero = s.id_criadero
       JOIN web.propiedades_propietarios pp ON pp.id_propiedad = cr.id_propiedad
       JOIN web.propietarios p ON p.id_propietario = pp.id_propietario
       GROUP BY ej.id_ejemplar
     )
     SELECT
       c.id_catalogo,
       c.id_exposicion,
       c.id_ejemplar,
       c.id_categoria,
       c.numero,
       c.id_usuario,
       c.fecha_insc,
       x.exposicion AS exposicion_descripcion,
       x.desde AS exposicion_desde,
       x.hasta AS exposicion_hasta,
       cu.club AS exposicion_club,
       ec.categoria AS categoria_etiqueta,
       u.usuario AS usuario_login,
       web.ejemplar_nombre(e.nombre, e.prefijo, e.sufijo) AS nombre_completo,
       CASE TRIM(UPPER(COALESCE(e.sexo, '')))
         WHEN 'H' THEN 'HEMBRA'
         WHEN 'M' THEN 'MACHO'
         ELSE NULLIF(UPPER(TRIM(e.sexo)), '')
       END AS sexo,
       COALESCE(f.codigo_pais, fo.codigo_pais) AS codigo_pais,
       COALESCE(f.codigo_pais, fo.codigo_pais, e.codigo_pais) AS codigo_pais_federacion,
       CASE WHEN e.id_federacion IS NULL THEN 'I' ELSE 'N' END AS nacional_importado,
       NULLIF(TRIM(r.raza), '') AS raza,
       NULLIF(TRIM(COALESCE(r.codigo_raza, e.codigo_raza)), '') AS codigo_raza,
       COALESCE(r.id_grupo, 0)::int AS id_grupo,
       COALESCE(e.id_raza, 0)::int AS id_raza,
       CASE
         WHEN COALESCE(r.id_grupo, 0) = 0 THEN 'Sin grupo'
         ELSE COALESCE(
           NULLIF(TRIM(rg.grupo), ''),
           'Grupo ' || r.id_grupo::text
         )
       END AS grupo_etiqueta,
       COALESCE(e.registro::VARCHAR, e.registro_origen::VARCHAR) AS registro,
       NULLIF(TRIM(COALESCE(e.microchip, '')), '') AS microchip,
       NULLIF(TRIM(COALESCE(r.funcion, '')), '') AS raza_funcion,
       NULLIF(TRIM(COALESCE(r.descripcion, '')), '') AS raza_descripcion,
       NULLIF(TRIM(COALESCE(pai.pais::text, '')), '') AS raza_trayectoria,
       e.fecha_nacimiento,
       NULLIF(
         TRIM(COALESCE(web.ejemplar_nombre(ep.nombre, ep.prefijo, ep.sufijo), '')),
         ''
       ) AS nombre_padre,
       NULLIF(
         TRIM(COALESCE(web.ejemplar_nombre(em.nombre, em.prefijo, em.sufijo), '')),
         ''
       ) AS nombre_madre,
       NULLIF(TRIM(COALESCE(pa.propietario, '')), '') AS propietario,
       NULLIF(TRIM(COALESCE(ca.criador, '')), '') AS criador
     FROM web.exposiciones x
     LEFT JOIN web.clubes cu ON cu.id_club = x.id_club
     JOIN ${TABLE} c ON c.id_exposicion = x.id_exposicion
     JOIN ${T_EC} ec ON ec.id_categoria = c.id_categoria
     JOIN web.ejemplares e ON e.id_ejemplar = c.id_ejemplar
     LEFT JOIN web.federaciones f ON f.id_federacion = e.id_federacion
     LEFT JOIN web.federaciones fo ON fo.id_federacion = e.id_federacion_origen
     JOIN web.razas r ON r.id_raza = e.id_raza
     LEFT JOIN web.paises pai ON pai.id_pais = r.id_pais
     LEFT JOIN web.ejemplares ep ON ep.id_ejemplar = e.id_ejemplar_padre
     LEFT JOIN web.ejemplares em ON em.id_ejemplar = e.id_ejemplar_madre
     LEFT JOIN web.razas_grupos rg ON rg.id_grupo = r.id_grupo
     LEFT JOIN ${T_U} u ON u.id_usuario = c.id_usuario
     LEFT JOIN propietarios_agg pa ON pa.id_ejemplar = e.id_ejemplar
     LEFT JOIN criadores_agg ca ON ca.id_ejemplar = e.id_ejemplar
     WHERE c.id_exposicion = $1
     ORDER BY r.id_grupo, r.raza, e.sexo, c.id_categoria, e.fecha_nacimiento NULLS LAST, c.id_catalogo`,
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
