/**
 * Aplica los .sql de api/migrations en orden (misma conexión que la API).
 * Uso: npm run db:migrate
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { pool } from "../src/database/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../migrations");

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No hay archivos .sql en migrations/");
    return;
  }

  for (const file of files) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf8");
    console.log(`→ ${file}`);
    await pool.query(sql);
  }

  console.log("Migraciones aplicadas.");
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
