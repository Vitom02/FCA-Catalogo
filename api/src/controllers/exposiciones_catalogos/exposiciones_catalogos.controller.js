import * as exposicionesCatalogosService from "../../services/exposiciones_catalogos/exposiciones_catalogos.service.js";
import * as exposicionesService from "../../services/exposiciones/exposiciones.service.js";

function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validarCrear(body) {
  const b = body ?? {};
  for (const k of ["id_exposicion", "id_club"]) {
    const v = b[k];
    if (v === undefined || v === null || v === "") {
      return `Falta el campo obligatorio: ${k}`;
    }
    if (!Number.isFinite(Number(v))) {
      return `El campo ${k} debe ser un número válido`;
    }
  }
  return null;
}

/** GET /api/exposiciones-catalogos/exposicion/:idExposicion */
export async function listarPorExposicion(req, res) {
  try {
    const id = parseId(req.params.idExposicion);
    if (!id) {
      res.status(400).json({ error: "id_exposicion inválido" });
      return;
    }
    const expo = await exposicionesService.obtenerPorId(id);
    if (!expo) {
      res.status(404).json({ error: "Exposición no encontrada" });
      return;
    }
    const rows = await exposicionesCatalogosService.listarPorExposicion(id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/exposiciones-catalogos  body: { id_exposicion, id_club } */
export async function crear(req, res) {
  try {
    const msg = validarCrear(req.body ?? {});
    if (msg) {
      res.status(400).json({ error: msg });
      return;
    }
    const idExpo = parseId(req.body.id_exposicion);
    const idClub = parseId(req.body.id_club);
    if (!idExpo || !idClub) {
      res.status(400).json({ error: "id_exposicion o id_club inválido" });
      return;
    }
    const expo = await exposicionesService.obtenerPorId(idExpo);
    if (!expo) {
      res.status(404).json({ error: "Exposición no encontrada" });
      return;
    }
    const row = await exposicionesCatalogosService.insertar(idExpo, idClub);
    res.status(201).json(row);
  } catch (err) {
    if (err && err.code === "23505") {
      res.status(409).json({
        error: "Ese club ya está asociado a esta exposición en exposiciones_catalogos.",
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/** DELETE /api/exposiciones-catalogos/exposicion/:idExposicion/club/:idClub */
export async function eliminar(req, res) {
  try {
    const idExpo = parseId(req.params.idExposicion);
    const idClub = parseId(req.params.idClub);
    if (!idExpo || !idClub) {
      res.status(400).json({ error: "id_exposicion o id_club inválido" });
      return;
    }
    const ok = await exposicionesCatalogosService.eliminar(idExpo, idClub);
    if (!ok) {
      res.status(404).json({ error: "Asociación no encontrada" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
