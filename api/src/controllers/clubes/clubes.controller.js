import * as clubesService from "../../services/clubes/clubes.service.js";

export async function listar(_req, res) {
  try {
    const rows = await clubesService.listar();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
