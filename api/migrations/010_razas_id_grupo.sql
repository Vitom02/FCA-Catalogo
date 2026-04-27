-- Grupo FCI (1–10, etc.) por raza; usado en resumen de catálogo (grupo → raza → categoría).
-- Si en tu base la columna ya existe, el ADD COLUMN no hace nada.

ALTER TABLE web.razas
  ADD COLUMN IF NOT EXISTS id_grupo integer;

COMMENT ON COLUMN web.razas.id_grupo IS
  'Identificador de grupo (ej. FCI). NULL o 0 se muestran como "Sin grupo" en resúmenes.';
