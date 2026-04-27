import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

const TABLE_CATEGORIAS = fromTable("usuarios_categorias");
const TABLE_USUARIOS = fromTable("usuarios");

const USUARIO_COLUMNS = [
  "nombre",
  "apellido",
  "id_club",
  "id_categoria",
  "usuario",
  "clave",
  "baja",
];

function optInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function optBool(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "boolean") return v;
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  return Boolean(v);
}

function optStr(v, maxLen) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (maxLen && s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

/**
 * @param {Record<string, unknown> | null} row
 * @param {boolean} [incluirClave] si true, se devuelve el campo `clave` (p. ej. listado de administración).
 */
function mapUsuario(row, incluirClave = false) {
  if (!row) return null;
  if (incluirClave) {
    return { ...row };
  }
  const { clave: _c, ...rest } = row;
  return rest;
}

function parseIncluirClave(raw) {
  if (raw === true) return true;
  if (raw === false) return false;
  const s = String(raw ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function parseIncluirBaja(raw) {
  if (raw === true) return true;
  if (raw === false) return false;
  const s = String(raw ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

// --- usuarios_categorias ---

/**
 * @param {{ incluir_baja?: boolean }} [opts]
 */
export async function listarCategorias(opts = {}) {
  const incluir = parseIncluirBaja(opts.incluir_baja);
  const where = incluir ? "" : " WHERE baja = false";
  const r = await query(
    `SELECT id_categoria, categoria, baja FROM ${TABLE_CATEGORIAS}${where} ORDER BY id_categoria`
  );
  return r.rows;
}

export async function obtenerCategoriaPorId(idCategoria) {
  const r = await query(
    `SELECT id_categoria, categoria, baja FROM ${TABLE_CATEGORIAS} WHERE id_categoria = $1`,
    [idCategoria]
  );
  return r.rows[0] ?? null;
}

// --- usuarios ---

/**
 * @param {{
 *   incluir_baja?: boolean;
 *   id_club?: number | string | null;
 *   id_categoria?: number | string | null;
 *   incluir_clave?: boolean | string | null;
 * }} [filtros]
 */
export async function listar(filtros = {}) {
  const incluir = parseIncluirBaja(filtros.incluir_baja);
  const incluirClave = parseIncluirClave(filtros.incluir_clave);
  const cond = [];
  const params = [];
  let p = 1;

  if (!incluir) {
    cond.push(`u.baja = false`);
  }
  const idClub = optInt(filtros.id_club);
  if (idClub != null) {
    cond.push(`u.id_club = $${p}`);
    params.push(idClub);
    p += 1;
  }
  const idCat = optInt(filtros.id_categoria);
  if (idCat != null) {
    cond.push(`u.id_categoria = $${p}`);
    params.push(idCat);
    p += 1;
  }

  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const colClave = incluirClave ? `, u.clave` : "";

  const r = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.id_club, u.id_categoria, u.usuario, u.baja,
            c.categoria AS categoria_nombre${colClave}
     FROM ${TABLE_USUARIOS} u
     LEFT JOIN ${TABLE_CATEGORIAS} c ON c.id_categoria = u.id_categoria
     ${where}
     ORDER BY u.id_usuario`,
    params
  );
  return r.rows.map((row) => mapUsuario(row, incluirClave));
}

/**
 * @param {number} idUsuario
 * @param {{ incluir_clave?: boolean | string | null }} [opts] si `incluir_clave`, la respuesta incluye la clave (texto plano).
 */
export async function obtenerPorId(idUsuario, opts = {}) {
  const incluirClave = parseIncluirClave(opts.incluir_clave);
  const colClave = incluirClave ? `, u.clave` : "";
  const r = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.id_club, u.id_categoria, u.usuario, u.baja,
            c.categoria AS categoria_nombre${colClave}
     FROM ${TABLE_USUARIOS} u
     LEFT JOIN ${TABLE_CATEGORIAS} c ON c.id_categoria = u.id_categoria
     WHERE u.id_usuario = $1`,
    [idUsuario]
  );
  return mapUsuario(r.rows[0] ?? null, incluirClave);
}

/**
 * Login por `usuario` + `clave` (texto plano, igual que en BD). Sin baja.
 * @returns {Promise<Record<string, unknown> | null>} Usuario sin `clave`, o null si falla.
 */
export async function loginPorUsuarioYClave(usuarioRaw, claveRaw) {
  const usuario = optStr(usuarioRaw, 20);
  const clave = claveRaw != null ? String(claveRaw) : "";
  if (!usuario || !clave) {
    const err = new Error("usuario y clave son obligatorios");
    err.code = "USUARIOS_VALIDACION";
    throw err;
  }
  const r = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.id_club, u.id_categoria, u.usuario, u.baja,
            u.clave, c.categoria AS categoria_nombre
     FROM ${TABLE_USUARIOS} u
     LEFT JOIN ${TABLE_CATEGORIAS} c ON c.id_categoria = u.id_categoria
     WHERE LOWER(TRIM(u.usuario)) = LOWER(TRIM($1::text)) AND u.baja = false`,
    [usuario]
  );
  const row = r.rows[0];
  if (!row) return null;
  if (row.clave !== clave) return null;
  return mapUsuario(row);
}

export async function crear(payload) {
  const nombre = optStr(payload.nombre, 30) ?? "";
  const apellido = optStr(payload.apellido, 30) ?? "";
  const id_club = optInt(payload.id_club);
  const id_categoria = Number(payload.id_categoria);
  const usuario = optStr(payload.usuario, 20);
  const clave = payload.clave != null ? String(payload.clave) : "";

  if (!usuario) {
    const err = new Error("usuario es obligatorio");
    err.code = "USUARIOS_VALIDACION";
    throw err;
  }
  if (!clave) {
    const err = new Error("clave es obligatoria");
    err.code = "USUARIOS_VALIDACION";
    throw err;
  }
  if (!Number.isFinite(id_categoria)) {
    const err = new Error("id_categoria inválido");
    err.code = "USUARIOS_VALIDACION";
    throw err;
  }

  const r = await query(
    `INSERT INTO ${TABLE_USUARIOS} (
       nombre, apellido, id_club, id_categoria, usuario, clave, baja
     ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false))
     RETURNING id_usuario`,
    [nombre, apellido, id_club, id_categoria, usuario, clave, optBool(payload.baja)]
  );
  return obtenerPorId(r.rows[0].id_usuario);
}

export async function actualizar(idUsuario, payload) {
  const updates = [];
  const values = [];
  let i = 1;

  for (const col of USUARIO_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(payload, col)) continue;

    let v = payload[col];
    if (col === "nombre") {
      v = optStr(v, 30) ?? "";
    } else if (col === "apellido") {
      v = optStr(v, 30) ?? "";
    } else if (col === "usuario") {
      v = optStr(v, 20);
      if (!v) {
        const err = new Error("usuario no puede ser vacío");
        err.code = "USUARIOS_VALIDACION";
        throw err;
      }
    } else if (col === "clave") {
      v = String(v);
      if (!v) {
        const err = new Error("clave no puede ser vacía");
        err.code = "USUARIOS_VALIDACION";
        throw err;
      }
    } else if (col === "id_club") {
      v = optInt(v);
    } else if (col === "id_categoria") {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        const err = new Error("id_categoria inválido");
        err.code = "USUARIOS_VALIDACION";
        throw err;
      }
      v = Math.trunc(n);
    } else if (col === "baja") {
      v = optBool(v);
      if (v === null) {
        const err = new Error("baja inválida");
        err.code = "USUARIOS_VALIDACION";
        throw err;
      }
    }

    updates.push(`${col} = $${i}`);
    values.push(v);
    i += 1;
  }

  if (updates.length === 0) {
    return obtenerPorId(idUsuario);
  }

  values.push(idUsuario);
  await query(
    `UPDATE ${TABLE_USUARIOS} SET ${updates.join(", ")} WHERE id_usuario = $${i}`,
    values
  );
  return obtenerPorId(idUsuario);
}

export async function eliminar(idUsuario) {
  const r = await query(
    `UPDATE ${TABLE_USUARIOS} SET baja = true WHERE id_usuario = $1 AND baja = false RETURNING id_usuario`,
    [idUsuario]
  );
  return r.rowCount > 0;
}
