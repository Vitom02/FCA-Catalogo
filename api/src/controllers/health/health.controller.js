import * as healthService from "../../services/health.service.js";

export function health(_req, res) {
  res.json(healthService.getHealthInfo());
}

export async function healthDb(_req, res) {
  try {
    const row = await healthService.pingDatabase();
    res.json({ ok: true, db: row });
  } catch (err) {
    console.error(err);
    res.status(503).json({
      ok: false,
      error: "No se pudo conectar a PostgreSQL",
      detail: err.message,
    });
  }
}
