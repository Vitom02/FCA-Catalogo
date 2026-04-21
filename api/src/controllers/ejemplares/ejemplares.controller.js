import * as ejemplaresService from "../../services/ejemplares/ejemplares.service.js";
import * as categoriasEjemplaresService from "../../services/ejemplares/categorias.service.js";
import * as federacionesEjemplaresService from "../../services/ejemplares/federaciones.service.js";
import * as razasEjemplaresService from "../../services/ejemplares/razas.service.js";

function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * GET /api/ejemplares?id_raza=&id_federacion=&registro=&nombre=&limit=&offset=
 * Requiere al menos un filtro (evita traer toda la tabla).
 */
export async function buscar(req, res) {
  try {
    const q = req.query ?? {};
    const result = await ejemplaresService.buscarEjemplares({
      id_raza: q.id_raza,
      id_federacion: q.id_federacion,
      registro: q.registro,
      nombre: q.nombre,
      limit: q.limit,
      offset: q.offset,
    });
    res.json(result);
  } catch (err) {
    if (err.code === "EJEMPLARES_SIN_FILTRO") {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarFederaciones(_req, res) {
  try {
    const datos = await federacionesEjemplaresService.listarFederaciones();
    res.json({ datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarRazas(_req, res) {
  try {
    const datos = await razasEjemplaresService.listarRazas();
    res.json({ datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarCategorias(_req, res) {
  try {
    const datos = await categoriasEjemplaresService.listarCategorias();
    res.json({ datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function obtenerPorId(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const row = await ejemplaresService.obtenerPorId(id);
    if (!row) {
      res.status(404).json({ error: "Ejemplar no encontrado" });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
