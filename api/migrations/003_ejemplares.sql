-- Tabla principal de ejemplares (esquema vía search_path, ej. web).
-- Si ya existe en la base con otro DDL, no hace falta ejecutar esto.
CREATE TABLE IF NOT EXISTS ejemplares (
  id_ejemplar SERIAL PRIMARY KEY,
  codigo_pais TEXT,
  codigo_raza TEXT,
  registro INTEGER,
  nombre TEXT,
  prefijo TEXT,
  sufijo TEXT,
  sexo TEXT,
  fecha_nacimiento DATE,
  id_raza INTEGER,
  id_tamano INTEGER,
  id_pelaje INTEGER,
  id_color INTEGER,
  id_ejemplar_madre INTEGER,
  id_ejemplar_padre INTEGER,
  imagen TEXT,
  codigo_variedad TEXT,
  codigo_color TEXT,
  nombre_completo TEXT,
  id_federacion INTEGER,
  microchip TEXT,
  id_servicio INTEGER,
  apto_cria BOOLEAN,
  apto_exposicion BOOLEAN,
  nace_vivo BOOLEAN,
  id_federacion_origen INTEGER,
  registro_origen TEXT
);

CREATE INDEX IF NOT EXISTS idx_ejemplares_registro ON ejemplares (registro);
CREATE INDEX IF NOT EXISTS idx_ejemplares_id_raza ON ejemplares (id_raza);
CREATE INDEX IF NOT EXISTS idx_ejemplares_nombre ON ejemplares (nombre);
