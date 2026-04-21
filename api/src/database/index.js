import pg from "pg";

const { Pool } = pg;

/** Esquema donde están las tablas (ej. `web` si en pgAdmin usás `web.exposiciones`). */
function pgSchema() {
  const raw = (process.env.PGSCHEMA || process.env.PG_SCHEMA || "web").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : "public";
}

const SCHEMA = pgSchema();
const searchPathOptions = `-c search_path=${SCHEMA},public`;

function createPool() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) {
    return new Pool({
      connectionString,
      options: searchPathOptions,
    });
  }

  const host = process.env.PGHOST || "localhost";
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (!user || !database) {
    console.warn(
      "[db] Faltan credenciales: definí DATABASE_URL o PGUSER + PGDATABASE (y PGPASSWORD si aplica)."
    );
  }

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    options: searchPathOptions,
  });
}

export const pool = createPool();
export { SCHEMA };

export async function query(text, params) {
  return pool.query(text, params);
}
