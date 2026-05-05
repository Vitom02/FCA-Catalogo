-- Un nombre de usuario no debe repetirse entre cuentas activas (baja = false).
-- La clave no tiene restricción de unicidad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_usuario_activo_lower_trim
ON web.usuarios (LOWER(TRIM(usuario)))
WHERE baja = false;
