import * as exposicionesService from "../../services/exposiciones/exposiciones.service.js";

function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const CAMPOS_ENTEROS_OPCIONALES_EXPO = [
  "cantidad",
  "numeros_extra_razas",
  "numeros_extra_cachorros",
];

function validarEnterosOpcionalesExpo(b) {
  for (const k of CAMPOS_ENTEROS_OPCIONALES_EXPO) {
    const v = b[k];
    if (v === undefined || v === null || v === "") continue;
    if (!Number.isFinite(Number(v))) {
      return `El campo ${k} debe ser un número válido`;
    }
  }
  return null;
}

function validarCrear(body) {
  const b = body ?? {};
  const nombre = String(b.exposicion ?? "").trim();
  if (!nombre) return "Falta el campo obligatorio: exposicion";

  const fechas = ["desde", "hasta"];
  for (const k of fechas) {
    const v = b[k];
    if (v === undefined || v === null || v === "") {
      return `Falta el campo obligatorio: ${k}`;
    }
  }

  const numericos = ["id_club", "id_tipo", "ano", "id_mes"];
  for (const k of numericos) {
    const v = b[k];
    if (v === undefined || v === null || v === "") {
      return `Falta el campo obligatorio: ${k}`;
    }
    if (!Number.isFinite(Number(v))) {
      return `El campo ${k} debe ser un número válido`;
    }
  }

  return validarEnterosOpcionalesExpo(b);
}

export async function listar(_req, res) {
  try {
    const rows = await exposicionesService.listar();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/** Exposiciones con fecha de inicio >= hoy. */
export async function listarProximas(_req, res) {
  try {
    const rows = await exposicionesService.listarProximas();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarPorClub(req, res) {
  try {
    const idClub = parseId(req.params.idClub);
    if (!idClub) {
      res.status(400).json({ error: "id_club inválido" });
      return;
    }
    const rows = await exposicionesService.listarPorIdClub(idClub);
    res.json(rows);
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
    const row = await exposicionesService.obtenerPorId(id);
    if (!row) {
      res.status(404).json({ error: "Exposición no encontrada" });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function crear(req, res) {
  try {
    const msg = validarCrear(req.body ?? {});
    if (msg) {
      res.status(400).json({ error: msg });
      return;
    }
    const row = await exposicionesService.crear(req.body);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function actualizar(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const actual = await exposicionesService.obtenerPorId(id);
    if (!actual) {
      res.status(404).json({ error: "Exposición no encontrada" });
      return;
    }
    const b = req.body ?? {};
    const msgInt = validarEnterosOpcionalesExpo(b);
    if (msgInt) {
      res.status(400).json({ error: msgInt });
      return;
    }
    const row = await exposicionesService.actualizar(id, b);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function eliminar(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const ok = await exposicionesService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: "Exposición no encontrada" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
