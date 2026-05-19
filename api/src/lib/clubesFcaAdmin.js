/**
 * Clubes desde los que pueden darse usuarios con categoría administrador (`id_categoria = 1`).
 *
 * Lista separada por comas en `ID_CLUBES_FCA` o un solo valor en `ID_CLUB_FCA`.
 * Por defecto `1`, alineado con el seed (`007_usuarios_seed`).
 */
export function obtenerIdClubesFcaParaAdmin() {
  const raw = String(
    process.env.ID_CLUBES_FCA ?? process.env.ID_CLUB_FCA ?? "1",
  ).trim();
  if (!raw) return [1];
  const ids = raw
    .split(",")
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
  const uniq = [...new Set(ids)];
  return uniq.length > 0 ? uniq : [1];
}

/** @param {unknown} idClub */
export function esClubFcaParaAdmin(idClub) {
  if (idClub === undefined || idClub === null || idClub === "") return false;
  const n = Number(idClub);
  if (!Number.isFinite(n) || n <= 0) return false;
  return obtenerIdClubesFcaParaAdmin().includes(Math.trunc(n));
}
