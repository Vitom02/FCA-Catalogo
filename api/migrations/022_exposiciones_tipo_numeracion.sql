-- Tipo de numeración del catálogo: 1 = manual, 2 = automática (por defecto).
ALTER TABLE IF EXISTS web.exposiciones
  ADD COLUMN IF NOT EXISTS tipo_numeracion INTEGER NOT NULL DEFAULT 2;

ALTER TABLE IF EXISTS web.exposiciones
  DROP CONSTRAINT IF EXISTS exposiciones_tipo_numeracion_chk;

ALTER TABLE IF EXISTS web.exposiciones
  ADD CONSTRAINT exposiciones_tipo_numeracion_chk
  CHECK (tipo_numeracion IN (1, 2));

COMMENT ON COLUMN web.exposiciones.tipo_numeracion IS
  'Catálogo: 1 = numeración manual, 2 = numeración automática.';
