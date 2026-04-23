-- Relación club ↔ exposición (solo id_club e id_exposicion).
-- Sin columnas extra. Clave primaria compuesta para no duplicar el par.
-- Sin FKs explícitos (mismo criterio que 004_catalogos.sql); podés agregar ALTER TABLE si querés integridad referencial.

CREATE TABLE IF NOT EXISTS web.exposiciones_catalogos (
  id_club INTEGER NOT NULL,
  id_exposicion INTEGER NOT NULL,
  CONSTRAINT exposiciones_catalogos_pkey PRIMARY KEY (id_club, id_exposicion)
);

CREATE INDEX IF NOT EXISTS idx_exposiciones_catalogos_id_exposicion
  ON web.exposiciones_catalogos (id_exposicion);

CREATE INDEX IF NOT EXISTS idx_exposiciones_catalogos_id_club
  ON web.exposiciones_catalogos (id_club);
