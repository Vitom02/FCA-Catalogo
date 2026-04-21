-- Categorías fijas de usuario (no se crean desde la API).
-- 1 = administrador, 2 = usuario; baja = false.

INSERT INTO web.usuarios_categorias (id_categoria, categoria, baja)
VALUES
    (1, 'administrador', false),
    (2, 'usuario', false)
ON CONFLICT (id_categoria) DO NOTHING;
