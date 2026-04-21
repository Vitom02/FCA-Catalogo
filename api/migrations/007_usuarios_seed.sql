-- Usuarios de ejemplo: club 1, categorías 1 = administrador, 2 = usuario.
-- Cambiá las claves en producción. Idempotente por nombre de usuario.

INSERT INTO web.usuarios (nombre, apellido, id_club, id_categoria, usuario, clave, baja)
SELECT 'Admin', 'Demo', 1, 1, 'admin_demo', '1234', false
WHERE NOT EXISTS (SELECT 1 FROM web.usuarios WHERE usuario = 'admin_demo');

INSERT INTO web.usuarios (nombre, apellido, id_club, id_categoria, usuario, clave, baja)
SELECT 'Usuario', 'Demo', 1, 2, 'usuario_demo', '1234', false
WHERE NOT EXISTS (SELECT 1 FROM web.usuarios WHERE usuario = 'usuario_demo');
