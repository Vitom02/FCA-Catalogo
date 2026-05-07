-- JOINs usados en listarPorExposicionDetalle (grilla + PDF).
CREATE INDEX IF NOT EXISTS idx_ejemplares_id_raza
  ON web.ejemplares (id_raza);

CREATE INDEX IF NOT EXISTS idx_ejemplares_id_ejemplar_padre
  ON web.ejemplares (id_ejemplar_padre)
  WHERE id_ejemplar_padre IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ejemplares_id_ejemplar_madre
  ON web.ejemplares (id_ejemplar_madre)
  WHERE id_ejemplar_madre IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_propiedades_propietarios_id_propiedad
  ON web.propiedades_propietarios (id_propiedad);

CREATE INDEX IF NOT EXISTS idx_catalogos_id_exposicion_id_catalogo
  ON web.catalogos (id_exposicion, id_catalogo);
