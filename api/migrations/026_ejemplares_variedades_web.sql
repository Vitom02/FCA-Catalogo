-- Tabla de enlace ejemplar ↔ variedad en web (carga desde ejemplares_variedades.csv).
-- Antes estaba solo en mig; esta migración la deja en web para COPY / consultas.

CREATE TABLE IF NOT EXISTS web.ejemplares_variedades (
  codigo_raza VARCHAR(5) NOT NULL,
  codigo_pais VARCHAR(5) NOT NULL,
  registro INTEGER NOT NULL,
  id_variedad INTEGER NOT NULL,
  CONSTRAINT ejemplares_variedades_web_pkey PRIMARY KEY (codigo_raza, codigo_pais, registro)
);

CREATE INDEX IF NOT EXISTS idx_ejemplares_variedades_id_variedad
  ON web.ejemplares_variedades (id_variedad);
