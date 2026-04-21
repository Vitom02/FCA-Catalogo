CREATE TABLE IF NOT EXISTS web.usuarios_categorias
(
    id_categoria integer NOT NULL,
    categoria character varying(30) COLLATE pg_catalog."default" NOT NULL,
    baja boolean NOT NULL DEFAULT false,
    CONSTRAINT usuarios_categorias_pkey PRIMARY KEY (id_categoria)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS web.usuarios_categorias
    OWNER to postgres;

CREATE TABLE IF NOT EXISTS web.usuarios
(
    id_usuario serial NOT NULL,
    nombre character varying(30) COLLATE pg_catalog."default" NOT NULL DEFAULT ''::character varying,
    apellido character varying(30) COLLATE pg_catalog."default" NOT NULL DEFAULT ''::character varying,
    id_club integer,
    id_categoria integer NOT NULL,
    usuario character varying(20) COLLATE pg_catalog."default" NOT NULL,
    clave character varying(255) COLLATE pg_catalog."default" NOT NULL,
    baja boolean NOT NULL DEFAULT false,
    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuarios_clubes FOREIGN KEY (id_club)
        REFERENCES web.clubes (id_club) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT fk_usuarios_usuarios_categorias FOREIGN KEY (id_categoria)
        REFERENCES web.usuarios_categorias (id_categoria) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS web.usuarios
    OWNER to postgres;