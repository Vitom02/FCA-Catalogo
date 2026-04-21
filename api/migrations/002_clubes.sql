-- Tabla de clubes (nombre y datos de contacto). id_club enlaza con exposiciones.id_club.
CREATE TABLE IF NOT EXISTS clubes (
  id_club INTEGER PRIMARY KEY,
  id_tipo INTEGER,
  club TEXT NOT NULL,
  id_localidad INTEGER,
  domicilio TEXT,
  telefono_1 TEXT,
  telefono_2 TEXT,
  correo TEXT,
  url TEXT,
  presidente TEXT,
  codigo_postal TEXT,
  horario TEXT,
  logo TEXT
);

CREATE INDEX IF NOT EXISTS idx_clubes_id_tipo ON clubes (id_tipo);
