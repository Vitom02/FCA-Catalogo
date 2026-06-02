-- Ejecutá ESTO SOLO en pgAdmin (F5) y revisá el mensaje del SELECT final.
-- Debe decir: quedaron_0_filas = true

UPDATE web.ejemplares
SET id_variedad = NULL
WHERE id_variedad IS NOT NULL;

TRUNCATE TABLE web.ejemplares_variedades;

DELETE FROM web.variedades;

SELECT setval(
  pg_get_serial_sequence('web.variedades', 'id_variedad'),
  1,
  false
);

SELECT
  COUNT(*)::int AS filas_variedades,
  COUNT(*) = 0 AS quedaron_0_filas
FROM web.variedades;
