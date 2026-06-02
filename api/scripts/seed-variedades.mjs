/**
 * Carga variedades y asigna id_variedad a ejemplares (misma lógica que variedades.sql).
 *
 * Requiere migración 025_variedades.sql aplicada (npm run db:migrate).
 *
 * CSV (delimitador ;, con cabecera) por defecto en:
 *   api/migrations/data/variedades.csv
 *   api/migrations/data/ejemplares_variedades.csv
 * o carpeta en VARIEDADES_DIR.
 *
 * Uso:
 *   npm run db:seed-variedades
 *   npm run db:seed-variedades -- --force   # vacía variedades y mig antes de cargar
 */
import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { pool } from "../src/database/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDataDir = resolve(__dirname, "../migrations/data");
const force = process.argv.includes("--force");
const BATCH = 2000;

function dataDir() {
  const fromEnv = process.env.VARIEDADES_DIR?.trim();
  return fromEnv ? resolve(fromEnv) : defaultDataDir;
}

/** @param {string} line */
function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ";" && !inQuotes) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

/** @param {string} v */
function parseBool(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "t" || s === "true" || s === "1" || s === "s" || s === "si";
}

/**
 * @param {string} filePath
 * @param {(row: string[]) => void | Promise<void>} onRow
 * @param {number} skipHeader
 */
async function readCsv(filePath, onRow, skipHeader = 1) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (lineNo <= skipHeader) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    await onRow(parseCsvLine(trimmed));
  }
}

/**
 * @param {import("pg").PoolClient} client
 * @param {string} sql
 * @param {unknown[][]} rows
 */
/** Tras INSERT con id_variedad explícito, la secuencia SERIAL queda desfasada. */
async function syncVariedadesSequence(client) {
  await client.query(
    `SELECT setval(
       pg_get_serial_sequence('web.variedades', 'id_variedad'),
       COALESCE((SELECT MAX(id_variedad) FROM web.variedades), 1)
     )`,
  );
}

async function insertBatches(client, sql, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const placeholders = chunk
      .map((_, rowIdx) => {
        const base = rowIdx * chunk[0].length;
        const cols = chunk[0].map((__, colIdx) => `$${base + colIdx + 1}`);
        return `(${cols.join(", ")})`;
      })
      .join(", ");
    const flat = chunk.flat();
    await client.query(`${sql} ${placeholders}`, flat);
  }
}

async function main() {
  const dir = dataDir();
  const variedadesCsv = join(dir, "variedades.csv");
  const ejemplaresCsv = join(dir, "ejemplares_variedades.csv");

  for (const p of [variedadesCsv, ejemplaresCsv]) {
    if (!existsSync(p)) {
      console.error(`No se encontró: ${p}`);
      console.error(
        "Copiá los CSV a esa carpeta o definí VARIEDADES_DIR con la ruta correcta.",
      );
      process.exitCode = 1;
      return;
    }
  }

  const client = await pool.connect();
  try {
    const { rows: cntRows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM web.variedades"
    );
    const existing = cntRows[0]?.n ?? 0;
    if (existing > 0 && !force) {
      console.log(
        `web.variedades ya tiene ${existing} filas. Usá --force para recargar desde cero.`,
      );
      return;
    }

    await client.query("BEGIN");

    if (force) {
      await client.query(
        "UPDATE web.ejemplares SET id_variedad = NULL WHERE id_variedad IS NOT NULL"
      );
      await client.query("TRUNCATE web.ejemplares_variedades");
      await client.query("TRUNCATE web.variedades RESTART IDENTITY CASCADE");
    }

    /** @type {unknown[][]} */
    const variedadesRows = [];
    await readCsv(variedadesCsv, (cols) => {
      const [idVar, idRaza, variedad, opcion, codigoVariedad, codigoRaza] = cols;
      variedadesRows.push([
        Number(idVar),
        Number(idRaza),
        String(variedad ?? "").replace(/^"|"$/g, ""),
        parseBool(opcion),
        String(codigoVariedad ?? ""),
        codigoRaza != null && codigoRaza !== "" ? String(codigoRaza) : null,
      ]);
    });

    console.log(`→ variedades.csv: ${variedadesRows.length} filas`);
    await insertBatches(
      client,
      `INSERT INTO web.variedades (
         id_variedad, id_raza, variedad, opcion, codigo_variedad, codigo_raza
       ) VALUES`,
      variedadesRows
    );

    await client.query(
      `UPDATE web.variedades v SET id_raza = r.id_raza
       FROM web.razas r
       WHERE r.codigo_raza = v.codigo_raza`
    );

    await syncVariedadesSequence(client);

    await client.query("TRUNCATE web.ejemplares_variedades");

    /** @type {unknown[][]} */
    const migRows = [];
    let migCount = 0;
    await readCsv(ejemplaresCsv, async (cols) => {
      const [codigoRaza, codigoPais, registro, idVariedad] = cols;
      migRows.push([
        String(codigoRaza),
        String(codigoPais),
        Number(registro),
        Number(idVariedad),
      ]);
      migCount++;
      if (migRows.length >= BATCH) {
        await insertBatches(
          client,
          `INSERT INTO web.ejemplares_variedades (
             codigo_raza, codigo_pais, registro, id_variedad
           ) VALUES`,
          migRows.splice(0, migRows.length)
        );
        process.stdout.write(`\r→ ejemplares_variedades.csv: ${migCount} filas…`);
      }
    });
    if (migRows.length > 0) {
      await insertBatches(
        client,
        `INSERT INTO web.ejemplares_variedades (
           codigo_raza, codigo_pais, registro, id_variedad
         ) VALUES`,
        migRows
      );
    }
    console.log(`\n→ ejemplares_variedades.csv: ${migCount} filas en web.ejemplares_variedades`);

    const upd = await client.query(
      `UPDATE web.ejemplares e SET id_variedad = v.id_variedad
       FROM web.ejemplares_variedades v
       WHERE v.codigo_raza = e.codigo_raza
         AND v.codigo_pais = e.codigo_pais
         AND v.registro = e.registro`
    );
    console.log(`→ ejemplares actualizados: ${upd.rowCount ?? 0}`);

    const ins = await client.query(
      `INSERT INTO web.variedades (id_raza, variedad, opcion, codigo_variedad, codigo_raza)
       SELECT r.id_raza, '', TRUE, '', r.codigo_raza
       FROM web.razas r
       WHERE NOT EXISTS (
         SELECT 1 FROM web.variedades v WHERE v.id_raza = r.id_raza
       )
       ORDER BY r.id_raza`
    );
    console.log(`→ variedades “vacías” para razas sin variedad: ${ins.rowCount ?? 0}`);

    await syncVariedadesSequence(client);

    await client.query("COMMIT");
    console.log("Carga de variedades finalizada.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
