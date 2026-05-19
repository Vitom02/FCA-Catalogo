-- Ejemplares agregados con torneo cerrado o finalizado: `numero` NULL y secuencia `numeros_extra` por exposición.
-- No coexisten `numero` y `numeros_extra` en la misma fila.

ALTER TABLE web.catalogos
  ADD COLUMN IF NOT EXISTS numeros_extra INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogos_expo_numeros_extra
  ON web.catalogos (id_exposicion, numeros_extra)
  WHERE numeros_extra IS NOT NULL;

ALTER TABLE web.catalogos DROP CONSTRAINT IF EXISTS catalogos_numero_xor_numeros_extra;

ALTER TABLE web.catalogos
  ADD CONSTRAINT catalogos_numero_xor_numeros_extra
  CHECK (NOT (numero IS NOT NULL AND numeros_extra IS NOT NULL));
