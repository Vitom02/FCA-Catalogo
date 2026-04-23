import { query, SCHEMA } from "../../database/index.js";

function fromTable(table) {
  const s = String(SCHEMA).replace(/"/g, '""');
  const t = String(table).replace(/"/g, '""');
  return `"${s}"."${t}"`;
}

const T_EC = fromTable("exposiciones_catalogos");
const T_CLUB = fromTable("clubes");

const SELECT_FILA = `
  SELECT ec.id_club, ec.id_exposicion, cl.club AS club
  FROM ${T_EC} ec
  LEFT JOIN ${T_CLUB} cl ON cl.id_club = ec.id_club
`;

/**
 * Clubes asociados a una exposición en `exposiciones_catalogos` (co-organizadores).
 * El club “titular” sigue en `exposiciones.id_club`.
 */
export async function listarPorExposicion(idExposicion) {
  const r = await query(
    `${SELECT_FILA}
     WHERE ec.id_exposicion = $1
     ORDER BY ec.id_club ASC`,
    [idExposicion]
  );
  return r.rows;
}

/**
 * @returns {Promise<{ id_club: number, id_exposicion: number, club: string | null } | null>}
 */
export async function insertar(idExposicion, idClub) {
  await query(
    `INSERT INTO ${T_EC} (id_club, id_exposicion) VALUES ($1, $2)`,
    [idClub, idExposicion]
  );
  const r = await query(
    `${SELECT_FILA}
     WHERE ec.id_exposicion = $1 AND ec.id_club = $2`,
    [idExposicion, idClub]
  );
  return r.rows[0] ?? null;
}

export async function eliminar(idExposicion, idClub) {
  const r = await query(
    `DELETE FROM ${T_EC} WHERE id_exposicion = $1 AND id_club = $2 RETURNING id_club`,
    [idExposicion, idClub]
  );
  return r.rowCount > 0;
}
