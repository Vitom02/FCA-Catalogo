-- =============================================================================
-- Carga CSV → web.variedades y web.ejemplares_variedades (pgAdmin, local)
-- =============================================================================
-- ORDEN:
--   1) Ejecutá primero:  00-limpiar-variedades.sql
--      → tiene que mostrar quedaron_0_filas = true
--   2) Ejecutá este archivo completo (F5)
--
-- Si aparece duplicate key variedades_pkey → NO corriste el paso 1 o la tabla
-- no se vació (otra base, otro esquema, o error en el paso 1).
-- =============================================================================

BEGIN;

-- Tablas de paso (se borran al final). El COPY va acá, no a web.variedades directo.
DROP TABLE IF EXISTS web._import_variedades;
DROP TABLE IF EXISTS web._import_ejemplares_variedades;

CREATE TABLE web._import_variedades (
  id_variedad INTEGER NOT NULL,
  id_raza INTEGER NOT NULL,
  variedad VARCHAR(255) NOT NULL DEFAULT '',
  opcion BOOLEAN NOT NULL DEFAULT false,
  codigo_variedad VARCHAR(255) NOT NULL DEFAULT '',
  codigo_raza VARCHAR(255)
);

CREATE TABLE web._import_ejemplares_variedades (
  codigo_raza VARCHAR(5) NOT NULL,
  codigo_pais VARCHAR(5) NOT NULL,
  registro INTEGER NOT NULL,
  id_variedad INTEGER NOT NULL,
  PRIMARY KEY (codigo_raza, codigo_pais, registro)
);

-- Comprobación: web.variedades debe estar vacía (correr 00-limpiar-variedades.sql antes)
DO $$
DECLARE
  n integer;
BEGIN
  SELECT COUNT(*)::int INTO n FROM web.variedades;
  IF n > 0 THEN
    RAISE EXCEPTION
      'web.variedades tiene % filas. Ejecutá primero api/scripts/00-limpiar-variedades.sql (quedaron_0_filas debe ser true).',
      n;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- COPY → tablas de importación (editá la ruta si hace falta)
-- -----------------------------------------------------------------------------
COPY web._import_variedades (
  id_variedad,
  id_raza,
  variedad,
  opcion,
  codigo_variedad,
  codigo_raza
)
FROM 'C:/Proyectos/WEB FCA/variedades/variedades.csv'
WITH (
  FORMAT csv,
  HEADER true,
  DELIMITER ';',
  QUOTE '"',
  NULL ''
);

COPY web._import_ejemplares_variedades (
  codigo_raza,
  codigo_pais,
  registro,
  id_variedad
)
FROM 'C:/Proyectos/WEB FCA/variedades/ejemplares_variedades.csv'
WITH (
  FORMAT csv,
  HEADER true,
  DELIMITER ';'
);

-- -----------------------------------------------------------------------------
-- Pasar a tablas definitivas (web.variedades ya está vacía)
-- -----------------------------------------------------------------------------
INSERT INTO web.variedades (
  id_variedad,
  id_raza,
  variedad,
  opcion,
  codigo_variedad,
  codigo_raza
)
SELECT
  id_variedad,
  id_raza,
  variedad,
  opcion,
  codigo_variedad,
  codigo_raza
FROM web._import_variedades;

INSERT INTO web.ejemplares_variedades (
  codigo_raza,
  codigo_pais,
  registro,
  id_variedad
)
SELECT
  codigo_raza,
  codigo_pais,
  registro,
  id_variedad
FROM web._import_ejemplares_variedades;

UPDATE web.variedades v
SET id_raza = r.id_raza
FROM web.razas r
WHERE r.codigo_raza = v.codigo_raza;

UPDATE web.ejemplares e
SET id_variedad = ev.id_variedad
FROM web.ejemplares_variedades ev
WHERE ev.codigo_raza = e.codigo_raza
  AND ev.codigo_pais = e.codigo_pais
  AND ev.registro = e.registro;

INSERT INTO web.variedades (id_raza, variedad, opcion, codigo_variedad, codigo_raza)
SELECT r.id_raza, '', TRUE, '', r.codigo_raza
FROM web.razas r
WHERE NOT EXISTS (
  SELECT 1 FROM web.variedades v WHERE v.id_raza = r.id_raza
)
ORDER BY r.id_raza;

SELECT setval(
  pg_get_serial_sequence('web.variedades', 'id_variedad'),
  COALESCE((SELECT MAX(id_variedad) FROM web.variedades), 1)
);

DROP TABLE web._import_variedades;
DROP TABLE web._import_ejemplares_variedades;

COMMIT;

-- Controles (fuera de la transacción ya commiteada)
SELECT COUNT(*) AS variedades FROM web.variedades;
SELECT COUNT(*) AS ejemplares_variedades FROM web.ejemplares_variedades;
SELECT COUNT(*) AS ejemplares_con_id_variedad
FROM web.ejemplares
WHERE id_variedad IS NOT NULL;
