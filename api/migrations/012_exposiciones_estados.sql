-- Estados de exposición (catálogo) y FK desde web.exposiciones.
-- Valores fijos: 1 Abierto, 2 Cerrado, 3 Finalizado.

CREATE TABLE IF NOT EXISTS web.exposiciones_estados (
    id_estado smallint NOT NULL,
    estado character varying(40) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT pk_exposiciones_estados PRIMARY KEY (id_estado),
    CONSTRAINT uq_exposiciones_estados_estado UNIQUE (estado)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS web.exposiciones_estados
    OWNER TO CURRENT_USER;

INSERT INTO web.exposiciones_estados (id_estado, estado) VALUES
    (1, 'Abierto'),
    (2, 'Cerrado'),
    (3, 'Finalizado')
ON CONFLICT (id_estado) DO NOTHING;

ALTER TABLE IF EXISTS web.exposiciones
    ADD COLUMN IF NOT EXISTS id_estado smallint;

UPDATE web.exposiciones e
SET id_estado = 1
WHERE e.id_estado IS NULL;

ALTER TABLE IF EXISTS web.exposiciones
    ALTER COLUMN id_estado SET NOT NULL;

ALTER TABLE IF EXISTS web.exposiciones
    ALTER COLUMN id_estado SET DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_exposiciones_exposiciones_estados'
    ) THEN
        ALTER TABLE web.exposiciones
            ADD CONSTRAINT fk_exposiciones_exposiciones_estados
            FOREIGN KEY (id_estado)
            REFERENCES web.exposiciones_estados (id_estado)
            MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION
            NOT VALID;
    END IF;
END $$;

ALTER TABLE web.exposiciones
    VALIDATE CONSTRAINT fk_exposiciones_exposiciones_estados;
