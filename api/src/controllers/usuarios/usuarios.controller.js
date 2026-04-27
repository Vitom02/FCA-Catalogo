import * as usuariosService from "../../services/usuarios/usuarios.service.js";

function parseId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validarCrearUsuario(body) {
  const b = body ?? {};
  const required = ["id_categoria", "usuario", "clave"];
  for (const k of required) {
    const v = b[k];
    if (v === undefined || v === null || v === "") {
      return `Falta el campo obligatorio: ${k}`;
    }
  }
  if (!Number.isFinite(Number(b.id_categoria))) {
    return "El campo id_categoria debe ser un número válido";
  }
  if (
    b.id_club !== undefined &&
    b.id_club !== null &&
    b.id_club !== "" &&
    !Number.isFinite(Number(b.id_club))
  ) {
    return "El campo id_club debe ser un número válido";
  }
  return null;
}

// --- usuarios_categorias (solo lectura) ---

export async function listarCategorias(req, res) {
  try {
    const q = req.query ?? {};
    const rows = await usuariosService.listarCategorias({
      incluir_baja: q.incluir_baja,
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function obtenerCategoriaPorId(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const row = await usuariosService.obtenerCategoriaPorId(id);
    if (!row) {
      res.status(404).json({ error: "Categoría no encontrada" });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// --- usuarios ---

export async function login(req, res) {
  try {
    const body = req.body ?? {};
    const usuario = body.usuario ?? body.username;
    const clave = body.clave ?? body.password;
    const row = await usuariosService.loginPorUsuarioYClave(usuario, clave);
    if (!row) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }
    const idCat = Number(row.id_categoria);
    const role = idCat === 1 ? "superadmin" : "user";
    const kennelId =
      role === "superadmin"
        ? null
        : row.id_club != null
          ? String(row.id_club)
          : null;
    res.json({
      ...row,
      username: row.usuario,
      role,
      kennelId,
    });
  } catch (err) {
    if (err.code === "USUARIOS_VALIDACION") {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listar(req, res) {
  try {
    const q = req.query ?? {};
    const rows = await usuariosService.listar({
      incluir_baja: q.incluir_baja,
      id_club: q.id_club,
      id_categoria: q.id_categoria,
      incluir_clave: q.incluir_clave,
    });
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
    const q = req.query ?? {};
    const row = await usuariosService.obtenerPorId(id, {
      incluir_clave: q.incluir_clave,
    });
    if (!row) {
      res.status(404).json({ error: "Usuario no encontrado" });
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
    const msg = validarCrearUsuario(req.body ?? {});
    if (msg) {
      res.status(400).json({ error: msg });
      return;
    }
    const row = await usuariosService.crear(req.body ?? {});
    res.status(201).json(row);
  } catch (err) {
    if (err.code === "USUARIOS_VALIDACION") {
      res.status(400).json({ error: err.message });
      return;
    }
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
    const actual = await usuariosService.obtenerPorId(id);
    if (!actual) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const row = await usuariosService.actualizar(id, req.body ?? {});
    res.json(row);
  } catch (err) {
    if (err.code === "USUARIOS_VALIDACION") {
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
    const ok = await usuariosService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
