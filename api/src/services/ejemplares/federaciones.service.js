import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

/** Todas las federaciones: `codigo_pais - federacion` para selects. */
export async function listarFederaciones() {
  const r = await query(
    `SELECT
       id_federacion,
       codigo_pais,
       federacion,
       CONCAT_WS(
         ' - ',
         NULLIF(TRIM(codigo_pais), ''),
         NULLIF(TRIM(federacion), '')
       ) AS etiqueta
     FROM ${fromTable("federaciones")}
     ORDER BY federacion NULLS LAST, id_federacion`,
  );
  return r.rows;
}
