-- Acelerar el detalle de catálogo (agregados propietario / cadena criador → ejemplar).
CREATE INDEX IF NOT EXISTS idx_propiedades_ejemplares_id_ejemplar_activo
  ON web.propiedades_ejemplares (id_ejemplar)
  WHERE hasta IS NULL;

CREATE INDEX IF NOT EXISTS idx_ejemplares_id_servicio
  ON web.ejemplares (id_servicio)
  WHERE id_servicio IS NOT NULL;
