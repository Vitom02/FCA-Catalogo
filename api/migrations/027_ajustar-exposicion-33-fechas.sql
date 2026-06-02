-- =============================================================================
-- Exposición 33: fechas para pruebas / producción (Docker o pgAdmin)
-- =============================================================================
--   desde = hoy (fecha del servidor)
--   hasta = último día del mes siguiente al mes actual
--   ano / id_mes = según el mes de inicio
--   cerrado_manual = false
--
-- Docker (desde la raíz del proyecto, carpeta con docker-compose.yml):
--
--   docker compose exec db psql -U kennel -d kennel -f - < api/scripts/ajustar-exposicion-33-fechas.sql
--
-- O copiando al contenedor y ejecutando:
--
--   docker compose cp api/scripts/ajustar-exposicion-33-fechas.sql db:/tmp/
--   docker compose exec db psql -U kennel -d kennel -f /tmp/ajustar-exposicion-33-fechas.sql
--
-- Idempotente: cada ejecución recalcula respecto a CURRENT_DATE del servidor.
-- =============================================================================

SELECT id_exposicion, exposicion, desde, hasta, ano, id_mes, id_estado, cerrado_manual
FROM web.exposiciones
WHERE id_exposicion = 33;

UPDATE web.exposiciones
SET
  desde          = CURRENT_DATE,
  hasta          = (
    date_trunc('month', CURRENT_DATE)::date
    + INTERVAL '2 months'
    - INTERVAL '1 day'
  )::date,
  ano            = EXTRACT(YEAR FROM CURRENT_DATE)::int,
  id_mes         = EXTRACT(MONTH FROM CURRENT_DATE)::int,
  cerrado_manual = false
WHERE id_exposicion = 33;

SELECT id_exposicion, exposicion, desde, hasta, ano, id_mes, id_estado, cerrado_manual
FROM web.exposiciones
WHERE id_exposicion = 33;
