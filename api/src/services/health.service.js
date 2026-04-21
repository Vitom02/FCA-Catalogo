import { query } from "../database/index.js";

export function getHealthInfo() {
  return { ok: true, service: "kennel-fca-api" };
}

export async function pingDatabase() {
  const r = await query("SELECT 1 AS ok");
  return r.rows[0];
}
