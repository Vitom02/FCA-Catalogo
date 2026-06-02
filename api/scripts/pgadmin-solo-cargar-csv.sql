-- =============================================================================
-- SOLO cargar los 2 CSV en pgAdmin (local)
-- =============================================================================
-- Archivos (cambiá la ruta si están en otro lado):
--   Repo: api/migrations/data/variedades.csv
--   Repo: api/migrations/data/ejemplares_variedades.csv
--
-- Formato: separador ;  y  primera fila = nombres de columnas
--
-- Antes: las tablas web.variedades y web.ejemplares_variedades deben existir
--        (migración 025 + 026, o CREATE de tu variedades.sql)
-- =============================================================================

-- 1) Vaciar (para poder volver a cargar sin error de clave duplicada)
DELETE FROM web.ejemplares_variedades;
DELETE FROM web.variedades;

-- 2) variedades.csv  →  web.variedades
COPY web.variedades (
  id_variedad,
  id_raza,
  variedad,
  opcion,
  codigo_variedad,
  codigo_raza
)
FROM 'C:/Proyectos/WEB FCA/variedades/variedades.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ';', QUOTE '"', NULL '');

-- 3) ejemplares_variedades.csv  →  web.ejemplares_variedades
COPY web.ejemplares_variedades (
  codigo_raza,
  codigo_pais,
  registro,
  id_variedad
)
FROM 'C:/Proyectos/WEB FCA/variedades/ejemplares_variedades.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ';');

-- 4) Ver cuántas filas entraron
SELECT COUNT(*) AS filas_variedades FROM web.variedades;
SELECT COUNT(*) AS filas_ejemplares_variedades FROM web.ejemplares_variedades;
