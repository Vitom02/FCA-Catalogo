-- Variedades por raza e id_variedad en ejemplares (catálogo / inscripciones).
-- Datos: npm run db:seed-variedades (CSV en migrations/data/ o VARIEDADES_DIR).

CREATE SCHEMA IF NOT EXISTS mig;

CREATE TABLE IF NOT EXISTS web.variedades (
  id_variedad SERIAL PRIMARY KEY,
  id_raza INTEGER NOT NULL,
  variedad VARCHAR(255) NOT NULL DEFAULT '',
  opcion BOOLEAN NOT NULL DEFAULT false,
  codigo_variedad VARCHAR(255) NOT NULL DEFAULT '',
  codigo_raza VARCHAR(255),
  ordinal INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT fk_variedades_razas FOREIGN KEY (id_raza)
    REFERENCES web.razas (id_raza)
);

CREATE INDEX IF NOT EXISTS idx_variedades_id_raza ON web.variedades (id_raza);
CREATE INDEX IF NOT EXISTS idx_variedades_codigo_raza ON web.variedades (codigo_raza);

ALTER TABLE web.ejemplares
  ADD COLUMN IF NOT EXISTS id_variedad INTEGER;

CREATE INDEX IF NOT EXISTS idx_ejemplares_id_variedad
  ON web.ejemplares (id_variedad)
  WHERE id_variedad IS NOT NULL;

CREATE TABLE IF NOT EXISTS mig.ejemplares_variedades (
  codigo_raza VARCHAR(5) NOT NULL,
  codigo_pais VARCHAR(5) NOT NULL,
  registro INTEGER NOT NULL,
  id_variedad INTEGER NOT NULL,
  CONSTRAINT ejemplares_variedades_pkey PRIMARY KEY (codigo_raza, codigo_pais, registro)
);
