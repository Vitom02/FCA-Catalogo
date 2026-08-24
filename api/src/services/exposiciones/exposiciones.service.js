import { query } from "../../database/index.js";

/** Coinciden con web.exposiciones_estados (migración). */
const ID_ESTADO_ABIERTO = 1;
const ID_ESTADO_CERRADO = 2;
const ID_ESTADO_FINALIZADO = 3;

const COLUMNS = [
  "exposicion",
  "desde",
  "hasta",
  "id_club",
  "id_tipo",
  "ano",
  "id_mes",
  "id_estado",
  "organizador",
  "texto1",
  "texto2",
  "texto3",
  "texto4",
  "texto5",
  "latitud",
  "longitud",
  "ubicacion",
  "cantidad",
  "numeros_extra_razas",
  "numeros_extra_cachorros",
  "tipo_numeracion",
];

const COLUMNAS_ENTERAS_OPCIONALES = new Set([
  "cantidad",
  "numeros_extra_razas",
  "numeros_extra_cachorros",
]);

/** BD legada: NOT NULL en texto; sin valor → '' */
const COLUMNAS_TEXTO_NOT_NULL_LEGACY = new Set([
  "organizador",
  "texto1",
  "texto2",
  "texto3",
  "texto4",
  "texto5",
  "ubicacion",
]);

/** BD legada: lat/long NOT NULL; sin valor → 0 (marcador “sin coordenadas”). */
const COLUMNAS_COORD_NOT_NULL_LEGACY = new Set(["latitud", "longitud"]);

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
    e.id_estado,
    es.estado AS estado_exposicion,
    e.organizador,
    e.texto1,
    e.texto2,
    e.texto3,
    e.texto4,
    e.texto5,
    e.latitud,
    e.longitud,
    e.ubicacion,
    e.cantidad,
    e.numeros_extra_razas,
    e.numeros_extra_cachorros,
    e.tipo_numeracion,
    e.cerrado_manual,
    cl.club AS club
  FROM exposiciones e
  LEFT JOIN clubes cl ON cl.id_club = e.id_club
  LEFT JOIN exposiciones_estados es ON es.id_estado = e.id_estado
`;

/**
 * Por club organizador (`id_club` + nombre de club no vacío):
 * - **Finalizado** si `hasta` no es nula y `hasta::date < CURRENT_DATE`.
 * - **Cerrado** desde **2 días antes** del inicio: `CURRENT_DATE >= desde::date - 2`.
 * - Entre torneos aún no finalizados y antes de esa ventana: **un solo Abierto** por club
 *   (el de `desde` más temprano); el resto **Cerrado** (nunca dos abiertos del mismo club).
 * - Alta de un torneo posterior con otro abierto: queda **Cerrado** al recalcular.
 * - **`cerrado_manual`**: el administrador cerró la exposición a mano → **Cerrado** y no compite
 *   por “abierto”; la **siguiente** del club puede quedar abierta. El flag se borra al **finalizar**
 *   o al aplicar el cierre automático **2 días antes** del inicio.
 * **Sin club**: vigente → Abierto; post `hasta` → Finalizado.
 */
export async function aplicarReglasEstadoPorClubOrganizador() {
  await query(
    `WITH e2 AS (
        SELECT
          e.id_exposicion,
          e.id_club,
          e.desde,
          e.hasta,
          COALESCE(e.cerrado_manual, false) AS cerrado_manual,
          cl.club
        FROM exposiciones e
        LEFT JOIN clubes cl ON cl.id_club = e.id_club
      ),
      labeled AS (
        SELECT
          id_exposicion,
          id_club,
          desde,
          hasta,
          cerrado_manual,
          club,
          (
            id_club IS NULL
            OR TRIM(COALESCE(club::text, '')) = ''
          ) AS sin_club_valido,
          (
            hasta IS NOT NULL
            AND hasta::date < CURRENT_DATE
          ) AS es_finalizado,
          (
            desde IS NOT NULL
            AND CURRENT_DATE >= (desde::date - 2)
          ) AS cerrado_anticipo
        FROM e2
      ),
      candidatos AS (
        SELECT
          l.id_exposicion,
          l.id_club,
          ROW_NUMBER() OVER (
            PARTITION BY l.id_club
            ORDER BY l.desde ASC NULLS LAST, l.id_exposicion ASC
          ) AS rn
        FROM labeled l
        WHERE NOT l.sin_club_valido
          AND NOT l.es_finalizado
          AND NOT l.cerrado_anticipo
          AND NOT l.cerrado_manual
      ),
      t AS (
        SELECT
          l.id_exposicion,
          CASE
            WHEN l.sin_club_valido THEN
              CASE
                WHEN l.es_finalizado THEN $3::smallint
                ELSE $1::smallint
              END
            WHEN l.es_finalizado THEN $3::smallint
            WHEN l.cerrado_manual THEN $2::smallint
            WHEN l.cerrado_anticipo THEN $2::smallint
            WHEN c.rn = 1 THEN $1::smallint
            ELSE $2::smallint
          END AS id_estado,
          CASE
            WHEN l.sin_club_valido THEN false
            WHEN l.es_finalizado THEN false
            WHEN l.cerrado_anticipo THEN false
            ELSE l.cerrado_manual
          END AS nuevo_cerrado_manual
        FROM labeled l
        LEFT JOIN candidatos c ON c.id_exposicion = l.id_exposicion
      )
      UPDATE exposiciones e
      SET
        id_estado = t.id_estado,
        cerrado_manual = t.nuevo_cerrado_manual
      FROM t
      WHERE e.id_exposicion = t.id_exposicion
        AND (
          e.id_estado IS DISTINCT FROM t.id_estado
          OR COALESCE(e.cerrado_manual, false) IS DISTINCT FROM t.nuevo_cerrado_manual
        )`,
    [ID_ESTADO_ABIERTO, ID_ESTADO_CERRADO, ID_ESTADO_FINALIZADO]
  );
}

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

/** Catálogo para formularios (orden por id). */
export async function listarEstados() {
  const r = await query(
    `SELECT id_estado, estado FROM exposiciones_estados ORDER BY id_estado ASC`
  );
  return r.rows;
}

/** Todas las filas, más recientes por fecha de inicio primero. */
export async function listar() {
  await aplicarReglasEstadoPorClubOrganizador();
  const r = await query(
    `${SELECT_BASE} ORDER BY e.desde DESC, e.id_exposicion DESC`
  );
  return r.rows.map(mapRow);
}

/** Misma lectura (con JOIN club) filtrada por id_club. */
export async function listarPorIdClub(idClub) {
  await aplicarReglasEstadoPorClubOrganizador();
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
  await aplicarReglasEstadoPorClubOrganizador();
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

/** Texto para columnas NOT NULL en BD legada (vacío → '' en lugar de NULL). */
function strNotNull(v) {
  const s = optStr(v);
  return s === null ? "" : s;
}

function optNum(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coordLegacyNN(v) {
  const n = optNum(v);
  return n === null ? 0 : n;
}

function optIntNullable(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseIdClubObligatorio(v) {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/** 1 = manual, 2 = automática. Por omisión: automática. */
function parseTipoNumeracionCreacion(v) {
  const n = Number(v);
  if (n === 1 || n === 2) return n;
  return 2;
}

function parseTipoNumeracionActualizacion(v) {
  const n = Number(v);
  if (n === 1 || n === 2) return n;
  const err = new Error("tipo_numeracion debe ser 1 (manual) o 2 (automática)");
  err.code = "EXPO_TIPO_NUMERACION_INVALIDO";
  throw err;
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
    cantidad,
    numeros_extra_razas,
    numeros_extra_cachorros,
    tipo_numeracion,
  } = payload;

  const idClub = parseIdClubObligatorio(id_club);
  if (idClub == null) {
    const err = new Error("id_club inválido");
    err.code = "EXPO_ID_CLUB_INVALIDO";
    throw err;
  }

  const tipoNum = parseTipoNumeracionCreacion(tipo_numeracion);

  const r = await query(
    `INSERT INTO exposiciones (
      exposicion, desde, hasta, id_club, id_tipo, ano, id_mes,
      organizador, texto1, texto2, texto3, texto4, texto5,
      latitud, longitud, ubicacion,
      cantidad, numeros_extra_razas, numeros_extra_cachorros,
      tipo_numeracion
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16,
      $17, $18, $19,
      $20
    )
    RETURNING id_exposicion`,
    [
      String(exposicion).trim(),
      desde,
      hasta,
      idClub,
      Number(id_tipo),
      Number(ano),
      Number(id_mes),
      strNotNull(organizador),
      strNotNull(texto1),
      strNotNull(texto2),
      strNotNull(texto3),
      strNotNull(texto4),
      strNotNull(texto5),
      coordLegacyNN(latitud),
      coordLegacyNN(longitud),
      strNotNull(ubicacion),
      optIntNullable(cantidad),
      optIntNullable(numeros_extra_razas),
      optIntNullable(numeros_extra_cachorros),
      tipoNum,
    ]
  );
  await aplicarReglasEstadoPorClubOrganizador();
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
    if (col === "id_estado") continue;
    if (!Object.prototype.hasOwnProperty.call(payload, col)) {
      continue;
    }
    updates.push(`${col} = $${i}`);
    let v = payload[col];
    if (col === "tipo_numeracion") {
      v = parseTipoNumeracionActualizacion(v);
    } else if (COLUMNAS_ENTERAS_OPCIONALES.has(col)) {
      v = optIntNullable(v);
    } else if (COLUMNAS_TEXTO_NOT_NULL_LEGACY.has(col)) {
      v = strNotNull(v);
    } else if (COLUMNAS_COORD_NOT_NULL_LEGACY.has(col)) {
      v = coordLegacyNN(v);
    } else if (col === "id_club") {
      const ic = parseIdClubObligatorio(v);
      if (ic == null) {
        const err = new Error("id_club inválido");
        err.code = "EXPO_ID_CLUB_INVALIDO";
        throw err;
      }
      v = ic;
    }
    values.push(v);
    i += 1;
  }

  if (Object.prototype.hasOwnProperty.call(payload ?? {}, "cerrado_manual")) {
    const cm = payload.cerrado_manual;
    if (typeof cm !== "boolean") {
      const err = new Error("cerrado_manual debe ser true o false");
      err.code = "EXPO_CERRADO_MANUAL_INVALIDO";
      throw err;
    }
    updates.push(`cerrado_manual = $${i}`);
    values.push(cm);
    i += 1;
  }

  if (updates.length > 0) {
    values.push(idExposicion);
    await query(
      `UPDATE exposiciones SET ${updates.join(", ")}
       WHERE id_exposicion = $${i}`,
      values
    );
  }
  await aplicarReglasEstadoPorClubOrganizador();
  return obtenerPorId(idExposicion);
}

export async function eliminar(idExposicion) {
  const r = await query(
    `DELETE FROM exposiciones WHERE id_exposicion = $1 RETURNING id_exposicion`,
    [idExposicion]
  );
  const ok = r.rowCount > 0;
  if (ok) {
    await aplicarReglasEstadoPorClubOrganizador();
  }
  return ok;
}
