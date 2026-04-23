-- Cupos: cantidad base de la exposición y números extra por tipo (razas / cachorros).
-- Enteros opcionales; ajustá DEFAULT o NOT NULL según reglas de negocio.
-- Si la tabla está en `public`, cambiá el nombre calificado (ej. solo `exposiciones`).

ALTER TABLE web.exposiciones
  ADD COLUMN IF NOT EXISTS cantidad INTEGER,
  ADD COLUMN IF NOT EXISTS numeros_extra_razas INTEGER,
  ADD COLUMN IF NOT EXISTS numeros_extra_cachorros INTEGER;
