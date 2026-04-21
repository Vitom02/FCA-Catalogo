-- Inscripciones al catálogo de una exposición (ejemplar + categoría + número + usuario).
-- Tabla en esquema web explícito (web.catalogos). Sin FKs: los joins se hacen en las queries.

CREATE TABLE IF NOT EXISTS web.catalogos (
  id_catalogo SERIAL PRIMARY KEY,
  id_exposicion INTEGER NOT NULL,
  id_ejemplar INTEGER NOT NULL,
  id_categoria INTEGER NOT NULL,
  numero INTEGER,
  id_usuario INTEGER NOT NULL,
  fecha_insc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogos_id_exposicion ON web.catalogos (id_exposicion);
CREATE INDEX IF NOT EXISTS idx_catalogos_id_ejemplar ON web.catalogos (id_ejemplar);
CREATE INDEX IF NOT EXISTS idx_catalogos_id_categoria ON web.catalogos (id_categoria);
