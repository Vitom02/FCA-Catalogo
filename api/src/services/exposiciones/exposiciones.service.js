import { query } from "../../database/index.js";

const COLUMNS = [
  "exposicion",
  "desde",
  "hasta",
  "id_club",
  "id_tipo",
  "ano",
  "id_mes",
  "organizador",
  "texto1",
  "texto2",
  "texto3",
  "texto4",
  "texto5",
  "latitud",
  "longitud",
  "ubicacion",
];

/** Lecturas con nombre del club (JOIN clubes.club). */
const SELECT_BASE = `
  SELECT
    e.id_exposicion,
    e.exposicion,
    e.desde,
    e.hasta,
    e.id_club,
    e.id_tipo,
    e.ano,
    e.id_mes,
    e.organizador,
    e.texto1,
    e.texto2,
    e.texto3,
    e.texto4,
    e.texto5,
    e.latitud,
    e.longitud,
    e.ubicacion,
    cl.club AS club
  FROM exposiciones e
  LEFT JOIN clubes cl ON cl.id_club = e.id_club
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

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    desde: formatPgDate(row.desde),
    hasta: formatPgDate(row.hasta),
  };
}

/** Todas las filas, más recientes por fecha de inicio primero. */
export async function listar() {
  const r = await query(
    `${SELECT_BASE} ORDER BY e.desde DESC, e.id_exposicion DESC`
  );
  return r.rows.map(mapRow);
}

/** Misma lectura (con JOIN club) filtrada por id_club. */
export async function listarPorIdClub(idClub) {
  const r = await query(
    `${SELECT_BASE}
     WHERE e.id_club = $1
     ORDER BY e.desde DESC, e.id_exposicion DESC`,
    [idClub]
  );
  return r.rows.map(mapRow);
}

/**
 * Exposiciones con fecha de inicio >= hoy (incluye las que empiezan hoy).
 * “Más adelante que el día de hoy” = próximas por calendario de inicio.
 */
export async function listarProximas() {
  const r = await query(
    `${SELECT_BASE}
     WHERE e.desde >= CURRENT_DATE
     ORDER BY e.desde ASC, e.id_exposicion ASC`
  );
  return r.rows.map(mapRow);
}

export async function obtenerPorId(idExposicion) {
  const r = await query(`${SELECT_BASE} WHERE e.id_exposicion = $1`, [
    idExposicion,
  ]);
  return mapRow(r.rows[0] ?? null);
}

function optStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function optNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function crear(payload) {
  const {
    exposicion,
    desde,
    hasta,
    id_club,
    id_tipo,
    ano,
    id_mes,
    organizador,
    texto1,
    texto2,
    texto3,
    texto4,
    texto5,
    latitud,
    longitud,
    ubicacion,
  } = payload;

  const r = await query(
    `INSERT INTO exposiciones (
      exposicion, desde, hasta, id_club, id_tipo, ano, id_mes,
      organizador, texto1, texto2, texto3, texto4, texto5,
      latitud, longitud, ubicacion
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16
    )
    RETURNING id_exposicion`,
    [
      String(exposicion).trim(),
      desde,
      hasta,
      Number(id_club),
      Number(id_tipo),
      Number(ano),
      Number(id_mes),
      optStr(organizador),
      optStr(texto1),
      optStr(texto2),
      optStr(texto3),
      optStr(texto4),
      optStr(texto5),
      optNum(latitud),
      optNum(longitud),
      optStr(ubicacion),
    ]
  );
  return obtenerPorId(r.rows[0].id_exposicion);
}

/**
 * Actualiza solo las columnas enviadas en `payload` (excepto id_exposicion).
 */
export async function actualizar(idExposicion, payload) {
  const updates = [];
  const values = [];
  let i = 1;

  for (const col of COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(payload, col)) {
      updates.push(`${col} = $${i}`);
      values.push(payload[col]);
      i += 1;
    }
  }

  if (updates.length === 0) {
    return obtenerPorId(idExposicion);
  }

  values.push(idExposicion);
  await query(
    `UPDATE exposiciones SET ${updates.join(", ")}
     WHERE id_exposicion = $${i}`,
    values
  );
  return obtenerPorId(idExposicion);
}

export async function eliminar(idExposicion) {
  const r = await query(
    `DELETE FROM exposiciones WHERE id_exposicion = $1 RETURNING id_exposicion`,
    [idExposicion]
  );
  return r.rowCount > 0;
}
