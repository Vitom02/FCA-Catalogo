-- Permite cerrar una exposición antes de las reglas automáticas; al recalcular, la siguiente
-- del mismo club organizador puede quedar abierta (ver `aplicarReglasEstadoPorClubOrganizador` en API).

ALTER TABLE IF EXISTS web.exposiciones
    ADD COLUMN IF NOT EXISTS cerrado_manual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN web.exposiciones.cerrado_manual IS
    'Si es true, la exposición queda cerrada aunque las reglas automáticas la dejarían abierta; la siguiente del club puede abrirse. Se limpia al finalizar o al entrar en cierre por −2 días.';
