import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

/** Todas las razas: `codigo_raza - raza` para selects (`web.razas`). */
export async function listarRazas() {
  const r = await query(
    `SELECT
       id_raza,
       codigo_raza,
       raza,
       CONCAT_WS(
         ' - ',
         NULLIF(TRIM(codigo_raza), ''),
         NULLIF(TRIM(raza), '')
       ) AS etiqueta
     FROM ${fromTable("razas")}
     ORDER BY raza NULLS LAST, id_raza`,
  );
  return r.rows;
}
