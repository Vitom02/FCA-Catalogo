-- Ejecutá este script en la base FCA si la tabla aún no existe.
CREATE TABLE IF NOT EXISTS exposiciones (
  id_exposicion SERIAL PRIMARY KEY,
  exposicion TEXT NOT NULL,
  desde DATE NOT NULL,
  hasta DATE NOT NULL,
  id_club INTEGER NOT NULL,
  id_tipo INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  id_mes INTEGER NOT NULL,
  organizador TEXT,
  texto1 TEXT,
  texto2 TEXT,
  texto3 TEXT,
  texto4 TEXT,
  texto5 TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  ubicacion TEXT,
  CONSTRAINT exposiciones_desde_hasta_chk CHECK (hasta >= desde)
);

CREATE INDEX IF NOT EXISTS idx_exposiciones_desde ON exposiciones (desde);
CREATE INDEX IF NOT EXISTS idx_exposiciones_hasta ON exposiciones (hasta);
