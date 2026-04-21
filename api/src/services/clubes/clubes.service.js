import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

const TABLE = fromTable("clubes");

/** Todas las filas de `web.clubes` (o el esquema configurado), ordenadas por nombre. */
export async function listar() {
  const r = await query(`SELECT * FROM ${TABLE} ORDER BY club`);
  return r.rows;
}
