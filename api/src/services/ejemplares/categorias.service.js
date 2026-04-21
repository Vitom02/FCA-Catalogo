import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

/** Todas las filas de `web.exposiciones_categorias` (SELECT *). */
export async function listarCategorias() {
  const r = await query(`SELECT * FROM ${fromTable("exposiciones_categorias")}`);
  return r.rows;
}
