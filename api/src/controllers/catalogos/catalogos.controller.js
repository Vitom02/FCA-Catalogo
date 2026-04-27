import * as catalogosService from "../../services/catalogos/catalogos.service.js";

function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validarCrear(body) {
  const b = body ?? {};
  const required = [
    "id_exposicion",
    "id_ejemplar",
    "id_categoria",
    "id_usuario",
  ];
  for (const k of required) {
    const v = b[k];
    if (v === undefined || v === null || v === "") {
      return `Falta el campo obligatorio: ${k}`;
    }
    if (!Number.isFinite(Number(v))) {
      return `El campo ${k} debe ser un número válido`;
    }
  }
  if (
    b.numero !== undefined &&
    b.numero !== null &&
    b.numero !== "" &&
    !Number.isFinite(Number(b.numero))
  ) {
    return "El campo numero debe ser un número válido";
  }
  return null;
}

export async function listarPorExposicionDetalle(req, res) {
  try {
    const id = parseId(req.params.idExposicion);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const rows = await catalogosService.listarPorExposicionDetalle(id);
    res.json(rows);
  } catch (err) {
    if (err.code === "CATALOGOS_FILTRO_INVALIDO") {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function resumenAgrupadoPorExposicion(req, res) {
  try {
    const id = parseId(req.params.idExposicion);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const data = await catalogosService.resumenAgrupadoPorExposicion(id);
    res.json(data);
  } catch (err) {
    if (err.code === "CATALOGOS_FILTRO_INVALIDO") {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarConteos(_req, res) {
  try {
    const rows = await catalogosService.conteosPorExposicion();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listar(req, res) {
  try {
    const q = req.query ?? {};
    const rows = await catalogosService.listar({
      id_exposicion: q.id_exposicion,
    });
    res.json(rows);
  } catch (err) {
    if (err.code === "CATALOGOS_FILTRO_INVALIDO") {
      res.status(400).json({ error: err.message });
      return;
    }
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
    const row = await catalogosService.obtenerPorId(id);
    if (!row) {
      res.status(404).json({ error: "Catálogo no encontrado" });
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
    const row = await catalogosService.crear(req.body ?? {});
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
    const actual = await catalogosService.obtenerPorId(id);
    if (!actual) {
      res.status(404).json({ error: "Catálogo no encontrado" });
      return;
    }
    const row = await catalogosService.actualizar(id, req.body ?? {});
    res.json(row);
  } catch (err) {
    if (err.code === "CATALOGOS_FECHA_INVALIDA") {
      res.status(400).json({ error: err.message });
      return;
    }
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
    const ok = await catalogosService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: "Catálogo no encontrado" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
