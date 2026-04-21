import "dotenv/config";
import cors from "cors";
import express from "express";
import { pool } from "./database/index.js";
import * as clubesController from "./controllers/clubes/clubes.controller.js";
import * as catalogosController from "./controllers/catalogos/catalogos.controller.js";
import * as ejemplaresController from "./controllers/ejemplares/ejemplares.controller.js";
import * as exposicionesController from "./controllers/exposiciones/exposiciones.controller.js";
import * as healthController from "./controllers/health/health.controller.js";
import * as usuariosController from "./controllers/usuarios/usuarios.controller.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", healthController.health);
app.get("/health/db", healthController.healthDb);

app.post("/api/auth/login", usuariosController.login);

app.get("/api/clubes", clubesController.listar);

app.get("/api/exposiciones/proximas", exposicionesController.listarProximas);
app.get("/api/exposiciones/club/:idClub", exposicionesController.listarPorClub);
app.get("/api/exposiciones", exposicionesController.listar);
app.get("/api/exposiciones/:id", exposicionesController.obtenerPorId);
app.post("/api/exposiciones", exposicionesController.crear);
app.put("/api/exposiciones/:id", exposicionesController.actualizar);
app.delete("/api/exposiciones/:id", exposicionesController.eliminar);

app.get("/api/catalogos", catalogosController.listar);
app.get("/api/catalogos/conteos", catalogosController.listarConteos);
app.get(
  "/api/catalogos/exposicion/:idExposicion/detalle",
  catalogosController.listarPorExposicionDetalle
);
app.get("/api/catalogos/:id", catalogosController.obtenerPorId);
app.post("/api/catalogos", catalogosController.crear);
app.put("/api/catalogos/:id", catalogosController.actualizar);
app.delete("/api/catalogos/:id", catalogosController.eliminar);

app.get("/api/ejemplares", ejemplaresController.buscar);
app.get("/api/ejemplares/federaciones", ejemplaresController.listarFederaciones);
app.get("/api/ejemplares/razas", ejemplaresController.listarRazas);
app.get("/api/ejemplares/categorias", ejemplaresController.listarCategorias);
app.get("/api/ejemplares/:id", ejemplaresController.obtenerPorId);

app.get(
  "/api/usuarios/categorias",
  usuariosController.listarCategorias
);
app.get(
  "/api/usuarios/categorias/:id",
  usuariosController.obtenerCategoriaPorId
);

app.get("/api/usuarios", usuariosController.listar);
app.get("/api/usuarios/:id", usuariosController.obtenerPorId);
app.post("/api/usuarios", usuariosController.crear);
app.put("/api/usuarios/:id", usuariosController.actualizar);
app.delete("/api/usuarios/:id", usuariosController.eliminar);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => pool.end());
});
