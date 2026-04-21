/**
 * Ejecuta los mismos SELECT que exponen las rutas (vía servicio), sin levantar Express.
 * Uso: desde la carpeta api → npm run test:exposiciones
 * Opcional: TEST_ID_CLUB=16 TEST_ID_EXPO=3 npm run test:exposiciones
 */
import "dotenv/config";
import { pool } from "../src/database/index.js";
import * as healthService from "../src/services/health.service.js";
import * as exposicionesService from "../src/services/exposiciones/exposiciones.service.js";

function section(title) {
  console.log(`\n--- ${title} ---`);
}

function printSample(label, rows, max = 2) {
  const n = rows?.length ?? 0;
  console.log(`${label}: ${n} fila(s)`);
  if (n > 0) {
    const slice = rows.slice(0, max);
    console.log(JSON.stringify(slice, null, 2));
    if (n > max) console.log(`… y ${n - max} más`);
  }
}

async function main() {
  console.log("Conexión DB…");
  await healthService.pingDatabase();
  console.log("OK (SELECT 1)");

  section("listar() — GET /api/exposiciones");
  const todas = await exposicionesService.listar();
  printSample("todas", todas);

  section("listarProximas() — GET /api/exposiciones/proximas");
  const proximas = await exposicionesService.listarProximas();
  printSample("próximas", proximas);

  const idClub =
    process.env.TEST_ID_CLUB != null && process.env.TEST_ID_CLUB !== ""
      ? Number(process.env.TEST_ID_CLUB)
      : todas[0]?.id_club;

  section("listarPorIdClub() — GET /api/exposiciones/club/:idClub");
  if (idClub != null && Number.isFinite(idClub)) {
    console.log(`id_club usado: ${idClub}`);
    const porClub = await exposicionesService.listarPorIdClub(idClub);
    printSample("por club", porClub);
  } else {
    console.log("Sin id_club (no hay filas en listar o definí TEST_ID_CLUB).");
  }

  const idExpo =
    process.env.TEST_ID_EXPO != null && process.env.TEST_ID_EXPO !== ""
      ? Number(process.env.TEST_ID_EXPO)
      : todas[0]?.id_exposicion;

  section("obtenerPorId() — GET /api/exposiciones/:id");
  if (idExpo != null && Number.isFinite(idExpo)) {
    console.log(`id_exposicion usado: ${idExpo}`);
    const uno = await exposicionesService.obtenerPorId(idExpo);
    console.log(uno ? JSON.stringify(uno, null, 2) : "(no encontrada)");
  } else {
    console.log("Sin id (tabla vacía o definí TEST_ID_EXPO).");
  }

  console.log("\nListo.");
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
